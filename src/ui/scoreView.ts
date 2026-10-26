import { ITEMS } from "../scoring/items";
import type { ScoredWindow } from "./useCmaiData";

/** Keep the overview scoped to one period, including reviewed or logged exceptions. */
export function periodBehaviors(window: ScoredWindow, showAll: boolean) {
  return ITEMS.filter((item) => showAll || window.finals[item.id] > 1 ||
    window.score.items[item.id - 1].count > 0 || item.id in window.review);
}

/** Stable period identity survives refreshes; an unavailable saved period falls back safely. */
export function selectedPeriod(windows: ScoredWindow[], start: number | null) {
  const saved = windows.findIndex((w) => w.score.windowStart === start);
  if (saved >= 0) return saved;
  const lastFinished = windows.map((w) => w.score.provisional).lastIndexOf(false);
  return Math.max(0, lastFinished);
}
