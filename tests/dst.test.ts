// Day and period lines across daylight saving changes (spec section 7).
// Runs in New York time, where clocks fall back on Sun 2026-11-01 and spring forward on
// Sun 2027-03-14. Before calendar-day counting, every line after a change sat an hour off
// local midnight, so a log between 11 PM and midnight landed on the next day or period.
declare const process: { env: Record<string, string | undefined> }; // Node, without pulling in @types/node
process.env.TZ = "America/New_York";

import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { db } from "../src/data/db";
import { patientPosition } from "../src/data/patients";
import { loadDemoData } from "../src/data/seed";
import { addDays, clusteredDays, dayIndex, scoreAllWindows, scoreWindow, unloggedDays, WINDOW_DAYS } from "../src/scoring/engine";
import { fromClock } from "../src/ui/LogSheet";

const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();
const fallAnchor = at(2026, 10, 20); // period 1 runs Oct 20 to Nov 2, across the fall back
const springAnchor = at(2027, 3, 1); // period 1 runs Mar 1 to Mar 14, across the spring forward

describe("daylight saving", () => {
  it("runs in New York time", () => {
    // If this fails, the test runner did not pick up TZ and the rest proves nothing.
    expect(new Date(at(2026, 7, 1)).getTimezoneOffset()).toBe(240);
    expect(new Date(at(2026, 12, 1)).getTimezoneOffset()).toBe(300);
  });

  it("period lines stay at local midnight after a clock change", () => {
    expect(addDays(fallAnchor, WINDOW_DAYS)).toBe(at(2026, 11, 3));
    expect(addDays(springAnchor, WINDOW_DAYS)).toBe(at(2027, 3, 15));
    const windows = scoreAllWindows([], fallAnchor, at(2026, 12, 1));
    expect(windows.map((w) => new Date(w.windowStart).getHours())).toEqual([0, 0, 0, 0]); // Oct 20, Nov 3, Nov 17, Dec 1
    expect(windows[1].windowStart).toBe(at(2026, 11, 3));
    expect(windows[0].windowEnd).toBe(windows[1].windowStart);
  });

  it("a log at 11:30 PM on the last day counts in its own period", () => {
    for (const [anchor, last] of [[fallAnchor, at(2026, 11, 2, 23, 30)], [springAnchor, at(2027, 3, 14, 23, 30)]]) {
      const [first, second] = scoreAllWindows([{ itemId: 3, at: last }], anchor, addDays(anchor, 20));
      expect(first.items[2].count).toBe(1);
      expect(second.items[2].count).toBe(0);
    }
  });

  it("days are counted on the calendar", () => {
    expect(dayIndex(at(2026, 11, 1, 23, 30), fallAnchor)).toBe(12); // the 25-hour day
    expect(dayIndex(at(2026, 11, 2, 0, 10), fallAnchor)).toBe(13);
    expect(dayIndex(at(2027, 3, 14, 23, 59), springAnchor)).toBe(13); // the 23-hour day
    expect(dayIndex(at(2026, 10, 19, 23), fallAnchor)).toBe(-1);
  });

  it("clusters on either side of midnight after the fall back are two days", () => {
    const times = [at(2026, 11, 1, 23, 10), at(2026, 11, 1, 23, 20), at(2026, 11, 1, 23, 30), at(2026, 11, 2, 0, 10), at(2026, 11, 2, 0, 20), at(2026, 11, 2, 0, 30)];
    expect(clusteredDays(times, fallAnchor)).toBe(2);
    const score = scoreWindow(times.map((t) => ({ itemId: 13, at: t })), fallAnchor, at(2026, 12, 1));
    expect(score.items[12].clusteredDays).toBe(2);
  });

  it("a check-in at 11:30 PM covers its own day", () => {
    const activity = Array.from({ length: WINDOW_DAYS }, (_, d) => (d === 13 ? at(2026, 11, 2, 23, 30) : addDays(fallAnchor, d) + 12 * 3_600_000));
    expect(unloggedDays(activity, fallAnchor, at(2026, 11, 10))).toEqual({ unlogged: 0, elapsed: 14 });
  });

  it("the switcher shows the right period and day", () => {
    expect(patientPosition(fallAnchor, at(2026, 11, 2, 23, 30))).toEqual({ period: 1, day: 14 });
    expect(patientPosition(fallAnchor, at(2026, 11, 3, 0, 30))).toEqual({ period: 2, day: 1 });
    expect(patientPosition(springAnchor, at(2027, 3, 15, 0, 30))).toEqual({ period: 2, day: 1 });
  });

  it("a typed clock time from the day before keeps its time", () => {
    // Logged 12:30 AM on the day clocks fall back; 11 PM is the evening before.
    expect(fromClock("23:00", at(2026, 11, 1, 0, 30))).toBe(at(2026, 10, 31, 23, 0));
    expect(fromClock("23:00", at(2027, 3, 15, 0, 30))).toBe(at(2027, 3, 14, 23, 0));
  });

  it("demo data loaded after a clock change starts at midnight and keeps daytime hours", async () => {
    await loadDemoData(at(2026, 11, 20, 12));
    const patients = await db.patients.toArray();
    expect(patients.every((p) => new Date(p.anchor).getHours() === 0)).toBe(true);
    const hours = (await db.observations.toArray()).map((o) => new Date(o.at).getHours());
    expect(Math.min(...hours)).toBeGreaterThanOrEqual(7);
    expect(Math.max(...hours)).toBeLessThanOrEqual(22);
    const checkins = await db.checkins.toArray();
    expect(checkins.every((c) => new Date(c.day).getHours() === 0 && new Date(c.at).getHours() === 22)).toBe(true);
  });
});
