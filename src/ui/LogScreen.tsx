// Screen 1: one tap logs a behavior. A short description sits on the button so
// the caregiver picks the right item, with the manual page for the full
// definition (p.12-13). A short confirmation offers Edit and Undo for 8 seconds; the timer
// stops while the caregiver is using it (WCAG 2.2.1). Edit, here and in Recent logs, opens
// the one log details sheet (design note 003).

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { GROUP_LABELS, ITEMS, type FactorGroup } from "../scoring/items";
import { DAY_MS } from "../scoring/engine";
import { checkInKey, db, localMidnight, type CheckIn, type StoredObservation } from "../data/db";
import { dayAndTime, timeOfDay } from "./format";
import { Icon } from "./Icon";
import { LogSheet } from "./LogSheet";
import { SectionNav, type Section } from "./SectionNav";

const GROUP_ORDER: FactorGroup[] = ["aggressive", "physical", "verbal", "other"];

// The pinned bar: each behavior group, then recent logs (where mistakes get fixed).
const sections: Section[] = [
  ...GROUP_ORDER.map((g) => ({ id: `group-${g}`, label: GROUP_LABELS[g].split(/[ ,]/)[0] })),
  { id: "recent", label: "Recent logs" },
];
const TOAST_MS = 8000;
const RECENT_SHOWN = 8;

type SavedObs = StoredObservation & { id: number };
type Toast = { kind: "logged" | "deleted"; obs: SavedObs };

interface Props {
  patientId: string;
  observations: StoredObservation[];
  checkins: CheckIn[];
  onChange: () => void;
}

export function LogScreen({ patientId, observations, checkins, onChange }: Props) {
  const [openInfo, setOpenInfo] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [held, setHeld] = useState(false); // pointer or focus inside the confirmation
  const [editing, setEditing] = useState<{ obs: SavedObs; viaKeyboard: boolean } | null>(null);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const lastTap = useRef<{ itemId: number; t: number } | null>(null);
  const [flash, setFlash] = useState<number | null>(null); // the row just logged, highlighted briefly

  const now = Date.now();
  const todayStart = localMidnight(now);
  const todayCounts = new Map<number, number>();
  for (const o of observations) if (o.at >= todayStart) todayCounts.set(o.itemId, (todayCounts.get(o.itemId) ?? 0) + 1);
  const loggedToday = [...todayCounts.values()].reduce((a, b) => a + b, 0);
  const checkedIn = checkins.some((c) => c.day === todayStart);
  const recent = observations.filter((o) => o.loggedAt >= now - DAY_MS || o.at >= now - DAY_MS).sort((a, b) => b.at - a.at);

  // The confirmation closes on its own only while nobody is using it.
  useEffect(() => {
    if (!toast || held) return;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast, held]);

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
    setFlash(itemId);
    window.setTimeout(() => setFlash((f) => (f === itemId ? null : f)), 900);
    setToast({ kind: "logged", obs: { ...obs, id } });
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

  function edit(o: SavedObs, e: MouseEvent) {
    setToast(null);
    setHeld(false);
    setEditing({ obs: o, viaKeyboard: e.detail === 0 });
  }

  async function patch(change: Partial<StoredObservation>) {
    if (!editing) return;
    // Show the change at once; the save follows.
    setEditing({ ...editing, obs: { ...editing.obs, ...change } });
    await db.observations.update(editing.obs.id, change);
    onChange();
  }

  async function remove(o: SavedObs) {
    await db.observations.delete(o.id);
    setEditing(null);
    setToast({ kind: "deleted", obs: o });
    onChange();
  }

  return (
    <div className="log">
      <div className="log-head">
        <p className="screen-title" aria-hidden>Log a behavior</p>{/* the screen heading is the h1 in App */}
        <p className="today-count">{loggedToday ? <><b>{loggedToday}</b> logged today</> : "Nothing logged yet today"}</p>
      </div>
      <p className="hint">Tap a behavior the moment you see it. One tap is one event. For pacing, restlessness and mannerisms, one tap is one stretch of it.</p>
      <SectionNav label="Jump to a group" sections={sections} />
      {GROUP_ORDER.map((g) => (
        <section key={g} id={`group-${g}`} className="group" aria-labelledby={`group-${g}-h`}>
          <h2 className="group-title" id={`group-${g}-h`}>{GROUP_LABELS[g]}</h2>
          <ul className="item-list">
            {ITEMS.filter((i) => i.group === g).map((item) => (
              <li key={item.id} className={flash === item.id ? "item just-logged" : "item"}>
                <div className="item-row">
                  <button className="item-btn" onClick={() => log(item.id)}>
                    <span className="item-num" aria-hidden>{item.id}</span>
                    <span className="item-text">
                      <span className="item-name">
                        <span className="sr">{item.id} </span>{item.name}
                        {item.continuous && <span className="tag">per stretch</span>}
                      </span>
                      <span className="item-def">{item.counts} <span className="ref">Manual p.{item.manualPage}</span></span>
                    </span>
                    {todayCounts.get(item.id) ? <span className="today">{todayCounts.get(item.id)} today</span> : null}
                  </button>
                  {item.doesNotCount && (
                    <button
                      className="info-btn"
                      aria-expanded={openInfo === item.id}
                      aria-label={`What does not count as ${item.name}?`}
                      onClick={() => setOpenInfo(openInfo === item.id ? null : item.id)}
                    >
                      <Icon name="info" size={22} />
                    </button>
                  )}
                </div>
                {openInfo === item.id && <p className="not-count"><b>Not this item:</b> {item.doesNotCount}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="card recent" id="recent" aria-labelledby="recent-h">
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
                    <span><b>{ITEMS[o.itemId - 1].name}</b>{o.before ? <span className="muted"> · before: {o.before}{o.beforeNote ? ` (${o.beforeNote})` : ""}</span> : null}</span>
                  </div>
                  <button className="ghost small" aria-label={`Edit ${ITEMS[o.itemId - 1].name} at ${timeOfDay(o.at)}`} onClick={(e) => edit(o as SavedObs, e)}>Edit</button>
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
          className="snackbar"
          role="status"
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHeld(false); }}
        >
          <Icon name={toast.kind === "logged" ? "checkCircle" : "trash"} size={22} className="snackbar-icon" />
          <span className="snackbar-text">
            <b className="snackbar-title"><span className="sr">{toast.kind === "logged" ? "Logged: " : "Deleted: "}</span>{ITEMS[toast.obs.itemId - 1].name}</b>
            <span className="snackbar-meta">
              {toast.kind === "deleted" && "Deleted · "}{toast.obs.patientId} · {timeOfDay(toast.obs.at)}{toast.obs.approx ? " (about)" : ""}
            </span>
          </span>
          <span className="snackbar-actions">
            {toast.kind === "logged" && <button className="snackbar-btn" onClick={(e) => edit(toast.obs, e)}>Edit</button>}
            <button className="snackbar-btn" onClick={undo}>Undo</button>
          </span>
        </div>
      )}

      <LogSheet
        obs={editing?.obs ?? null}
        viaKeyboard={editing?.viaKeyboard ?? false}
        onPatch={patch}
        onDelete={() => editing && remove(editing.obs)}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
