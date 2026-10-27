// Changing a log after it is made: edit, delete, restore. Every change is written to the
// change history in the same transaction, so the history and the log can't disagree.
// A delete only marks the log (soft delete); scoring skips marked logs (design note 007).

import { db, type LogChange, type StoredObservation } from "./db";

/** Why a log was removed. A pick list, so reasons can be counted and no names get typed. */
export const DELETE_REASONS = ["Tapped by mistake", "Wrong behavior", "Wrong patient", "Logged twice", "Other"] as const;
/** The reason recorded when the snackbar's Undo takes back a log just made. */
export const UNDO_REASON = "Undone right after logging";

type Saved = StoredObservation & { id: number };
const EDITABLE = ["at", "approx", "before", "beforeNote"] as const;
const EDIT_MERGE_MS = 5 * 60_000;

/** Throws when the reason is missing, or is "Other" without a note. */
export async function deleteLog(obs: Saved, reason: string, note?: string, now = Date.now()) {
  const trimmed = note?.trim() || undefined;
  if (reason !== UNDO_REASON && !(DELETE_REASONS as readonly string[]).includes(reason)) throw new Error("Pick a reason to delete this log.");
  if (reason === "Other" && !trimmed) throw new Error("Say in a few words why this log is being deleted.");
  const mark = { deletedAt: now, deleteReason: reason, ...(trimmed ? { deleteNote: trimmed } : {}) };
  await db.transaction("rw", [db.observations, db.changes], async () => {
    const current = await db.observations.get(obs.id);
    if (!current || current.deletedAt !== undefined) return; // already gone: nothing to record
    await db.observations.update(obs.id, mark);
    await record({ observationId: obs.id, patientId: obs.patientId, action: "delete", at: now, to: mark });
  });
}

/** Undo of a delete: the log counts again, and the history keeps both steps. */
export async function restoreLog(obs: Saved, now = Date.now()) {
  await db.transaction("rw", [db.observations, db.changes], async () => {
    const current = await db.observations.get(obs.id);
    if (!current || current.deletedAt === undefined) return;
    const from = { deletedAt: current.deletedAt, deleteReason: current.deleteReason, deleteNote: current.deleteNote };
    // Dexie's update removes a key set to undefined.
    await db.observations.update(obs.id, { deletedAt: undefined, deleteReason: undefined, deleteNote: undefined });
    await record({ observationId: obs.id, patientId: obs.patientId, action: "restore", at: now, from });
  });
}

/** Saves a change to a log's time or context and records what it was before. A deleted log can't be edited. */
export async function editLog(obs: Saved, change: Partial<StoredObservation>, now = Date.now()) {
  await db.transaction("rw", [db.observations, db.changes], async () => {
    const current = await db.observations.get(obs.id);
    if (!current || current.deletedAt !== undefined) return;
    const from: Partial<StoredObservation> = {};
    const to: Partial<StoredObservation> = {};
    for (const k of EDITABLE) {
      if (k in change && change[k] !== current[k]) {
        (from as Record<string, unknown>)[k] = current[k];
        (to as Record<string, unknown>)[k] = change[k];
      }
    }
    if (!Object.keys(to).length) return;
    await db.observations.update(obs.id, to);
    // Typing a note saves on every key, so edits a few minutes apart count as one change:
    // the first "from" and the latest "to" (EDIT_MERGE_MS).
    const last = (await db.changes.where("observationId").equals(obs.id).sortBy("id")).pop();
    if (last?.id !== undefined && last.action === "edit" && now - last.at < EDIT_MERGE_MS) {
      // A field the earlier entry already touched keeps its first value, even if that was "unset".
      const touched = new Set([...Object.keys(last.from ?? {}), ...Object.keys(last.to ?? {})]);
      const firstFrom = { ...Object.fromEntries(Object.entries(from).filter(([k]) => !touched.has(k))), ...last.from };
      await db.changes.update(last.id, { at: now, from: clean(firstFrom), to: clean({ ...last.to, ...to }) });
      return;
    }
    await record({ observationId: obs.id, patientId: obs.patientId, action: "edit", at: now, from, to });
  });
}

// Drops keys whose value is undefined, so the stored history only names what was there.
const clean = (o?: Partial<StoredObservation>) => o && Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

function record({ from, to, ...c }: LogChange) {
  return db.changes.add({ ...c, ...(from ? { from: clean(from) } : {}), ...(to ? { to: clean(to) } : {}) });
}
