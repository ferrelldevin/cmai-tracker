// Loads one patient's data from local storage and scores it.
// `refresh()` re-reads after any change (log, undo, review, import).

import { useCallback, useEffect, useState } from "react";
import { finalRatings, scoreAllWindows, summarize, type Summary, type WindowScore } from "../scoring/engine";
import { ITEMS } from "../scoring/items";
import { db, reviewKey, type Patient, type StoredObservation } from "../data/db";

export interface ScoredWindow {
  score: WindowScore;
  review: Record<number, number>; // caregiver choices for this window
  finals: Record<number, number>;
  summary: Summary;
}

export function useCmaiData(patientId: string | null) {
  const [version, setVersion] = useState(0);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [observations, setObservations] = useState<StoredObservation[]>([]);
  const [windows, setWindows] = useState<ScoredWindow[]>([]);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ps = await db.patients.toArray();
      const p = ps.find((x) => x.id === patientId);
      const obs = p ? await db.observations.where("patientId").equals(p.id).sortBy("at") : [];
      const reviews = p ? await db.reviews.where("patientId").equals(p.id).toArray() : [];
      const byKey = new Map(reviews.map((r) => [r.key, r.choice]));
      const now = Date.now();
      const scored = p
        ? scoreAllWindows(obs, p.anchor, now).map((score) => {
            const review: Record<number, number> = {};
            for (const i of ITEMS) {
              const c = byKey.get(reviewKey(p.id, score.windowStart, i.id));
              if (c !== undefined) review[i.id] = c;
            }
            const finals = finalRatings(score, review);
            return { score, review, finals, summary: summarize(finals) };
          })
        : [];
      if (!cancelled) {
        setPatients(ps.sort((a, b) => a.id.localeCompare(b.id)));
        setObservations(obs);
        setWindows(scored);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, version]);

  return { patients, observations, windows, refresh };
}
