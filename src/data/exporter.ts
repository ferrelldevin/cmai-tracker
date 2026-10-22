// Export for the research team: JSON (everything) and two CSVs.
// observations.csv: one row per logged behavior.
// scores.csv: one row per patient, window, and behavior.
// JSON also holds the "nothing to log today" check-ins; scores.csv has unlogged_days per window.

import { finalRatings, RULE_VERSION, scoreAllWindows, unloggedDays } from "../scoring/engine";
import { ITEMS } from "../scoring/items";
import { db, reviewKey } from "./db";

const csv = (rows: (string | number | boolean)[][]) =>
  rows.map((r) => r.map((v) => (typeof v === "string" && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : String(v))).join(",")).join("\n");

export async function buildExport(now = Date.now()) {
  const patients = await db.patients.toArray();
  const observations = await db.observations.toArray();
  const reviews = await db.reviews.toArray();
  const checkins = await db.checkins.toArray();
  const reviewMap = new Map(reviews.map((r) => [r.key, r.choice]));

  const obsRows: (string | number | boolean)[][] = [["patient_id", "item_id", "item_name", "occurred_at", "time_approximate", "what_happened_before", "logged_at"]];
  for (const o of observations) {
    obsRows.push([o.patientId, o.itemId, ITEMS[o.itemId - 1].name, new Date(o.at).toISOString(), !!o.approx, o.before ?? "", new Date(o.loggedAt).toISOString()]);
  }

  const scoreRows: (string | number | boolean)[][] = [["patient_id", "window_start", "window_end", "provisional", "item_id", "item_name", "count", "derived_rating", "final_rating", "reviewed", "unlogged_days", "rule_version"]];
  for (const p of patients) {
    const mine = observations.filter((o) => o.patientId === p.id);
    const activity = [...mine.map((o) => o.at), ...checkins.filter((c) => c.patientId === p.id).map((c) => c.at)];
    for (const w of scoreAllWindows(mine, p.anchor, now)) {
      const { unlogged } = unloggedDays(activity, w.windowStart, now);
      const review: Record<number, number> = {};
      for (const i of ITEMS) {
        const c = reviewMap.get(reviewKey(p.id, w.windowStart, i.id));
        if (c !== undefined) review[i.id] = c;
      }
      const finals = finalRatings(w, review);
      for (const s of w.items) {
        scoreRows.push([p.id, new Date(w.windowStart).toISOString(), new Date(w.windowEnd).toISOString(), w.provisional, s.itemId, ITEMS[s.itemId - 1].name, s.count, s.rating, finals[s.itemId], s.itemId in review, unlogged, RULE_VERSION]);
      }
    }
  }
  return {
    json: JSON.stringify({ exportedAt: new Date(now).toISOString(), ruleVersion: RULE_VERSION, patients, observations, reviews, checkins }, null, 2),
    observationsCsv: csv(obsRows),
    scoresCsv: csv(scoreRows),
  };
}

export function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
