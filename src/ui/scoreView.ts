import { meaningfulChanges, type Change } from "../scoring/engine";
import { ITEMS } from "../scoring/items";
import type { ScoredWindow } from "./useCmaiData";

/** Keep the overview scoped to one period, including reviewed or logged exceptions. */
export function periodBehaviors(window: ScoredWindow, showAll: boolean) {
  return ITEMS.filter((item) => showAll || window.finals[item.id] > 1 ||
    window.score.items[item.id - 1].count > 0 || item.id in window.review);
}

/** The period from the URL (1-based) when it exists; otherwise the latest finished one, or the first. */
export function selectedPeriod(windows: ScoredWindow[], period?: number) {
  if (period && period >= 1 && period <= windows.length) return period - 1;
  const lastFinished = windows.map((w) => w.score.provisional).lastIndexOf(false);
  return Math.max(0, lastFinished);
}

/**
 * How one behavior moved since the period before, in words, using the engine's change rule
 * (2+ points, or 1 point the same way twice). A single 1-point move is within how much two
 * raters differ (manual p.7), so it reads "about the same". No comparison while in progress.
 */
export function changeSince(windows: ScoredWindow[], index: number, itemId: number): { text: string; change: Change } {
  const w = windows[index];
  const prev = index > 0 ? windows[index - 1].finals[itemId] : null;
  const now = w.finals[itemId];
  if (prev === null) return { text: "First period", change: null };
  if (!onScale(prev) || !onScale(now) || w.score.provisional) return { text: `Last period ${prev}`, change: null };
  // Finished periods always come first, so the index lines up with the finished series.
  const change = meaningfulChanges(windows.filter((x) => !x.score.provisional).map((x) => x.finals[itemId]))[index];
  if (change) return { text: `${change === "up" ? "Up" : "Down"} from ${prev}`, change };
  return { text: prev === now ? "Same as last period" : `About the same (was ${prev})`, change: null };
}

const onScale = (r: number) => r >= 1 && r <= 7;
