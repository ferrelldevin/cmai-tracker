// Loads one patient's data from local storage and scores it.
// `refresh()` re-reads after any change (log, undo, delete, import).
// Deleted logs are left out here, so no screen counts them. Scores come from the logs only.

import { useCallback, useEffect, useState } from "react";
import { appRatings, scoreAllWindows, summarize, unloggedDays, type Summary, type WindowScore } from "../scoring/engine";
import { db, isLive, type CheckIn, type Patient, type StoredObservation } from "../data/db";

export interface ScoredWindow {
  score: WindowScore;
  ratings: Record<number, number>; // the app's rating per item; nothing overrides it
  summary: Summary;
  unlogged: number; // ended days with no log and no "nothing to log" check-in
  elapsed: number; // days of the window that have ended
}

export function useCmaiData(patientId: string | null) {
  const [version, setVersion] = useState(0);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [observations, setObservations] = useState<StoredObservation[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [windows, setWindows] = useState<ScoredWindow[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined); // patient the data was read for
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ps = await db.patients.toArray();
        const p = ps.find((x) => x.id === patientId);
        const obs = p ? (await db.observations.where("patientId").equals(p.id).sortBy("at")).filter(isLive) : [];
        const checks = p ? await db.checkins.where("patientId").equals(p.id).toArray() : [];
        const now = Date.now();
        const activity = [...obs.map((o) => o.at), ...checks.map((c) => c.at)];
        const scored = p
          ? scoreAllWindows(obs, p.anchor, now).map((score) => {
              const ratings = appRatings(score);
              return { score, ratings, summary: summarize(ratings), ...unloggedDays(activity, score.windowStart, now) };
            })
          : [];
        if (!cancelled) {
          setPatients(ps.sort((a, b) => a.id.localeCompare(b.id)));
          setObservations(obs);
          setCheckins(checks);
          setWindows(scored);
          setLoadedFor(patientId);
          setError(null);
        }
      } catch (e) {
        // Private browsing in some browsers, or storage full or blocked.
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoadedFor(patientId);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, version]);

  // `loaded` is true only once the data on hand belongs to the patient asked for, so a
  // caller never mistakes the last patient's list for the new one's.
  return { patients, observations, checkins, windows, refresh, loaded: loadedFor === patientId, everLoaded: loadedFor !== undefined, error };
}
