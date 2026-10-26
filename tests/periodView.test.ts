// What one period on Scores shows: default period, rows ranked, change words, coverage.
import { describe, expect, it } from "vitest";
import { DAY_MS, finalRatings, scoreAllWindows, summarize, unloggedDays, WINDOW_MS, type Observation } from "../src/scoring/engine";
import { changeText, defaultPeriod, periodIndex, periodView } from "../src/ui/periodView";
import type { ScoredWindow } from "../src/ui/useCmaiData";

const anchor = Date.UTC(2026, 0, 5);
const logs = (itemId: number, period: number, n: number): Observation[] =>
  Array.from({ length: n }, (_, k) => ({ itemId, at: anchor + period * WINDOW_MS + (k % 14) * DAY_MS + 9 * 3_600_000 + k * 60_000 }));

function build(obs: Observation[], now: number, reviews: Record<number, number>[] = []): ScoredWindow[] {
  return scoreAllWindows(obs, anchor, now).map((score, i) => {
    const review = reviews[i] ?? {};
    const finals = finalRatings(score, review);
    return { score, review, finals, summary: summarize(finals), ...unloggedDays(obs.map((o) => o.at), score.windowStart, now) };
  });
}

// Pacing (#1): 20, 20, 2 logs -> ratings 5, 5, 3. Spitting (#3): 1, 0, 0 -> 2, 1, 1. Screaming (#13): 2, 6, 15 -> 3, 4, 5.
const obs = [...logs(1, 0, 20), ...logs(1, 1, 20), ...logs(1, 2, 2), ...logs(3, 0, 1), ...logs(13, 0, 2), ...logs(13, 1, 6), ...logs(13, 2, 15)];
const inP4 = anchor + 3 * WINDOW_MS + DAY_MS; // period 4 is in progress
const windows = build(obs, inP4, [{}, {}, { 13: 5 }]);

describe("which period Scores opens on", () => {
  it("defaults to the latest finished period, not the one in progress", () => {
    expect(windows).toHaveLength(4);
    expect(defaultPeriod(windows)).toBe(2);
  });
  it("uses period 1 while nothing has finished", () => {
    expect(defaultPeriod(build(obs, anchor + DAY_MS))).toBe(0);
  });
  it("takes a 1-based period from the URL, and ignores one that does not exist", () => {
    expect(periodIndex(windows, 1)).toBe(0);
    expect(periodIndex(windows, 4)).toBe(3);
    expect(periodIndex(windows, 9)).toBe(2);
    expect(periodIndex(windows, undefined)).toBe(2);
  });
});

describe("one period", () => {
  const v = periodView(windows, 2, []);
  it("ranks behaviors seen by rating, most frequent first", () => {
    expect(v.seen.map((r) => [r.item.id, r.rating])).toEqual([[13, 5], [1, 3]]);
  });
  it("marks change with the engine rule, and words a 1-point move as about the same", () => {
    const pacing = v.rows[0], screaming = v.rows[12];
    expect(pacing.change).toBe("down"); // 5 -> 3, two points
    expect(changeText(pacing, false)).toBe("down from 5");
    expect(screaming.change).toBe("up"); // 3 -> 4 -> 5, one point twice the same way
    expect(screaming.reviewed).toBe(true);
    const p2 = periodView(windows, 1, []);
    expect(p2.rows[12].change).toBeNull(); // 3 -> 4 once
    expect(changeText(p2.rows[12], false)).toBe("about the same (was 3)");
    expect(changeText(p2.rows[0], false)).toBe("same as last period");
  });
  it("lists a behavior that stopped", () => {
    expect(periodView(windows, 1, []).stopped.map((r) => r.item.id)).toEqual([3]);
  });
  it("does not mark change in a period still in progress", () => {
    const p4 = periodView(windows, 3, []);
    expect(p4.rows.every((r) => r.change === null)).toBe(true);
    expect(changeText(p4.rows[0], true)).toBe("last period 3");
  });
  it("says first period when there is none before", () => {
    expect(changeText(periodView(windows, 0, []).rows[0], false)).toBe("first period");
  });
  it("counts quiet-day check-ins inside the period only, and reviewed behaviors", () => {
    const days = [anchor + 2 * WINDOW_MS, anchor + 2 * WINDOW_MS + 5 * DAY_MS, anchor + WINDOW_MS];
    const p3 = periodView(windows, 2, days);
    expect(p3.quietDays).toBe(2);
    expect(p3.reviewed).toBe(1);
  });
  it("keeps codes 8 and 9 apart", () => {
    const coded = build(obs, inP4, [{ 1: 9 }]);
    const p1 = periodView(coded, 0, []);
    expect(p1.codes.map((r) => r.item.id)).toEqual([1]);
    expect(p1.seen.some((r) => r.item.id === 1)).toBe(false);
  });
});
