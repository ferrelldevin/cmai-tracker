// Upgrading from the first release must keep every patient, log and review.
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { checkInKey, db, isLive } from "../src/data/db";

describe("database upgrade from version 1", () => {
  it("keeps version 1 data and adds empty check-in and change-history tables", async () => {
    db.close();
    await Dexie.delete("cmai-tracker");
    const v1 = new Dexie("cmai-tracker");
    v1.version(1).stores({ patients: "id", observations: "++id, patientId, [patientId+at]", reviews: "key, patientId" });
    await v1.table("patients").add({ id: "P-01", anchor: 0 });
    await v1.table("observations").add({ patientId: "P-01", itemId: 7, at: 1000, loggedAt: 1000 });
    await v1.table("reviews").put({ key: "P-01|0|7", patientId: "P-01", windowStart: 0, itemId: 7, choice: 3, derived: 2, reviewedAt: 2000 });
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
