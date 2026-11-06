// Made-up log history for the Report mockup: every log with a time, for this period and the
// one before, so the charts have something to show. No real participant data, ever.
// Fixed seed, so the screens look the same on every machine.

import { ITEMS, type FactorGroup } from "../scoring/items";
import { BEHAVIOR_SCORES, DAILY_TOTALS, PERIOD, TODAY_LOGS } from "./mock-data";
import { ratingFromCount } from "../scoring/engine";

export interface MockLog {
  itemId: number;
  day: number; // 0-13 inside its period
  minute: number; // minutes after midnight, 0-1439 (a day ends at midnight: R4, assumed)
  by: string; // caregiver initials
}

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// More logs late in the afternoon and early evening (the "sundowning" pattern often seen in
// dementia care), a smaller bump mid-morning, few at night. Weights per hour, 0-23.
const HOUR_WEIGHT = [1, 1, 1, 1, 1, 1, 2, 4, 5, 6, 6, 5, 4, 4, 5, 8, 10, 11, 10, 7, 5, 3, 2, 1];

function pickMinute(r: () => number): number {
  const total = HOUR_WEIGHT.reduce((a, b) => a + b, 0);
  let x = r() * total;
  let h = 0;
  while (x >= HOUR_WEIGHT[h]) x -= HOUR_WEIGHT[h++];
  return h * 60 + Math.floor(r() * 60);
}

const BY = ["CD", "JM", "AR"];

