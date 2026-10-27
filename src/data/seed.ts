// Demo data: two made-up patients, six weeks each, so charts show trends on first open.
// P-DEMO-A improves (as if a non-drug approach is working); P-DEMO-B gets worse.
// Behaviors cluster in the late afternoon for A, to show the time-of-day chart.

import { DAY_MS } from "../scoring/engine";
import { checkInKey, db, localMidnight, type CheckIn, type StoredObservation } from "./db";

// Small seeded random generator so the demo is the same every time.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

// [itemId, logs per day in week 1, logs per day in week 6, peak hour]
type Plan = [number, number, number, number][];
const PLANS: Record<string, Plan> = {
  "P-DEMO-A": [
    [13, 2.5, 0.3, 17], // screaming: twice a day -> rarely
    [1, 3, 1, 16], // pacing
    [6, 4, 1.5, 18], // repetitive questions
    [7, 0.6, 0.05, 17], // hitting
    [29, 2, 1, 15], // restlessness
    [18, 1, 0.5, 11], // complaining
  ],
  "P-DEMO-B": [
    [16, 0.3, 1.5, 21], // trying to get out
    [4, 0.4, 2, 19], // cursing
    [10, 0.1, 0.6, 19], // pushing
    [26, 1, 3, 14], // mannerisms
    [5, 1.5, 2.5, 10], // requests for attention
  ],
};

export async function loadDemoData(now = Date.now()) {
  const anchor = localMidnight(now) - 42 * DAY_MS;
  const rand = rng(42);
  const observations: StoredObservation[] = [];
  const checkins: CheckIn[] = [];
  for (const [patientId, plan] of Object.entries(PLANS)) {
    for (let day = 0; day < 42; day++) {
      const before = observations.length;
      const progress = day / 41;
      for (const [itemId, start, end, peak] of plan) {
        const perDay = start + (end - start) * progress;
        // whole part always happens, fractional part happens with that chance
        const n = Math.floor(perDay) + (rand() < perDay % 1 ? 1 : 0);
        for (let k = 0; k < n; k++) {
          const hour = Math.min(22, Math.max(7, peak + (rand() - 0.5) * 6));
          const at = anchor + day * DAY_MS + hour * 3_600_000;
          observations.push({ patientId, itemId, at, loggedAt: at + 60_000 });
        }
      }
      // A quiet day gets an end-of-shift check-in, as a careful caregiver would do.
      if (observations.length === before) {
        const dayStart = anchor + day * DAY_MS;
        checkins.push({ key: checkInKey(patientId, dayStart), patientId, day: dayStart, at: dayStart + 22 * 3_600_000 });
      }
    }
  }
  await db.transaction("rw", [db.patients, db.observations, db.reviews, db.checkins, db.changes], async () => {
    for (const id of Object.keys(PLANS)) {
      await db.observations.where("patientId").equals(id).delete();
      await db.changes.where("patientId").equals(id).delete();
      await db.reviews.where("patientId").equals(id).delete();
      await db.checkins.where("patientId").equals(id).delete();
      await db.patients.put({ id, anchor, demo: true });
    }
    await db.observations.bulkAdd(observations);
    await db.checkins.bulkPut(checkins);
  });
  return Object.keys(PLANS)[0];
}
