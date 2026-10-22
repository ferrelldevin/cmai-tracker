import { describe, expect, it } from "vitest";
import cases from "../docs/test-cases.json";
import { clusteredDays, DAY_MS, finalRatings, ratingFromCount, scoreAllWindows, scoreWindow, summarize, WINDOW_MS, type Observation } from "../src/scoring/engine";
import { ITEMS } from "../src/scoring/items";

const windowStart = Date.parse(cases.windowStart);
const toObservations = (itemId: number, logs: { day: number; times: string[] }[]): Observation[] =>
  logs.flatMap(({ day, times }) =>
    times.map((hhmm) => {
      const [h, m] = hhmm.split(":").map(Number);
      return { itemId, at: windowStart + day * DAY_MS + (h * 60 + m) * 60_000 };
    }),
  );
const afterWindow = windowStart + WINDOW_MS + 1;

describe("hand-scored rating cases (docs/test-cases.json)", () => {
  for (const c of cases.ratingCases) {
    it(`${c.id}: ${c.description}`, () => {
      const score = scoreWindow(toObservations(c.itemId, c.logs), windowStart, afterWindow);
      const item = score.items.find((s) => s.itemId === c.itemId)!;
      expect(item.count).toBe(c.expectedCount);
      expect(item.rating).toBe(c.expectedRating);
    });
  }
});

describe("hand-scored summary cases (docs/test-cases.json)", () => {
  for (const c of cases.summaryCases) {
    it(`${c.id}: ${c.description}`, () => {
      const finals: Record<number, number> = {};
      for (const i of ITEMS) finals[i.id] = 1;
      Object.assign(finals, Object.fromEntries(Object.entries(c.finals).map(([k, v]) => [Number(k), v])));
      const s = summarize(finals);
      expect(s.agitated.aggressive).toBe(c.expected.agitatedAggressive);
      expect(s.agitated.physical).toBe(c.expected.agitatedPhysical);
      expect(s.agitated.verbal).toBe(c.expected.agitatedVerbal);
      expect(s.total).toBe(c.expected.total);
      expect(s.itemsInTotal).toBe(c.expected.itemsInTotal);
    });
  }
});

describe("engine behavior", () => {
  it("rating never goes down as the count goes up", () => {
    for (let n = 0; n < 60; n++) expect(ratingFromCount(n + 1)).toBeGreaterThanOrEqual(ratingFromCount(n));
  });

  it("a window that has not ended is provisional", () => {
    const score = scoreWindow([], windowStart, windowStart + 3 * DAY_MS);
    expect(score.provisional).toBe(true);
    expect(scoreWindow([], windowStart, afterWindow).provisional).toBe(false);
  });

  it("splits six weeks of logs into three windows, plus the open one", () => {
    const obs = [0, 15, 30].map((d) => ({ itemId: 4, at: windowStart + d * DAY_MS }));
    const windows = scoreAllWindows(obs, windowStart, windowStart + 42 * DAY_MS);
    expect(windows).toHaveLength(4);
    expect(windows.map((w) => w.items.find((i) => i.itemId === 4)!.count)).toEqual([1, 1, 1, 0]);
    expect(windows[3].provisional).toBe(true);
  });

  it("a caregiver's review overrides the derived rating", () => {
    const score = scoreWindow(toObservations(1, [{ day: 0, times: ["09:00"] }]), windowStart, afterWindow);
    expect(finalRatings(score)[1]).toBe(2);
    expect(finalRatings(score, { 1: 9 })[1]).toBe(9);
  });

  it("a cluster that crosses midnight counts once, on the day it starts", () => {
    const at = (day: number, hhmm: string) => toObservations(13, [{ day, times: [hhmm] }])[0].at;
    expect(clusteredDays([at(3, "23:50"), at(4, "00:05"), at(4, "00:20")], windowStart)).toBe(1);
    // Add a second burst wholly inside day 4. If the midnight burst were credited
    // to day 4, both would land on one day and the answer would be 1.
    const day4 = toObservations(13, [{ day: 4, times: ["15:00", "15:10", "15:20"] }]).map((o) => o.at);
    expect(clusteredDays([at(3, "23:50"), at(4, "00:05"), at(4, "00:20"), ...day4], windowStart)).toBe(2);
  });

  it("finds a midnight cluster whatever order the logs arrive in", () => {
    const night = toObservations(13, [{ day: 5, times: ["23:40", "23:55"] }, { day: 6, times: ["00:15"] }]).map((o) => o.at);
    expect(clusteredDays([night[2], night[0], night[1]], windowStart)).toBe(1);
  });

  it("logs 60+ minutes apart across midnight are not a cluster", () => {
    const night = toObservations(13, [{ day: 5, times: ["23:30"] }, { day: 6, times: ["00:00", "00:30"] }]).map((o) => o.at);
    expect(clusteredDays(night, windowStart)).toBe(0);
  });

  it("lists every item on the long form exactly once", () => {
    expect(ITEMS.map((i) => i.id)).toEqual(Array.from({ length: 29 }, (_, i) => i + 1));
  });
});
