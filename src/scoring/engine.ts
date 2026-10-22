// CMAI scoring engine. Pure functions only: no storage, no UI, no clock.
// Every rule here is written out in docs/scoring-spec.md with manual page numbers.

import { ITEMS, type FactorGroup } from "./items";

// Rule 2 finds rating-7 clusters across midnight (spec section 3). The count bands
// are unchanged from rule 1.
export const RULE_VERSION = "cmai-count-rule-2";
export const DAY_MS = 24 * 60 * 60 * 1000;
export const WINDOW_DAYS = 14;
export const WINDOW_MS = WINDOW_DAYS * DAY_MS;
const HOUR_MS = 60 * 60 * 1000;

export interface Observation {
  itemId: number;
  at: number; // epoch ms
}

/** Manual p.5 labels for the 1-7 scale, plus the two special codes (p.2). */
export const RATING_LABELS: Record<number, string> = {
  1: "Never",
  2: "Less than once a week",
  3: "Once or twice a week",
  4: "Several times a week",
  5: "Once or twice a day",
  6: "Several times a day",
  7: "Several times an hour",
  8: "Would occur if not prevented",
  9: "Not applicable",
};

/** Count-to-rating table (spec section 2). count = logs in one 14-day window. */
export function ratingFromCount(count: number): number {
  if (count <= 0) return 1;
  if (count === 1) return 2;
  if (count <= 4) return 3;
  if (count <= 13) return 4;
  if (count <= 28) return 5;
  return 6;
}

/**
 * Number of window days that start a cluster of 3+ logs inside 60 minutes (spec section 3).
 * The 60-minute window slides over all of the item's logs, so a burst that crosses
 * midnight still counts. Each cluster is credited to the day of its first log, and a
 * day counts once however many clusters start on it.
 */
export function clusteredDays(times: number[], windowStart: number): number {
  const sorted = [...times].sort((a, b) => a - b);
  const days = new Set<number>();
  for (let i = 0; i + 2 < sorted.length; i++) {
    if (sorted[i + 2] - sorted[i] < HOUR_MS) days.add(Math.floor((sorted[i] - windowStart) / DAY_MS));
  }
  return days.size;
}

export interface ItemScore {
  itemId: number;
  count: number;
  clusteredDays: number;
  rating: number; // derived 1-7
}

export interface WindowScore {
  ruleVersion: string;
  windowStart: number;
  windowEnd: number; // exclusive
  provisional: boolean; // the window has not finished yet
  items: ItemScore[];
}

/**
 * Score one 14-day window. Logs outside [windowStart, windowStart + 14 days) are ignored.
 * `now` decides whether the window is still open (provisional).
 */
export function scoreWindow(observations: Observation[], windowStart: number, now: number): WindowScore {
  const windowEnd = windowStart + WINDOW_MS;
  const inWindow = observations.filter((o) => o.at >= windowStart && o.at < windowEnd);
  const items = ITEMS.map((item) => {
    const times = inWindow.filter((o) => o.itemId === item.id).map((o) => o.at);
    const cDays = clusteredDays(times, windowStart);
    // Rating 7 needs clusters on at least half the window's days (7 of 14).
    const rating = cDays >= WINDOW_DAYS / 2 ? 7 : ratingFromCount(times.length);
    return { itemId: item.id, count: times.length, clusteredDays: cDays, rating };
  });
  return { ruleVersion: RULE_VERSION, windowStart, windowEnd, provisional: now < windowEnd, items };
}

/** All windows from the anchor (patient's first day) up to and including the one containing `now`. */
export function scoreAllWindows(observations: Observation[], anchor: number, now: number): WindowScore[] {
  const windows: WindowScore[] = [];
  for (let start = anchor; start <= now; start += WINDOW_MS) {
    windows.push(scoreWindow(observations, start, now));
  }
  return windows;
}

// ---------- Day-14 review (spec section 5) ----------

/** What the caregiver chose for one item at review: a 1-7 rating, or code 8 / 9. */
export type ReviewChoice = number;

/** Final value per item: the caregiver's review choice if any, else the derived rating. */
export function finalRatings(score: WindowScore, review: Record<number, ReviewChoice> = {}): Record<number, number> {
  const out: Record<number, number> = {};
  for (const s of score.items) out[s.itemId] = review[s.itemId] ?? s.rating;
  return out;
}

/** Ratings that enter sums: 1-7 only. Codes 8 and 9 are reported apart (manual p.5). */
const isScale = (r: number) => r >= 1 && r <= 7;

export interface Summary {
  total: number; // sum of 1-7 ratings across items (secondary figure)
  itemsInTotal: number; // 29 minus items coded 8 or 9
  factors: Record<Exclude<FactorGroup, "other">, { sum: number; mean: number; n: number }>;
  agitated: Record<Exclude<FactorGroup, "other">, boolean>;
  agitatedAny: boolean;
  specialCodes: { itemId: number; code: number }[];
}

/** Manual p.5-6 criteria: does any threshold row hold? Each row is [rating, how many items]. */
function meets(ratings: number[], rows: [number, number][]): boolean {
  return rows.some(([min, n]) => ratings.filter((r) => r >= min).length >= n);
}

const CRITERIA: Record<Exclude<FactorGroup, "other">, [number, number][]> = {
  // Aggressive at least several times a week (p.5). The fourth listed row
  // (two at 2 and one at 3) is already covered by "three at 2 or more".
  aggressive: [[4, 1], [3, 2], [2, 3]],
  // Physically nonaggressive at least once a day (p.6).
  physical: [[5, 1], [4, 2], [3, 3], [2, 4]],
  // Verbally agitated at least once a day (p.6).
  verbal: [[5, 1], [4, 2], [3, 3], [2, 4]],
};

export function summarize(finals: Record<number, number>): Summary {
  const groups = ["aggressive", "physical", "verbal"] as const;
  const factors = {} as Summary["factors"];
  const agitated = {} as Summary["agitated"];
  for (const g of groups) {
    const ratings = ITEMS.filter((i) => i.group === g).map((i) => finals[i.id]).filter(isScale);
    const sum = ratings.reduce((a, b) => a + b, 0);
    factors[g] = { sum, n: ratings.length, mean: ratings.length ? sum / ratings.length : 0 };
    agitated[g] = meets(ratings, CRITERIA[g]);
  }
  const scale = ITEMS.map((i) => finals[i.id]).filter(isScale);
  return {
    total: scale.reduce((a, b) => a + b, 0),
    itemsInTotal: scale.length,
    factors,
    agitated,
    agitatedAny: groups.some((g) => agitated[g]),
    specialCodes: ITEMS.filter((i) => !isScale(finals[i.id])).map((i) => ({ itemId: i.id, code: finals[i.id] })),
  };
}
