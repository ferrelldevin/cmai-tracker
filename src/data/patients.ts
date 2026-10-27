// What the patient switcher shows for each patient: where they are in their 14-day
// periods and when they were last logged. Uses the same windows as the scoring engine.

import Dexie from "dexie";
import { dayIndex, WINDOW_DAYS } from "../scoring/engine";
import { db, type Patient } from "./db";

export interface Position { period: number; day: number }

/** Period (1-based) and day of that period (1 to 14) for a patient whose day 1 began at `anchor`. */
export function patientPosition(anchor: number, now: number): Position {
  // Calendar days, so the day and period stay right across clock changes.
  const days = Math.max(0, dayIndex(now, anchor));
  return { period: Math.floor(days / WINDOW_DAYS) + 1, day: (days % WINDOW_DAYS) + 1 };
}

export interface PatientSummary extends Patient, Position {
  lastLogged: number | null; // time of the latest log (by when it happened), or null for none
}

export async function patientSummaries(patients: Patient[], now: number): Promise<PatientSummary[]> {
  return Promise.all(
    patients.map(async (p) => {
      const last = await db.observations.where("[patientId+at]").between([p.id, Dexie.minKey], [p.id, Dexie.maxKey]).last();
      return { ...p, ...patientPosition(p.anchor, now), lastLogged: last?.at ?? null };
    }),
  );
}
