// What the Scores screen shows for one 14-day period: every behavior with its change from
// the period before, the ones that drove the period ranked first, and how much data the
// numbers rest on. Pure, so it is unit-tested. Design note: docs/design/notes/006-scores-by-period.md.

import { meaningfulChanges, WINDOW_MS, type Change } from "../scoring/engine";
import { ITEMS, type CmaiItem } from "../scoring/items";
import type { ScoredWindow } from "./useCmaiData";

export interface BehaviorRow {
  item: CmaiItem;
  rating: number; // final: review choice if any, else derived (1-7, or code 8 / 9)
  count: number; // logs in this period
  derived: number; // what the count rule gave, before any review
  reviewed: boolean; // set or confirmed at the day-14 review
  prev: number | null; // final rating in the period before, if there is one
  change: Change; // meaningful change (engine rule); null for a period still in progress
}

export interface PeriodView {
  index: number; // 0-based
  window: ScoredWindow;
  prev: ScoredWindow | null;
  rows: BehaviorRow[]; // all 29, in form order
  seen: BehaviorRow[]; // rated 2 to 7 this period, most frequent first
  stopped: BehaviorRow[]; // rated 2+ last period, 1 (never) this period
  codes: BehaviorRow[]; // coded 8 or 9 at review
  quietDays: number; // "nothing to log today" check-ins in this period
  reviewed: number; // behaviors checked at the day-14 review
}

const onScale = (r: number) => r >= 1 && r <= 7;

/** The period Scores opens on: the latest finished one, or the first while none has finished. */
export function defaultPeriod(windows: ScoredWindow[]): number {
  const finished = windows.filter((w) => !w.score.provisional).length;
  return Math.max(0, finished - 1);
}

/** A 1-based period from the URL, turned into an index that exists (else the default). */
export function periodIndex(windows: ScoredWindow[], period?: number): number {
  if (period && period >= 1 && period <= windows.length) return period - 1;
  return defaultPeriod(windows);
}

export function periodView(windows: ScoredWindow[], index: number, checkinTimes: number[]): PeriodView {
  const window = windows[index];
  const prev = index > 0 ? windows[index - 1] : null;
  // Change marks compare finished periods only; they always come first in the list.
  const finished = windows.filter((w) => !w.score.provisional);
  const rows = ITEMS.map((item): BehaviorRow => {
    const changes = window.score.provisional ? [] : meaningfulChanges(finished.map((w) => w.finals[item.id]));
    return {
      item,
      rating: window.finals[item.id],
      count: window.score.items[item.id - 1].count,
      derived: window.score.items[item.id - 1].rating,
      reviewed: item.id in window.review,
      prev: prev ? prev.finals[item.id] : null,
      change: changes[index] ?? null,
    };
  });
  const seen = rows
    .filter((r) => onScale(r.rating) && r.rating > 1)
    .sort((a, b) => b.rating - a.rating || rank(b.change) - rank(a.change) || b.count - a.count || a.item.id - b.item.id);
  const { windowStart } = window.score;
  return {
    index,
    window,
    prev,
    rows,
    seen,
    stopped: rows.filter((r) => r.rating === 1 && r.prev !== null && onScale(r.prev) && r.prev > 1),
    codes: rows.filter((r) => !onScale(r.rating)),
    quietDays: checkinTimes.filter((t) => t >= windowStart && t < windowStart + WINDOW_MS).length,
    reviewed: Object.keys(window.review).length,
  };
}

// Within the same rating, a behavior getting worse is listed before one getting better.
const rank = (c: Change) => (c === "up" ? 2 : c === "down" ? 0 : 1);

/** Plain words for a behavior's change, for the row and for screen readers. */
export function changeText(row: BehaviorRow, provisional: boolean): string {
  if (row.prev === null) return "first period";
  if (!onScale(row.prev) || !onScale(row.rating)) return `last period ${row.prev}`;
  if (provisional) return `last period ${row.prev}`;
  if (row.change === "up") return `up from ${row.prev}`;
  if (row.change === "down") return `down from ${row.prev}`;
  return row.prev === row.rating ? "same as last period" : `about the same (was ${row.prev})`;
}
