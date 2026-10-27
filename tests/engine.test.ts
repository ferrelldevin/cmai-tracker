import { describe, expect, it } from "vitest";
import cases from "../docs/test-cases.json";
import { appRatings, clusteredDays, DAY_MS, meaningfulChanges, ratingFromCount, scoreAllWindows, scoreWindow, summarize, unloggedDays, WINDOW_MS, type Observation } from "../src/scoring/engine";
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

  it("the app's rating comes from the logs alone and takes no override (D-14)", () => {
    const score = scoreWindow(toObservations(1, [{ day: 0, times: ["09:00"] }]), windowStart, afterWindow);
    const ratings = appRatings(score);
    expect(ratings[1]).toBe(2);
    expect(Object.keys(ratings)).toHaveLength(29);
    // A second argument (the old review override) is not part of the function any more.
    expect(appRatings.length).toBe(1);
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

describe("unlogged days (spec section 7)", () => {
  const at = (day: number, h = 12) => windowStart + day * DAY_MS + h * 3_600_000;

  it("a finished window with no logs and no check-ins is 14 unlogged days, not 14 zeros", () => {
    expect(unloggedDays([], windowStart, afterWindow)).toEqual({ unlogged: 14, elapsed: 14 });
  });

  it("a log or a check-in each mark a day as logged; several on one day count once", () => {
    const logs = [at(0, 9), at(0, 15), at(3)];
    const checkins = [at(1, 22), at(2, 22)];
    expect(unloggedDays([...logs, ...checkins], windowStart, afterWindow)).toEqual({ unlogged: 10, elapsed: 14 });
  });

  it("an open window counts only days that have ended, so today is never unlogged", () => {
    // Now is day 5 at 10:00: days 0-4 have ended.
    expect(unloggedDays([at(0), at(2)], windowStart, at(5, 10))).toEqual({ unlogged: 3, elapsed: 5 });
  });

  it("ignores activity outside the window", () => {
    expect(unloggedDays([at(-1), at(14)], windowStart, afterWindow).unlogged).toBe(14);
  });
});

describe("meaningful change between periods (spec section 6)", () => {
  it("a single 1-point move is not marked: it is inside rater agreement", () => {
    expect(meaningfulChanges([4, 3])).toEqual([null, null]);
    expect(meaningfulChanges([4, 5, 5])).toEqual([null, null, null]);
  });

  it("a move of 2 or more points is marked at once", () => {
    expect(meaningfulChanges([5, 3])).toEqual([null, "down"]);
    expect(meaningfulChanges([2, 6])).toEqual([null, "up"]);
  });

  it("1 point in the same direction across two consecutive periods is marked on the second", () => {
    expect(meaningfulChanges([5, 4, 3])).toEqual([null, null, "down"]);
    expect(meaningfulChanges([2, 3, 4, 5])).toEqual([null, null, "up", "up"]);
  });

  it("1 point down then 1 point up is noise, not a change", () => {
    expect(meaningfulChanges([4, 3, 4])).toEqual([null, null, null]);
  });

  it("the two 1-point moves must be in consecutive periods", () => {
    expect(meaningfulChanges([5, 4, 4, 3])).toEqual([null, null, null, null]);
  });

  it("never marks a move to or from code 8 or 9", () => {
    expect(meaningfulChanges([2, 8, 2])).toEqual([null, null, null]);
    expect(meaningfulChanges([9, 5, 4])).toEqual([null, null, null]);
  });
});
