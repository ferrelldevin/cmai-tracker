// Screen 1: one tap logs a behavior. A short description sits on the button so
// the caregiver picks the right item, with the manual page for the full
// definition (p.12-13). Undo for 8 seconds; the timer stops while the caregiver
// is using the toast (WCAG 2.2.1). Recent logs below can be re-timed or deleted.

import { useEffect, useRef, useState } from "react";
import { GROUP_LABELS, ITEMS, type FactorGroup } from "../scoring/items";
import { DAY_MS } from "../scoring/engine";
import { checkInKey, db, localMidnight, type CheckIn, type StoredObservation } from "../data/db";
import { dayAndTime, timeOfDay } from "./format";

const BEFORE_OPTIONS = ["Personal care or bathing", "Mealtime", "Noise or crowding", "Seemed in pain", "Change in routine", "Visitor or phone call", "Nothing noticed", "Other"];
const GROUP_ORDER: FactorGroup[] = ["aggressive", "physical", "verbal", "other"];
const EARLIER = [0, 5, 15, 30, 60]; // minutes ago
const TOAST_MS = 8000;
const RECENT_SHOWN = 8;

type Toast = { kind: "logged" | "deleted"; obs: StoredObservation & { id: number } };

interface Props {
  patientId: string;
  observations: StoredObservation[];
  checkins: CheckIn[];
  onChange: () => void;
}

const hhmm = (t: number) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** A clock time typed for a log: today, or yesterday if that time has not come yet today. */
function fromClock(value: string, now: number) {
  const [h, m] = value.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d.getTime() > now ? d.getTime() - DAY_MS : d.getTime();
}

