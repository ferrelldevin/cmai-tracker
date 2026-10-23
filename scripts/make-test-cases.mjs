// Writes docs/test-cases.json. The EXPECTED values below are written by hand from
// the rule table in docs/scoring-spec.md. They are never computed by the engine,
// so the tests check the engine against the spec, not against itself.
import { writeFileSync } from "node:fs";

const spread = (n, times = ["10:00"]) => {
  // n logs, one per time slot per day, starting day 0, so a person can count them.
  const logs = [];
  let left = n;
  for (let day = 0; left > 0; day++) {
    const today = times.slice(0, Math.min(times.length, left));
    logs.push({ day, times: today });
    left -= today.length;
  }
  return logs;
};
const everyDay = (days, times) => Array.from({ length: days }, (_, day) => ({ day, times }));
// 23:40 and 23:55 on each of `nights` days, then 00:15 the next day: one burst per night.
const acrossMidnight = (nights) =>
  Array.from({ length: nights + 1 }, (_, day) => ({
    day,
    times: [...(day > 0 ? ["00:15"] : []), ...(day < nights ? ["23:40", "23:55"] : [])],
  }));

const countCases = [
  ["count-0", "No logs at all", 0, 1],
  ["count-1", "One log in the window", 1, 2],
  ["count-2", "Two logs (once a week)", 2, 3],
  ["count-4", "Four logs (twice a week)", 4, 3],
  ["count-5", "Five logs (more than twice a week)", 5, 4],
  ["count-13", "Thirteen logs (just under once a day)", 13, 4],
  ["count-14", "Fourteen logs (once a day)", 14, 5],
  ["count-28", "Twenty-eight logs (twice a day)", 28, 5],
  ["count-29", "Twenty-nine logs (more than twice a day)", 29, 6],
].map(([id, description, n, expected]) => ({
  id, description, itemId: 13,
  logs: spread(n, n > 14 ? ["09:00", "15:00", "20:00"] : ["10:00"]),
  expectedCount: n, expectedRating: expected,
}));

const clusterCases = [
  {
    id: "cluster-7-days",
    description: "3 logs within one hour (10:00, 10:20, 10:40) on 7 different days. 7 of 14 days is half, so rating 7.",
    itemId: 6, logs: everyDay(7, ["10:00", "10:20", "10:40"]), expectedCount: 21, expectedRating: 7,
  },
  {
    id: "cluster-6-days",
    description: "Same pattern on only 6 days. Under half, so it falls back to the count table: 18 logs is rating 5.",
    itemId: 6, logs: everyDay(6, ["10:00", "10:20", "10:40"]), expectedCount: 18, expectedRating: 5,
  },
  {
    id: "spread-out-7-days",
    description: "3 logs a day on 7 days, but spread over 61 minutes (10:00, 10:30, 11:01). Not a cluster: 21 logs is rating 5.",
    itemId: 6, logs: everyDay(7, ["10:00", "10:30", "11:01"]), expectedCount: 21, expectedRating: 5,
  },
  {
    id: "cluster-across-midnight-7-nights",
    description: "3 logs within 35 minutes (23:40, 23:55, then 00:15 the next day) on 7 nights. Each burst crosses midnight and is credited to the day it starts (days 0-6): 7 clustered days, so rating 7.",
    itemId: 13, logs: acrossMidnight(7), expectedCount: 21, expectedRating: 7,
  },
  {
    id: "cluster-across-midnight-6-nights",
    description: "Same pattern on only 6 nights: 6 clustered days, under half. Falls back to the count table: 18 logs is rating 5.",
    itemId: 13, logs: acrossMidnight(6), expectedCount: 18, expectedRating: 5,
  },
  {
    id: "outside-window",
    description: "One log on day 0, one on day 14 (the first day of the NEXT window). Only day 0 counts: rating 2.",
    itemId: 7, logs: [{ day: 0, times: ["08:00"] }, { day: 14, times: ["08:00"] }], expectedCount: 1, expectedRating: 2,
  },
];

const summaryCases = [
  {
    id: "agitated-aggressive",
    description: "Hitting rated 4 (several times a week), everything else 1. One aggressive behavior at 4 meets the aggressive rule (manual p.5).",
    finals: { 7: 4 }, expected: { agitatedAggressive: true, agitatedPhysical: false, agitatedVerbal: false, total: 32, itemsInTotal: 29 },
  },
  {
    id: "not-agitated-verbal",
    description: "Screaming 4 and complaining 3, everything else 1. Verbal rule needs one at 5, two at 4, three at 3, or four at 2. Only one item is at 4, and only two are at 3 or more: not met.",
    finals: { 13: 4, 18: 3 }, expected: { agitatedAggressive: false, agitatedPhysical: false, agitatedVerbal: false, total: 34, itemsInTotal: 29 },
  },
  {
    id: "agitated-physical",
    description: "Pacing 2, restlessness 2, mannerisms 2, handling things 2. Four physical behaviors at 2 meets the physical rule (manual p.6).",
    finals: { 1: 2, 29: 2, 26: 2, 22: 2 }, expected: { agitatedAggressive: false, agitatedPhysical: true, agitatedVerbal: false, total: 33, itemsInTotal: 29 },
  },
  {
    id: "code-8-left-out",
    description: "Pacing coded 8 (would happen if not restrained), everything else 1. Code 8 is left out of the total: 28 items x 1 = 28.",
    finals: { 1: 8 }, expected: { agitatedAggressive: false, agitatedPhysical: false, agitatedVerbal: false, total: 28, itemsInTotal: 28 },
  },
];

const doc = {
  about: "Hand-scorable test cases for the CMAI count rule. Window starts day 0 at 00:00 (2026-01-05, UTC). Days run 0-13. Score each case from docs/scoring-spec.md without reading any code; your answer should match expectedRating.",
  ruleVersion: "cmai-count-rule-2",
  windowStart: "2026-01-05T00:00:00Z",
  ratingCases: [...countCases, ...clusterCases],
  summaryCases,
};
writeFileSync(new URL("../docs/test-cases.json", import.meta.url), JSON.stringify(doc, null, 2) + "\n");
console.log(`wrote ${doc.ratingCases.length} rating cases and ${summaryCases.length} summary cases`);
