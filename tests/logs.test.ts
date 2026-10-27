// Locked scores and soft delete (D-14, design note 007): a deleted log is kept with its reason,
// stops counting, and every edit, delete and restore is in the change history.
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { beforeEach, describe, expect, it } from "vitest";
import { db, reviewKey, type StoredObservation } from "../src/data/db";
import { buildExport } from "../src/data/exporter";
import { deleteLog, editLog, restoreLog, UNDO_REASON } from "../src/data/logs";
import { restoreBackup } from "../src/data/manage";
import { loadDemoData } from "../src/data/seed";

type Saved = StoredObservation & { id: number };

async function add(o: StoredObservation): Promise<Saved> {
  const id = await db.observations.add(o);
  return { ...o, id };
}

const csvRows = (text: string) => text.split("\n").map((r) => r.split(","));

beforeEach(async () => {
  db.close();
  await Dexie.delete("cmai-tracker");
  await db.open();
  await db.patients.add({ id: "P-01", anchor: 0 });
});

describe("deleting a log", () => {
  it("keeps the record, marked with when and why", async () => {
    const o = await add({ patientId: "P-01", itemId: 7, at: 1000, loggedAt: 1000 });
    await deleteLog(o, "Logged twice", undefined, 5000);
    const stored = await db.observations.get(o.id);
    expect(stored).toMatchObject({ itemId: 7, at: 1000, deletedAt: 5000, deleteReason: "Logged twice" });
    expect(await db.observations.count()).toBe(1);
  });

  it("needs a reason from the list, and a note when the reason is Other", async () => {
    const o = await add({ patientId: "P-01", itemId: 7, at: 1000, loggedAt: 1000 });
    await expect(deleteLog(o, "")).rejects.toThrow("Pick a reason");
    await expect(deleteLog(o, "Because")).rejects.toThrow("Pick a reason");
    await expect(deleteLog(o, "Other", "   ")).rejects.toThrow("few words");
    expect((await db.observations.get(o.id))?.deletedAt).toBeUndefined();
    expect(await db.changes.count()).toBe(0);
    await deleteLog(o, "Other", " fire drill, not the resident ", 6000);
    expect(await db.observations.get(o.id)).toMatchObject({ deleteReason: "Other", deleteNote: "fire drill, not the resident" });
  });

  it("records the delete in the change history, and an undo restores it with a second entry", async () => {
    const o = await add({ patientId: "P-01", itemId: 13, at: 1000, loggedAt: 1000 });
    await deleteLog(o, "Wrong behavior", undefined, 2000);
    await restoreLog(o, 3000);
    expect((await db.observations.get(o.id))?.deletedAt).toBeUndefined();
    const history = await db.changes.where("observationId").equals(o.id).sortBy("id");
    expect(history.map((c) => c.action)).toEqual(["delete", "restore"]);
    expect(history[0].to).toEqual({ deletedAt: 2000, deleteReason: "Wrong behavior" });
    expect(history[1].from).toEqual({ deletedAt: 2000, deleteReason: "Wrong behavior" });
  });

  it("an Undo right after logging is a delete with its own reason", async () => {
    const o = await add({ patientId: "P-01", itemId: 1, at: 1000, loggedAt: 1000 });
    await deleteLog(o, UNDO_REASON, undefined, 1500);
    expect((await db.observations.get(o.id))?.deleteReason).toBe(UNDO_REASON);
  });

  it("deleting twice records once", async () => {
    const o = await add({ patientId: "P-01", itemId: 1, at: 1000, loggedAt: 1000 });
    await deleteLog(o, "Tapped by mistake", undefined, 2000);
    await deleteLog(o, "Logged twice", undefined, 3000);
    expect((await db.observations.get(o.id))?.deleteReason).toBe("Tapped by mistake");
    expect(await db.changes.count()).toBe(1);
  });
});

