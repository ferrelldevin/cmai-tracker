// Upgrading from any earlier release must keep every patient, log, review and check-in.
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { checkInKey, db, isLive } from "../src/data/db";

describe("database upgrade from version 1", () => {
  it("keeps version 1 data and adds empty check-in and change-history tables", async () => {
    db.close();
    await Dexie.delete("cmai-tracker");
    const v1 = new Dexie("cmai-tracker");
    v1.version(1).stores({
      patients: "id",
      observations: "++id, patientId, [patientId+at]",
      reviews: "key, patientId",
    });
    await v1.table("patients").add({ id: "P-01", anchor: 0 });
    await v1.table("observations").add({ patientId: "P-01", itemId: 7, at: 1000, loggedAt: 1000 });
    await v1
      .table("reviews")
      .put({ key: "P-01|0|7", patientId: "P-01", windowStart: 0, itemId: 7, choice: 3, derived: 2, reviewedAt: 2000 });
    v1.close();

    await db.open();
    expect(db.verno).toBe(3);
    expect(await db.patients.toArray()).toEqual([{ id: "P-01", anchor: 0 }]);
    expect(await db.observations.count()).toBe(1);
    expect((await db.reviews.get("P-01|0|7"))?.choice).toBe(3);
    expect(await db.checkins.count()).toBe(0);
    expect(await db.changes.count()).toBe(0);
    // Logs from before soft delete have no deletedAt, so they all still count.
    expect((await db.observations.toArray()).every(isLive)).toBe(true);

    await db.checkins.put({ key: checkInKey("P-01", 0), patientId: "P-01", day: 0, at: 5000 });
    await db.checkins.put({ key: checkInKey("P-01", 0), patientId: "P-01", day: 0, at: 6000 });
    expect(await db.checkins.where("patientId").equals("P-01").count()).toBe(1);
  });
});

describe("database upgrade from version 2", () => {
  it("keeps version 2 logs and check-ins and adds an empty change history", async () => {
    db.close();
    await Dexie.delete("cmai-tracker");
    const v2 = new Dexie("cmai-tracker");
    v2.version(1).stores({
      patients: "id",
      observations: "++id, patientId, [patientId+at]",
      reviews: "key, patientId",
    });
    v2.version(2).stores({ checkins: "key, patientId" });
    await v2.table("patients").add({ id: "P-02", anchor: 0 });
    await v2.table("observations").bulkAdd([
      { patientId: "P-02", itemId: 3, at: 1000, loggedAt: 1000, approx: true, before: "Mealtime" },
      { patientId: "P-02", itemId: 16, at: 2000, loggedAt: 2000, before: "Other", beforeNote: "fire alarm test" },
    ]);
    await v2.table("checkins").put({ key: checkInKey("P-02", 0), patientId: "P-02", day: 0, at: 3000 });
    v2.close();

    await db.open();
    expect(db.verno).toBe(3);
    expect(await db.observations.where("patientId").equals("P-02").sortBy("at")).toMatchObject([
      { itemId: 3, approx: true, before: "Mealtime" },
      { itemId: 16, before: "Other", beforeNote: "fire alarm test" },
    ]);
    expect((await db.checkins.get(checkInKey("P-02", 0)))?.at).toBe(3000);
    expect(await db.changes.count()).toBe(0);
    expect((await db.observations.toArray()).every(isLive)).toBe(true);
  });
});

// A phone keeps its data across app updates only if each new schema version upgrades the old one.
// When db.ts gets a new version, this fails until an upgrade test from the version before it is added
// above and UPGRADES_TESTED is updated.
const UPGRADES_TESTED = [1, 2];
describe("every schema version has an upgrade test", () => {
  it("covers each version before the current one", async () => {
    if (!db.isOpen()) await db.open();
    const before = Array.from({ length: db.verno - 1 }, (_, i) => i + 1);
    expect(UPGRADES_TESTED).toEqual(before);
  });
});
