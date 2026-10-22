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
  loggedAt: number; // when it was entered
}

export interface Review {
  key: string; // `${patientId}|${windowStart}|${itemId}`
  patientId: string;
  windowStart: number;
  itemId: number;
  choice: number; // 1-7, or 8 / 9
  derived: number; // what the engine said, kept for comparison
  reviewedAt: number;
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
  }
}

export const db = new CmaiDb();

export const localMidnight = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const reviewKey = (patientId: string, windowStart: number, itemId: number) =>
  `${patientId}|${windowStart}|${itemId}`;

export const checkInKey = (patientId: string, day: number) => `${patientId}|${day}`;
