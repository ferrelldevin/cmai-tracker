// Screen 1: one tap logs a behavior. A short description sits on the button so
// the caregiver picks the right item, with the manual page for the full
// definition (p.12-13). Undo for 5 seconds.

import { useEffect, useRef, useState } from "react";
import { GROUP_LABELS, ITEMS, type FactorGroup } from "../scoring/items";
import { checkInKey, db, localMidnight, type CheckIn, type StoredObservation } from "../data/db";
import { timeOfDay } from "./format";

const BEFORE_OPTIONS = ["Personal care or bathing", "Mealtime", "Noise or crowding", "Seemed in pain", "Change in routine", "Visitor or phone call", "Nothing noticed", "Other"];
const GROUP_ORDER: FactorGroup[] = ["aggressive", "physical", "verbal", "other"];

interface Props {
  patientId: string;
  observations: StoredObservation[];
  checkins: CheckIn[];
  onChange: () => void;
}

export function LogScreen({ patientId, observations, checkins, onChange }: Props) {
  const [openInfo, setOpenInfo] = useState<number | null>(null);
  const [last, setLast] = useState<{ id: number; itemId: number } | null>(null);
  const [details, setDetails] = useState(false);
  const timer = useRef<number>();

  const todayStart = localMidnight(Date.now());
  const todayCounts = new Map<number, number>();
  for (const o of observations) if (o.at >= todayStart) todayCounts.set(o.itemId, (todayCounts.get(o.itemId) ?? 0) + 1);
  const loggedToday = [...todayCounts.values()].reduce((a, b) => a + b, 0);
  const checkedIn = checkins.some((c) => c.day === todayStart);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function log(itemId: number) {
    const now = Date.now();
    const id = await db.observations.add({ patientId, itemId, at: now, loggedAt: now });
    setLast({ id, itemId });
    setDetails(false);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLast(null), 8000);
    onChange();
  }

  // One per patient per day. Tapping again takes it back.
  async function toggleCheckIn() {
    const key = checkInKey(patientId, todayStart);
    if (checkedIn) await db.checkins.delete(key);
    else await db.checkins.put({ key, patientId, day: todayStart, at: Date.now() });
    onChange();
  }

  async function undo() {
    if (!last) return;
    await db.observations.delete(last.id);
    setLast(null);
    onChange();
  }

  async function addDetail(patch: Partial<StoredObservation>) {
    if (!last) return;
    await db.observations.update(last.id, patch);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLast(null), 8000);
    onChange();
  }

  return (
    <div className="log">
      <p className="hint">Tap a behavior the moment you see it. One tap is one event. For pacing, restlessness, and mannerisms, one tap is one stretch of it.</p>
      {GROUP_ORDER.map((g) => (
        <section key={g}>
          <h2 className="group-title">{GROUP_LABELS[g]}</h2>
          <div className="item-grid">
            {ITEMS.filter((i) => i.group === g).map((item) => (
              <div key={item.id} className="item-card">
                <button className="item-btn" onClick={() => log(item.id)} aria-label={`Log ${item.name}`}>
                  <span className="item-name">
                    <span className="item-num">{item.id}</span>
                    {item.name}
                    {item.continuous && <span className="tag">per stretch</span>}
                  </span>
                  <span className="item-def">{item.counts} <span className="ref">Manual p.{item.manualPage}</span></span>
                  {todayCounts.get(item.id) ? <span className="today">{todayCounts.get(item.id)} today</span> : null}
                </button>
                {item.doesNotCount && (
                  <button className="info-btn" aria-expanded={openInfo === item.id} onClick={() => setOpenInfo(openInfo === item.id ? null : item.id)}>
                    {openInfo === item.id ? "Hide" : "Does not count"}
                  </button>
                )}
                {openInfo === item.id && <p className="not-count">Not this item: {item.doesNotCount}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="card checkin">
        <h2>End of shift</h2>
        {loggedToday > 0 ? (
          <p className="muted">{loggedToday} logged today, so today already counts as logged.</p>
        ) : (
          <>
            <p className="muted">Saw none of these behaviors today? Tap this so the app knows today was quiet, not missed. Days with no logs and no check-in show as "unlogged" on Scores.</p>
            <button className={checkedIn ? "ghost" : ""} aria-pressed={checkedIn} onClick={toggleCheckIn}>
              {checkedIn ? "✓ Nothing to log today (tap to undo)" : "Nothing to log today"}
            </button>
          </>
        )}
      </section>

      {last && (
        <div className="toast" role="status">
          <div className="toast-row">
            <span>
              Logged <b>{ITEMS[last.itemId - 1].name}</b> at {timeOfDay(Date.now())}
            </span>
            <button onClick={undo}>Undo</button>
            <button className="ghost" onClick={() => setDetails(!details)}>{details ? "Done" : "Add detail"}</button>
          </div>
          {details && (
            <div className="toast-details">
              <label>
                <input type="checkbox" onChange={(e) => addDetail({ approx: e.target.checked })} /> Time is approximate
              </label>
              <label>
                What happened just before?
                <select defaultValue="" onChange={(e) => addDetail({ before: e.target.value })}>
                  <option value="" disabled>Choose one (optional)</option>
                  {BEFORE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
