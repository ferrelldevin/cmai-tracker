// The patient switcher's per-patient details.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../src/data/db";
import { patientPosition, patientSummaries } from "../src/data/patients";
import { DAY_MS, WINDOW_MS } from "../src/scoring/engine";

describe("patientPosition", () => {
  it("day 1 of period 1 on the first day", () => {
    expect(patientPosition(0, 0)).toEqual({ period: 1, day: 1 });
    expect(patientPosition(0, DAY_MS - 1)).toEqual({ period: 1, day: 1 });
  });

  it("day 14 is the last day, then period 2 starts", () => {
    expect(patientPosition(0, 13 * DAY_MS + 5)).toEqual({ period: 1, day: 14 });
    expect(patientPosition(0, WINDOW_MS)).toEqual({ period: 2, day: 1 });
    expect(patientPosition(0, 3 * WINDOW_MS + 4 * DAY_MS)).toEqual({ period: 4, day: 5 });
  });

  it("a clock set before the anchor still reads day 1", () => {
    expect(patientPosition(10 * DAY_MS, 0)).toEqual({ period: 1, day: 1 });
  });
});

describe("patientSummaries", () => {
  beforeEach(async () => {
    await Promise.all([db.patients.clear(), db.observations.clear()]);
  });

  it("finds each patient's latest log by when it happened, not when it was entered", async () => {
    await db.patients.bulkAdd([{ id: "P-01", anchor: 0 }, { id: "P-02", anchor: 0 }]);
    await db.observations.bulkAdd([
      { patientId: "P-01", itemId: 1, at: 5000, loggedAt: 5000 },
      { patientId: "P-01", itemId: 2, at: 3000, loggedAt: 9000 }, // back-dated
      { patientId: "P-03", itemId: 1, at: 99_000, loggedAt: 99_000 }, // another patient
    ]);
    const [a, b] = await patientSummaries(await db.patients.toArray(), 2 * DAY_MS);
    expect(a).toMatchObject({ id: "P-01", lastLogged: 5000, period: 1, day: 3 });
    expect(b).toMatchObject({ id: "P-02", lastLogged: null });
  });
});
