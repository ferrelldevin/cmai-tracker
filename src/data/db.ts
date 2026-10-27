// Local, offline storage in the browser (IndexedDB, through Dexie).
// Nothing leaves the device unless the caregiver presses Export.

import Dexie, { type Table } from "dexie";

export interface Patient {
  id: string; // pseudonymous code such as "P-01". Never a name.
  anchor: number; // local midnight of day 1; 14-day windows count from here
  demo?: boolean; // created by the demo-data button
}

export interface StoredObservation {
  id?: number;
  patientId: string;
  itemId: number;
  at: number; // when it happened (epoch ms)
  approx?: boolean; // caregiver marked the time as approximate
  before?: string; // optional: what happened just before
  beforeNote?: string; // optional: a few words when "before" is "Other" (no names)
  loggedAt: number; // when it was entered
  // Deleting a log only marks it. The record stays, so the lab can audit every removal,
  // and scoring skips it (design note 007).
  deletedAt?: number;
  deleteReason?: string; // one of DELETE_REASONS in logs.ts
  deleteNote?: string; // a few words when the reason is "Other" (no names)
}

/** True for a log that counts: one that has not been deleted. */
export const isLive = (o: StoredObservation) => o.deletedAt === undefined;

/**
 * A day-14 review choice from before scores were locked (D-14). Kept in storage and backups
 * so nothing recorded is lost, but no score reads it: the app's rating is never overridden.
 */
export interface Review {
  key: string; // `${patientId}|${windowStart}|${itemId}`
  patientId: string;
  windowStart: number;
  itemId: number;
  choice: number; // 1-7, or 8 / 9
  derived: number; // what the engine said, kept for comparison
  reviewedAt: number;
}

/**
 * One entry per edit, delete or restore of a log, never changed or removed except with the
 * whole patient. `from` and `to` hold the fields that changed (design note 007).
 */
export interface LogChange {
  id?: number;
  observationId: number;
  patientId: string;
  action: "edit" | "delete" | "restore";
  at: number; // when the change was made
  from?: Partial<StoredObservation>;
  to?: Partial<StoredObservation>;
}

/** "Nothing to log today": tells a quiet day apart from a day nobody logged. */
export interface CheckIn {
  key: string; // `${patientId}|${day}`, so one per patient per day
  patientId: string;
  day: number; // local midnight of the day it covers
  at: number; // when it was tapped
}

class CmaiDb extends Dexie {
  patients!: Table<Patient, string>;
  observations!: Table<StoredObservation, number>;
  reviews!: Table<Review, string>;
  checkins!: Table<CheckIn, string>;
  changes!: Table<LogChange, number>;
  constructor() {
    super("cmai-tracker");
    this.version(1).stores({
      patients: "id",
      observations: "++id, patientId, [patientId+at]",
      reviews: "key, patientId",
    });
    // Version 2 only adds a table. Existing patients, logs and reviews are kept as they are.
    this.version(2).stores({
      checkins: "key, patientId",
    });
    // Version 3 adds the change history. Existing data is kept; old logs have no deletedAt, so all still count.
    this.version(3).stores({
      changes: "++id, patientId, observationId",
    });
  }
}

export const db = new CmaiDb();

// Kept here so existing imports still work; the engine owns calendar-day math.
export { localMidnight } from "../scoring/engine";

export const reviewKey = (patientId: string, windowStart: number, itemId: number) =>
  `${patientId}|${windowStart}|${itemId}`;

export const checkInKey = (patientId: string, day: number) => `${patientId}|${day}`;
