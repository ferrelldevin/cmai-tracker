import { describe, expect, it } from "vitest";
import { finalRatings, scoreWindow, summarize, unloggedDays, DAY_MS, WINDOW_MS } from "../src/scoring/engine";
import { changeSince, periodBehaviors, selectedPeriod } from "../src/ui/scoreView";
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
  it("takes the period from the URL, defaults to latest finished, and handles one open period", () => {
    const windows = [fixture(0), fixture(1), fixture(2)];
    expect(selectedPeriod(windows)).toBe(1);
    expect(selectedPeriod(windows, 1)).toBe(0);
    expect(selectedPeriod(windows, 3)).toBe(2);
    expect(selectedPeriod(windows, 9)).toBe(1);
    expect(selectedPeriod([fixture(2)])).toBe(0);
    expect(selectedPeriod([])).toBe(0);
  });
});

// Change since last period, in words, with the engine's rule (2+ points, or 1 point the same way twice).
function withRatings(ratings: number[], openLast = false): ScoredWindow[] {
  return ratings.map((r, i) => {
    const windowStart = start + i * WINDOW_MS;
    const now = openLast && i === ratings.length - 1 ? windowStart + DAY_MS : start + ratings.length * WINDOW_MS + DAY_MS;
    const score = scoreWindow([], windowStart, now);
    const finals = finalRatings(score, { 1: r });
    return { score, finals, review: { 1: r }, summary: summarize(finals), ...unloggedDays([], windowStart, now) };
  });
}

describe("change since last period", () => {
  it("says first period when there is none before", () => {
    expect(changeSince(withRatings([4]), 0, 1)).toEqual({ text: "First period", change: null });
  });
  it("marks 2 points, and words a single 1-point move as about the same", () => {
    expect(changeSince(withRatings([5, 3]), 1, 1)).toEqual({ text: "Down from 5", change: "down" });
    expect(changeSince(withRatings([3, 4]), 1, 1)).toEqual({ text: "About the same (was 3)", change: null });
    expect(changeSince(withRatings([4, 4]), 1, 1)).toEqual({ text: "Same as last period", change: null });
  });
  it("marks 1 point the same way two periods running", () => {
    expect(changeSince(withRatings([3, 4, 5]), 2, 1)).toEqual({ text: "Up from 4", change: "up" });
  });
  it("does not compare a period still in progress, or codes 8 and 9", () => {
    expect(changeSince(withRatings([2, 6], true), 1, 1)).toEqual({ text: "Last period 2", change: null });
    expect(changeSince(withRatings([9, 4]), 1, 1)).toEqual({ text: "Last period 9", change: null });
  });
});