function deal(counts: Record<number, number>, perDay: number[], r: () => number): MockLog[] {
  const pool: number[] = [];
  for (const [id, n] of Object.entries(counts)) for (let i = 0; i < n; i++) pool.push(Number(id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const logs: MockLog[] = [];
  let k = 0;
  perDay.forEach((n, day) => {
    for (let i = 0; i < n && k < pool.length; i++) {
      logs.push({ itemId: pool[k++], day, minute: pickMinute(r), by: BY[Math.floor(r() * 3)] });
    }
  });
  // Pacing tends to follow repeated questions within half an hour, so the "logged together"
  // finding has something real to find in this made-up set.
  for (const l of logs) {
    if (l.itemId !== 1) continue;
    const rep = logs.find((o) => o.itemId === 6 && o.day === l.day);
    if (rep && r() < 0.7) l.minute = Math.min(1439, rep.minute + 5 + Math.floor(r() * 20));
  }
  return logs.sort((a, b) => a.day - b.day || a.minute - b.minute);
}

const r = rng(20261105);
const toMinute = (t: string) => {
  const [hm, ap] = t.split(" ");
  const [h, m] = hm.split(":").map(Number);
  return ((h % 12) + (ap === "PM" ? 12 : 0)) * 60 + m;
};

// This period: days before today are dealt; today is the Log screen's own five logs.
const nowCounts: Record<number, number> = {};
for (const b of BEHAVIOR_SCORES) if (b.count) nowCounts[b.id] = b.count;
for (const [id] of TODAY_LOGS) nowCounts[id] -= 1;
const today = PERIOD.day - 1;
export const LOGS_NOW: MockLog[] = [
  ...deal(nowCounts, DAILY_TOTALS.slice(0, today), r),
  ...TODAY_LOGS.map(([itemId, t], i) => ({ itemId, day: today, minute: toMinute(t), by: BY[i % 3] })),
].sort((a, b) => a.day - b.day || a.minute - b.minute);

// The period before: 14 full days.
const beforeCounts: Record<number, number> = { 1: 19, 6: 31, 13: 18, 7: 4, 29: 12, 18: 5, 4: 1 };
const beforeTotal = Object.values(beforeCounts).reduce((a, b) => a + b, 0);
const beforePerDay = Array.from(
  { length: 14 },
  (_, d) => Math.round(((d + 1) * beforeTotal) / 14) - Math.round((d * beforeTotal) / 14),
);
export const LOGS_BEFORE: MockLog[] = deal(beforeCounts, beforePerDay, r);

/* Derived figures ---------------------------------------------------------- */

export const BLOCKS = ["12–4a", "4–8a", "8–12p", "12–4p", "4–8p", "8–12a"];

/** Logs per day (index 0-13); days after today are null. */
export const PER_DAY: (number | null)[] = Array.from({ length: 14 }, (_, d) =>
  d <= today ? LOGS_NOW.filter((l) => l.day === d).length : null,
);

/** heat[block][day]: logs in each 4-hour block of each day. */
export const HEAT: number[][] = BLOCKS.map((_, b) =>
  Array.from({ length: 14 }, (_, d) => LOGS_NOW.filter((l) => l.day === d && Math.floor(l.minute / 240) === b).length),
);

export const BUSIEST_BLOCK = (() => {
  const sums = HEAT.map((row) => row.reduce((a, b) => a + b, 0));
  const i = sums.indexOf(Math.max(...sums));
  return { block: BLOCKS[i], share: Math.round((sums[i] / LOGS_NOW.length) * 100) };
})();

/** Average rating (1-7) of the items in each group, this period and last. */
export const GROUP_AVG: { group: FactorGroup; items: number; now: number; before: number }[] = (
  ["aggressive", "physical", "verbal", "other"] as FactorGroup[]
).map((g) => {
  const rows = BEHAVIOR_SCORES.filter((b) => b.group === g);
  const avg = (f: (b: (typeof rows)[number]) => number) => rows.reduce((s, b) => s + f(b), 0) / rows.length;
  return { group: g, items: rows.length, now: avg((b) => b.rating), before: avg((b) => b.before) };
});

/** Pairs of behaviors logged within 30 minutes of each other on the same day, most first. */
export const TOGETHER: { a: number; b: number; times: number }[] = (() => {
  const seen = new Map<string, number>();
  for (const x of LOGS_NOW)
    for (const y of LOGS_NOW) {
      if (x.itemId >= y.itemId || x.day !== y.day || Math.abs(x.minute - y.minute) > 30) continue;
      const k = `${x.itemId}-${y.itemId}`;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
  return [...seen.entries()]
    .map(([k, times]) => {
      const [a, b] = k.split("-").map(Number);
      return { a, b, times };
    })
    .sort((p, q) => q.times - p.times)
    .slice(0, 3);
})();

export const ITEM_NAME = Object.fromEntries(ITEMS.map((i) => [i.id, i.name]));
export const ratingFor = ratingFromCount;

/** Calendar date of day d of the current period (Period 3 starts Tue Oct 27, 2026). */
export function periodDate(d: number): Date {
  return new Date(2026, 9, 27 + d);
}
export const fmtTime = (m: number) => {
  const h = Math.floor(m / 60);
  return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/** A heavy day (32 logs by 4:30 PM, 12 behaviors) to check the Today view as logs pile up. */
export const BUSY_DAY: MockLog[] = (() => {
  const rb = rng(7);
  const ids = [
    6, 6, 6, 6, 6, 6, 1, 1, 1, 1, 1, 13, 13, 13, 13, 29, 29, 29, 18, 18, 18, 4, 4, 5, 5, 12, 12, 7, 9, 16, 16, 19,
  ];
  return ids
    .map((itemId) => {
      let minute = pickMinute(rb);
      while (minute > 16 * 60 + 30) minute = pickMinute(rb);
      return { itemId, day: PERIOD.day - 1, minute, by: BY[Math.floor(rb() * 3)] };
    })
    .sort((a, b) => a.minute - b.minute);
})();

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h % 24 < 12 ? "a" : "p"}`;

/**
 * Logs by time block and day, for any block size. The "most logs" line is only claimed
 * when there is enough to go on: at least 20 logs, and the busiest block holding at least
 * 1.5 times its even share.
 */
export function heatFor(hours: 2 | 3 | 4 | 6) {
  const n = 24 / hours;
  const labels = Array.from({ length: n }, (_, b) => `${hourLabel(b * hours)}–${hourLabel((b + 1) * hours)}`);
  const heat = labels.map((_, b) =>
    Array.from(
      { length: 14 },
      (_, d) => LOGS_NOW.filter((l) => l.day === d && Math.floor(l.minute / (hours * 60)) === b).length,
    ),
  );
  const sums = heat.map((row) => row.reduce((a, c) => a + c, 0));
  const top = sums.indexOf(Math.max(...sums));
  const share = sums[top] / LOGS_NOW.length;
  return {
    labels,
    heat,
    max: Math.max(...heat.flat()),
    busiest: { label: labels[top], pct: Math.round(share * 100) },
    claim: LOGS_NOW.length >= 20 && share >= 1.5 / n,
  };
}

/** Logs per hour for one day's logs (24 numbers). */
export const perHour = (logs: MockLog[]) =>
  Array.from({ length: 24 }, (_, h) => logs.filter((l) => Math.floor(l.minute / 60) === h).length);
