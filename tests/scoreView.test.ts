import { describe, expect, it } from "vitest";
import { finalRatings, scoreWindow, summarize, unloggedDays, DAY_MS, WINDOW_MS } from "../src/scoring/engine";
import { periodBehaviors, selectedPeriod } from "../src/ui/scoreView";
import type { ScoredWindow } from "../src/ui/useCmaiData";

const start = Date.UTC(2026, 0, 1);
function fixture(index: number, review: Record<number, number> = {}): ScoredWindow {
  const windowStart = start + index * WINDOW_MS;
  const logs = [{ itemId: index === 0 ? 7 : 8, at: windowStart + 1 }];
  const now = start + 2 * WINDOW_MS + DAY_MS;
  const score = scoreWindow(logs, windowStart, now);
  const finals = finalRatings(score, review);
  return { score, finals, review, summary: summarize(finals), ...unloggedDays(logs.map((l) => l.at), windowStart, now) };
}

describe("period-specific score view", () => {
  it("never includes a behavior solely because it occurred in another period", () => {
    expect(periodBehaviors(fixture(0), false).map((i) => i.id)).toEqual([7]);
    expect(periodBehaviors(fixture(1), false).map((i) => i.id)).toEqual([8]);
  });
  it("keeps logged behaviors visible when reviewed down to 1, and keeps special codes", () => {
    const w = fixture(0, { 7: 1, 8: 8, 9: 9 });
    expect(periodBehaviors(w, false).map((i) => i.id)).toEqual([7, 8, 9]);
    expect(w.summary.total).toBe(27);
    expect(w.summary.itemsInTotal).toBe(27);
    expect(w.score.items[6].count).toBe(1);
    expect(periodBehaviors(w, true)).toHaveLength(29);
  });
  it("uses a stable saved start, defaults to latest finished, and handles one open period", () => {
    const windows = [fixture(0), fixture(1), fixture(2)];
    expect(selectedPeriod(windows, null)).toBe(1);
    expect(selectedPeriod(windows, start)).toBe(0);
    expect(selectedPeriod(windows, -1)).toBe(1);
    expect(selectedPeriod([fixture(2)], null)).toBe(0);
    expect(selectedPeriod([], null)).toBe(0);
  });
});
