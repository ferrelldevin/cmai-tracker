// Restore from an export, delete a patient, and clear demo data.
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { beforeEach, describe, expect, it } from "vitest";
import { checkInKey, db, reviewKey } from "../src/data/db";
import { buildExport } from "../src/data/exporter";
import { deletePatient, parseBackup, removeDemoData, restoreBackup } from "../src/data/manage";

async function seed() {
  await db.patients.bulkAdd([{ id: "P-01", anchor: 0 }, { id: "P-DEMO-A", anchor: 0, demo: true }]);
  await db.observations.bulkAdd([
    { patientId: "P-01", itemId: 7, at: 1000, loggedAt: 1000 },
    { patientId: "P-01", itemId: 13, at: 2000, loggedAt: 2100, approx: true, before: "Mealtime" },
    { patientId: "P-DEMO-A", itemId: 1, at: 3000, loggedAt: 3000 },
  ]);
  await db.reviews.put({ key: reviewKey("P-01", 0, 7), patientId: "P-01", windowStart: 0, itemId: 7, choice: 8, derived: 2, reviewedAt: 5000 });
  await db.checkins.put({ key: checkInKey("P-01", 86_400_000), patientId: "P-01", day: 86_400_000, at: 90_000_000 });
}

beforeEach(async () => {
  db.close();
  await Dexie.delete("cmai-tracker");
  await db.open();
});

describe("restore from backup", () => {
  it("brings back everything an export holds", async () => {
    await seed();
    const { json } = await buildExport(100_000);
    await Dexie.delete("cmai-tracker");
    await db.open();
    const r = await restoreBackup(json);
    expect(r).toMatchObject({ patients: 2, observations: 3, reviews: 1, checkins: 1 });
    expect(await db.patients.get("P-DEMO-A")).toEqual({ id: "P-DEMO-A", anchor: 0, demo: true });
    const obs = await db.observations.where("patientId").equals("P-01").sortBy("at");
    expect(obs[1]).toMatchObject({ itemId: 13, approx: true, before: "Mealtime" });
    expect((await db.reviews.get(reviewKey("P-01", 0, 7)))?.choice).toBe(8);
    expect(await db.checkins.count()).toBe(1);
  });

  it("restoring the same file twice adds nothing the second time", async () => {
    await seed();
    const { json } = await buildExport(100_000);
    const r = await restoreBackup(json);
    expect(r.patients).toBe(0);
    expect(r.observations).toBe(0);
    expect(await db.observations.count()).toBe(3);
  });

  it("refuses a file that is not a backup, with a readable message", () => {
    expect(() => parseBackup("not json")).toThrow(/not a CMAI Tracker backup/);
    expect(() => parseBackup('{"hello":1}')).toThrow(/not a CMAI Tracker backup/);
  });

  it("skips malformed rows instead of failing the whole file", () => {
    const b = parseBackup(JSON.stringify({ patients: [{ id: "P-01", anchor: 0 }, { id: "" }], observations: [{ patientId: "P-01", itemId: 99, at: 1, loggedAt: 1 }, { patientId: "P-01", itemId: 3, at: 1, loggedAt: 1 }] }));
    expect(b.patients).toHaveLength(1);
    expect(b.observations).toHaveLength(1);
  });
});

describe("deleting", () => {
  it("delete patient removes its logs, reviews and check-ins only", async () => {
    await seed();
    await deletePatient("P-01");
    expect(await db.patients.get("P-01")).toBeUndefined();
    expect(await db.observations.where("patientId").equals("P-01").count()).toBe(0);
    expect(await db.reviews.count()).toBe(0);
    expect(await db.checkins.count()).toBe(0);
    expect(await db.observations.where("patientId").equals("P-DEMO-A").count()).toBe(1);
  });

  it("remove demo data keeps real patients", async () => {
    await seed();
    expect(await removeDemoData()).toBe(1);
    expect((await db.patients.toArray()).map((p) => p.id)).toEqual(["P-01"]);
    expect(await db.observations.count()).toBe(2);
  });
});
