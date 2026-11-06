// Made-up data for the design mockup. No real participant data, ever (project rule).
// Ratings come from the app's own count-to-rating rule (src/scoring/engine.ts), so the
// numbers on the mock Score and Report screens follow the real spec.

import { ratingFromCount } from "../scoring/engine";
export { RATING_LABELS } from "../scoring/engine";
import { ITEMS, type FactorGroup } from "../scoring/items";

export const DEMO_CAREGIVER = { name: "Caregiver Demo", role: "Night shift" };
// code is how the real app names a resident (no names are stored); short goes in the badge.
export const DEMO_PATIENTS = [
  { id: "P-DEMO-A", label: "Demo resident A", code: "P-03", short: "03", room: "Room 12" },
  { id: "P-DEMO-B", label: "Demo resident B", code: "P-07", short: "07", room: "Room 14" },
  { id: "P-DEMO-C", label: "Demo resident C", code: "P-11", short: "11", room: "Room 15" },
  { id: "P-DEMO-D", label: "Demo resident D", code: "P-14", short: "14", room: "Room 18" },
  { id: "P-DEMO-E", label: "Demo resident E", code: "P-20", short: "20", room: "Room 21" },
];

// Tile labels for the compact log grid: short names in our own words.
// The full item name and definition stay one tap away (manual p.12-13).
export const SHORT: Record<number, string> = {
  1: "Pacing",
  2: "Disrobing",
  3: "Spitting",
  4: "Cursing",
  5: "Asking for help",
  6: "Repeating",
  7: "Hitting",
  8: "Kicking",
  9: "Grabbing",
  10: "Pushing",
  11: "Throwing",
  12: "Strange noises",
  13: "Screaming",
  14: "Biting",
  15: "Scratching",
  16: "Trying to leave",
  17: "Falling on purpose",
  18: "Complaining",
  19: "Negativism",
  20: "Eating non-food",
  21: "Hurting self/other",
  22: "Handling things",
  23: "Hiding things",
  24: "Hoarding",
  25: "Destroying",
  26: "Mannerisms",
  27: "Verbal sexual",
  28: "Physical sexual",
  29: "Restlessness",
};

export const GROUP_ORDER: FactorGroup[] = ["aggressive", "physical", "verbal", "other"];

// Logs per item in the current period (day 9 of 14) and in the period before.
const PERIOD_COUNTS: Record<number, [now: number, before: number]> = {
  1: [11, 19],
  6: [16, 31],
  13: [6, 18],
  7: [1, 4],
  29: [9, 12],
  18: [4, 5],
  4: [2, 1],
  16: [1, 0],
};
// Logs per day so far in this period, oldest first (9 days logged).
export const DAILY_TOTALS = [9, 7, 8, 6, 5, 6, 3, 1, 5];
export const PERIOD = { number: 3, day: 9, start: "Oct 27", end: "Nov 9" };

// Today's logs: [itemId, time of day].
export const TODAY_LOGS: [number, string][] = [
  [6, "4:10 PM"],
  [1, "3:45 PM"],
  [6, "11:20 AM"],
  [29, "10:05 AM"],
  [18, "8:30 AM"],
];

export interface BehaviorScore {
  id: number;
  name: string;
  short: string;
  group: FactorGroup;
  count: number;
  rating: number;
  before: number; // rating in the period before
}

export const BEHAVIOR_SCORES: BehaviorScore[] = ITEMS.map((item) => {
  const [now, before] = PERIOD_COUNTS[item.id] ?? [0, 0];
  return {
    id: item.id,
    name: item.name,
    short: SHORT[item.id],
    group: item.group,
    count: now,
    rating: ratingFromCount(now),
    before: ratingFromCount(before),
  };
});

// The total is the sum of the 29 ratings (29 to 203), shown as a secondary figure (D-08).
export const TOTAL_NOW = BEHAVIOR_SCORES.reduce((s, b) => s + b.rating, 0);
export const TOTAL_BEFORE = BEHAVIOR_SCORES.reduce((s, b) => s + b.before, 0);