describe("editing a log", () => {
  it("records what changed and what it was before", async () => {
    const o = await add({ patientId: "P-01", itemId: 7, at: 10_000, loggedAt: 10_000 });
    await editLog(o, { at: 4000, approx: true }, 20_000);
    const [c] = await db.changes.toArray();
    expect(c).toMatchObject({ action: "edit", observationId: o.id, from: { at: 10_000 }, to: { at: 4000, approx: true } });
  });

  it("folds edits a few minutes apart into one entry, from the first value to the last", async () => {
    const o = await add({ patientId: "P-01", itemId: 16, at: 10_000, loggedAt: 10_000, before: "Other" });
    await editLog(o, { beforeNote: "f" }, 20_000);
    await editLog(o, { beforeNote: "fire" }, 21_000);
    await editLog(o, { beforeNote: "fire alarm" }, 22_000);
    const history = await db.changes.toArray();
    expect(history).toHaveLength(1);
    expect(history[0].from).toEqual({});
    expect(history[0].to).toEqual({ beforeNote: "fire alarm" });
    await editLog(o, { at: 9000 }, 22_000 + 10 * 60_000);
    expect(await db.changes.count()).toBe(2);
  });

  it("leaves no entry when nothing changed, and does not edit a deleted log", async () => {
    const o = await add({ patientId: "P-01", itemId: 7, at: 10_000, loggedAt: 10_000 });
    await editLog(o, { at: 10_000 });
    expect(await db.changes.count()).toBe(0);
    await deleteLog(o, "Wrong patient", undefined, 11_000);
    await editLog(o, { at: 5000 }, 12_000);
    expect((await db.observations.get(o.id))?.at).toBe(10_000);
    expect(await db.changes.count()).toBe(1);
  });
});

describe("scores are the app's own", () => {
  it("a deleted log does not count, and the export keeps it with its reason", async () => {
    const day = 86_400_000;
    await add({ patientId: "P-01", itemId: 7, at: day, loggedAt: day });
    const gone = await add({ patientId: "P-01", itemId: 7, at: 2 * day, loggedAt: 2 * day });
    await deleteLog(gone, "Logged twice", undefined, 3 * day);
    const { observationsCsv, scoresCsv, json } = await buildExport(20 * day);

    const scores = csvRows(scoresCsv);
    const head = scores[0];
    expect(head).not.toContain("final_rating");
    expect(head).not.toContain("reviewed");
    const hitting = scores.find((r) => r[0] === "P-01" && r[4] === "7" && r[1] === new Date(0).toISOString())!;
    expect(hitting[head.indexOf("count")]).toBe("1");
    expect(hitting[head.indexOf("derived_rating")]).toBe("2");

    const obs = csvRows(observationsCsv);
    expect(obs).toHaveLength(3); // header plus both logs
    const deleted = obs.find((r) => r[obs[0].indexOf("delete_reason")] === "Logged twice")!;
    expect(deleted[obs[0].indexOf("deleted_at")]).toBe(new Date(3 * day).toISOString());
    expect(JSON.parse(json).changes).toHaveLength(1);
  });

  it("an old day-14 review on file never changes the exported rating", async () => {
    await add({ patientId: "P-01", itemId: 7, at: 1000, loggedAt: 1000 });
    await db.reviews.put({ key: reviewKey("P-01", 0, 7), patientId: "P-01", windowStart: 0, itemId: 7, choice: 6, derived: 2, reviewedAt: 5000 });
    const scores = csvRows((await buildExport(20 * 86_400_000)).scoresCsv);
    const row = scores.find((r) => r[0] === "P-01" && r[4] === "7" && r[1] === new Date(0).toISOString())!;
    expect(row[scores[0].indexOf("derived_rating")]).toBe("2");
    expect(row).not.toContain("6");
    // The review is still in the backup, so nothing recorded is lost.
    expect(JSON.parse((await buildExport()).json).reviews).toHaveLength(1);
  });
});

describe("backup and restore", () => {
  it("brings a deleted log back deleted, with its history pointing at the new id", async () => {
    const o = await add({ patientId: "P-01", itemId: 7, at: 1000, loggedAt: 1000 });
    await editLog(o, { approx: true }, 1500);
    await deleteLog(o, "Wrong behavior", undefined, 2000);
    const { json } = await buildExport(100_000);
    db.close();
    await Dexie.delete("cmai-tracker");
    await db.open();
    await db.observations.add({ patientId: "P-09", itemId: 1, at: 1, loggedAt: 1 }); // takes id 1, so ids differ
    await restoreBackup(json);
    const restored = (await db.observations.where("patientId").equals("P-01").toArray())[0];
    expect(restored).toMatchObject({ deletedAt: 2000, deleteReason: "Wrong behavior", approx: true });
    expect(restored.id).not.toBe(o.id);
    const history = await db.changes.where("observationId").equals(restored.id!).sortBy("id");
    expect(history.map((c) => c.action)).toEqual(["edit", "delete"]);
  });
});

describe("demo data", () => {
  it("loading it again brings back a clean demo: no deleted logs, no history", async () => {
    await loadDemoData();
    const first = await db.observations.where("patientId").equals("P-DEMO-A").first();
    await deleteLog({ ...first!, id: first!.id! }, "Wrong behavior");
    expect(await db.changes.count()).toBe(1);
    await loadDemoData();
    expect(await db.changes.count()).toBe(0);
    expect((await db.observations.toArray()).every((o) => o.deletedAt === undefined)).toBe(true);
  });
});
