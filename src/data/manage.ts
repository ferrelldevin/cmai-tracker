// Patient and backup management: restore an export, delete a patient, clear demo data.
// Restoring merges into what is already on the phone. Nothing is overwritten except a
// day-14 review or check-in with the same key, where the backup's copy wins.

import { db, type CheckIn, type Patient, type Review, type StoredObservation } from "./db";

export interface RestoreResult {
  patients: number; // new patients added
  observations: number; // new logs added (exact duplicates are skipped)
  reviews: number;
  checkins: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const str = (v: unknown) => typeof v === "string" && v.length > 0;

/** Throws an Error with a message a caregiver can read when the file is not a CMAI Tracker backup. */
export function parseBackup(text: string) {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file is not a CMAI Tracker backup. Choose the .json file from Export.");
  }
  if (!isObj(data) || !Array.isArray(data.patients) || !Array.isArray(data.observations)) {
    throw new Error("This file is not a CMAI Tracker backup. Choose the .json file from Export.");
  }
  const patients = data.patients.filter((p): p is Patient => isObj(p) && str(p.id) && num(p.anchor));
  const observations = data.observations.filter(
    (o): o is StoredObservation => isObj(o) && str(o.patientId) && num(o.itemId) && (o.itemId as number) >= 1 && (o.itemId as number) <= 29 && num(o.at) && num(o.loggedAt),
  );
  const reviews = (Array.isArray(data.reviews) ? data.reviews : []).filter((r): r is Review => isObj(r) && str(r.key) && str(r.patientId) && num(r.choice));
  const checkins = (Array.isArray(data.checkins) ? data.checkins : []).filter((c): c is CheckIn => isObj(c) && str(c.key) && str(c.patientId) && num(c.day));
  return { patients, observations, reviews, checkins };
}

export async function restoreBackup(text: string): Promise<RestoreResult> {
  const b = parseBackup(text);
  const result: RestoreResult = { patients: 0, observations: 0, reviews: b.reviews.length, checkins: b.checkins.length };
  await db.transaction("rw", [db.patients, db.observations, db.reviews, db.checkins], async () => {
    for (const p of b.patients) {
      if (!(await db.patients.get(p.id))) {
        await db.patients.add({ id: p.id, anchor: p.anchor, ...(p.demo ? { demo: true } : {}) });
        result.patients++;
      }
    }
    const seen = new Set((await db.observations.toArray()).map((o) => `${o.patientId}|${o.itemId}|${o.at}|${o.loggedAt}`));
    for (const o of b.observations) {
      const k = `${o.patientId}|${o.itemId}|${o.at}|${o.loggedAt}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const { id: _drop, ...rest } = o;
      await db.observations.add(rest);
      result.observations++;
    }
    await db.reviews.bulkPut(b.reviews);
    await db.checkins.bulkPut(b.checkins);
  });
  return result;
}

export async function deletePatient(id: string) {
  await db.transaction("rw", [db.patients, db.observations, db.reviews, db.checkins], async () => {
    await db.observations.where("patientId").equals(id).delete();
    await db.reviews.where("patientId").equals(id).delete();
    await db.checkins.where("patientId").equals(id).delete();
    await db.patients.delete(id);
  });
}

/** Removes every patient made by "Load demo data". Returns how many were removed. */
export async function removeDemoData() {
  const demo = (await db.patients.toArray()).filter((p) => p.demo);
  for (const p of demo) await deletePatient(p.id);
  return demo.length;
}