export function LogScreen({ patientId, observations, checkins, onChange }: Props) {
  const [openInfo, setOpenInfo] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [details, setDetails] = useState(false);
  const [held, setHeld] = useState(false); // pointer or focus inside the toast
  const [editing, setEditing] = useState<number | null>(null);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const lastTap = useRef<{ itemId: number; t: number } | null>(null);

  const now = Date.now();
  const todayStart = localMidnight(now);
  const todayCounts = new Map<number, number>();
  for (const o of observations) if (o.at >= todayStart) todayCounts.set(o.itemId, (todayCounts.get(o.itemId) ?? 0) + 1);
  const loggedToday = [...todayCounts.values()].reduce((a, b) => a + b, 0);
  const checkedIn = checkins.some((c) => c.day === todayStart);
  const recent = observations.filter((o) => o.loggedAt >= now - DAY_MS || o.at >= now - DAY_MS).sort((a, b) => b.at - a.at);

  // The toast closes on its own only while nobody is using it.
  useEffect(() => {
    if (!toast || details || held) return;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast, details, held]);

  // Switching resident closes anything that belonged to the last one.
  useEffect(() => { setToast(null); setEditing(null); }, [patientId]);

  async function log(itemId: number) {
    const t = Date.now();
    // A double tap on the same card within 0.6 s is almost always one event.
    if (lastTap.current && lastTap.current.itemId === itemId && t - lastTap.current.t < 600) return;
    lastTap.current = { itemId, t };
    const obs = { patientId, itemId, at: t, loggedAt: t };
    const id = await db.observations.add(obs);
    navigator.vibrate?.(15);
    setToast({ kind: "logged", obs: { ...obs, id } });
    setDetails(false);
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
    if (!toast) return;
    if (toast.kind === "logged") await db.observations.delete(toast.obs.id);
    else await db.observations.put(toast.obs);
    setToast(null);
    setHeld(false);
    onChange();
  }

  async function patch(id: number, change: Partial<StoredObservation>) {
    // Show the change at once; the save follows.
    setToast((t) => (t && t.obs.id === id ? { ...t, obs: { ...t.obs, ...change } } : t));
    await db.observations.update(id, change);
    onChange();
  }

  async function remove(o: StoredObservation) {
    if (o.id === undefined) return;
    await db.observations.delete(o.id);
    setEditing(null);
    setDetails(false);
    setToast({ kind: "deleted", obs: { ...o, id: o.id } });
    onChange();
  }

  const minutesAgo = toast ? Math.round((toast.obs.loggedAt - toast.obs.at) / 60_000) : 0;

  return (
    <div className="log">
      <div className="log-head">
        <p className="for">Logging for <b>{patientId}</b></p>
        <p className="muted">{loggedToday ? `${loggedToday} logged today` : "Nothing logged yet today"}</p>
      </div>
      <p className="hint">Tap a behavior the moment you see it. One tap is one event. For pacing, restlessness, and mannerisms, one tap is one stretch of it.</p>
      {GROUP_ORDER.map((g) => (
        <section key={g}>
          <h2 className="group-title">{GROUP_LABELS[g]}</h2>
          <div className="item-grid">
            {ITEMS.filter((i) => i.group === g).map((item) => (
              <div key={item.id} className="item-card">
                <button className="item-btn" onClick={() => log(item.id)}>
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
                    {openInfo === item.id ? "Hide" : "What does not count?"}
                  </button>
                )}
                {openInfo === item.id && <p className="not-count">Not this item: {item.doesNotCount}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="card recent" aria-labelledby="recent-h">
        <h2 id="recent-h">Recent logs</h2>
        {recent.length === 0 ? (
          <p className="muted">Logs from the last 24 hours show here, so you can fix a time or remove a mistake.</p>
        ) : (
          <>
            <p className="muted">Last 24 hours, newest first. Fix the time or remove a log tapped by mistake.</p>
            <ul className="recent-list">
              {recent.slice(0, showAllRecent ? undefined : RECENT_SHOWN).map((o) => (
                <li key={o.id}>
                  <div className="recent-main">
                    <span className="recent-time">{o.at < todayStart ? dayAndTime(o.at) : timeOfDay(o.at)}{o.approx ? " (about)" : ""}</span>
                    <span><b>{ITEMS[o.itemId - 1].name}</b>{o.before ? <span className="muted"> · before: {o.before}</span> : null}</span>
                  </div>
                  {editing === o.id ? (
                    <div className="recent-edit">
                      <label>
                        Happened at
                        <input type="time" defaultValue={hhmm(o.at)} onChange={(e) => e.target.value && patch(o.id!, { at: fromClock(e.target.value, Date.now()) })} />
                      </label>
                      <button className="ghost" onClick={() => setEditing(null)}>Done</button>
                      <button className="danger" onClick={() => remove(o)}>Delete</button>
                    </div>
                  ) : (
                    <button className="ghost small" aria-label={`Edit ${ITEMS[o.itemId - 1].name} at ${timeOfDay(o.at)}`} onClick={() => setEditing(o.id!)}>Edit</button>
                  )}
                </li>
              ))}
            </ul>
            {recent.length > RECENT_SHOWN && (
              <button className="ghost" onClick={() => setShowAllRecent(!showAllRecent)}>{showAllRecent ? "Show fewer" : `Show all ${recent.length}`}</button>
            )}
          </>
        )}
      </section>

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

      {toast && (
        <div
          className="toast"
          role="status"
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHeld(false); }}
        >
          <div className="toast-row">
            <span>
              {toast.kind === "logged" ? "Logged" : "Deleted"} <b>{ITEMS[toast.obs.itemId - 1].name}</b> for {toast.obs.patientId} at {timeOfDay(toast.obs.at)}
              {toast.obs.approx ? " (about)" : ""}
            </span>
            <button onClick={undo}>Undo</button>
            {toast.kind === "logged" && (
              <button className="ghost" aria-expanded={details} onClick={() => setDetails(!details)}>{details ? "Done" : "Time or detail"}</button>
            )}
          </div>
          {details && toast.kind === "logged" && (
            <div className="toast-details">
              <fieldset className="earlier">
                <legend>When did it happen?</legend>
                <div className="earlier-chips">
                  {EARLIER.map((m) => (
                    <button key={m} className={minutesAgo === m ? "chip on" : "chip"} aria-pressed={minutesAgo === m} onClick={() => patch(toast.obs.id, { at: toast.obs.loggedAt - m * 60_000 })}>
                      {m === 0 ? "Just now" : m === 60 ? "1 hr ago" : `${m} min ago`}
                    </button>
                  ))}
                </div>
                <label className="inline">
                  Or a time
                  <input type="time" value={hhmm(toast.obs.at)} onChange={(e) => e.target.value && patch(toast.obs.id, { at: fromClock(e.target.value, toast.obs.loggedAt) })} />
                </label>
              </fieldset>
              <label className="inline">
                <input type="checkbox" checked={!!toast.obs.approx} onChange={(e) => patch(toast.obs.id, { approx: e.target.checked })} /> Time is approximate
              </label>
              <label>
                What happened just before?
                <select value={toast.obs.before ?? ""} onChange={(e) => patch(toast.obs.id, { before: e.target.value })}>
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
