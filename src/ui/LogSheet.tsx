// Log details: the one place a log's time and context are changed, reached from the
// confirmation's Edit and from Recent logs. Changes save as they are made, so Done only
// closes and closing the sheet any way (Esc, backdrop) loses nothing. Grouped form rows,
// then one action row at the bottom: Delete on the left, Done on the right (Devin, 2026-10-24). Design note: docs/design/notes/003-log-confirmation.md.
// Delete is two steps: pick a reason, then confirm. The log is kept, marked deleted with the
// reason (D-14, design note 007).

import { useEffect, useRef, useState } from "react";
import type { StoredObservation } from "../data/db";
import { DELETE_REASONS } from "../data/logs";
import { DAY_MS } from "../scoring/engine";
import { ITEMS } from "../scoring/items";
import { dayAndTime } from "./format";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";

export const BEFORE_OPTIONS = ["Personal care or bathing", "Mealtime", "Noise or crowding", "Seemed in pain", "Change in routine", "Visitor or phone call", "Nothing noticed", "Other"];
const EARLIER = [0, 5, 15, 30, 60]; // minutes before the log was made

const hhmm = (t: number) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** A clock time typed for a log: the same day it was logged, or the day before if that time came after the log. */
export function fromClock(value: string, loggedAt: number) {
  const [h, m] = value.split(":").map(Number);
  const d = new Date(loggedAt);
  d.setHours(h, m, 0, 0);
  return d.getTime() > loggedAt ? d.getTime() - DAY_MS : d.getTime();
}

interface Props {
  obs: (StoredObservation & { id: number }) | null;
  viaKeyboard: boolean;
  onPatch: (change: Partial<StoredObservation>) => void;
  onDelete: (reason: string, note?: string) => void;
  onClose: () => void;
}

export function LogSheet({ obs, viaKeyboard, onPatch, onDelete, onClose }: Props) {
  const item = obs ? ITEMS[obs.itemId - 1] : null;
  const minutesBefore = obs ? Math.round((obs.loggedAt - obs.at) / 60_000) : 0;
  const noteWanted = useRef(false); // set by tapping Other, so reopening a log does not jump to the note
  const [deleting, setDeleting] = useState(false); // the reason-and-confirm step
  const [reason, setReason] = useState<string | null>(null);
  const [reasonNote, setReasonNote] = useState("");
  const reasons = useRef<HTMLDivElement>(null);
  const deleteByKey = useRef(false);
  // Another log, or the sheet closing, always starts back at the details.
  useEffect(() => { setDeleting(false); setReason(null); setReasonNote(""); }, [obs?.id]);
  // The button pressed is gone once the step changes, so focus moves into the new step: the
  // first reason from the keyboard, else the dialog itself (no stray focus ring on a tap, F-14).
  const sheetRoot = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (deleting) sheetRoot.current = reasons.current?.closest("dialog") ?? null;
    const target = deleting && deleteByKey.current ? reasons.current?.querySelector<HTMLElement>(".choice") : sheetRoot.current;
    target?.focus({ preventScroll: true });
  }, [deleting]);
  const canDelete = reason !== null && (reason !== "Other" || reasonNote.trim() !== "");

  return (
    <Sheet
      open={!!obs}
      viaKeyboard={viaKeyboard}
      keyboardFocus=".log-sheet input[type='time']"
      className="log-sheet"
      title={deleting ? "Delete this log?" : item?.name ?? ""}
      subtitle={obs && <>{deleting ? `${item?.name} · ` : ""}{obs.patientId} · logged {dayAndTime(obs.loggedAt)}</>}
      headerClose={false}
      footer={obs && (deleting ? <>
        <button className="ghost" onClick={() => setDeleting(false)}>Keep log</button>
        <button className="danger" disabled={!canDelete} onClick={() => reason && onDelete(reason, reason === "Other" ? reasonNote : undefined)}>Delete log</button>
      </> : <>
        <button className="text-danger" onClick={(e) => { deleteByKey.current = e.detail === 0; setDeleting(true); }}><Icon name="trash" size={18} /> Delete log</button>
        <button className="sheet-done" onClick={onClose}>Done</button>
      </>)}
      onClose={onClose}
    >
      {obs && deleting && (
        <div className="sheet-scroll">
          <section className="form-group" aria-labelledby="ls-why">
            <h3 className="form-label" id="ls-why">Why are you deleting it?</h3>
            <div className="choice-grid" ref={reasons}>
              {DELETE_REASONS.map((r) => (
                <button key={r} className="choice" aria-pressed={reason === r} onClick={() => { noteWanted.current = r === "Other"; setReason(r); }}>
                  <span>{r}</span>
                  {reason === r && <Icon name="check" size={18} />}
                </button>
              ))}
            </div>
            {reason === "Other" && (
              <label className="other-note">
                <span>What was wrong with it?</span>
                <input
                  type="text"
                  ref={(el) => {
                    if (el && noteWanted.current) {
                      noteWanted.current = false;
                      el.focus({ preventScroll: true });
                      el.scrollIntoView({ block: "nearest" });
                    }
                  }}
                  value={reasonNote}
                  maxLength={120}
                  placeholder="A few words, no names"
                  autoComplete="off"
                  enterKeyHint="done"
                  onChange={(e) => setReasonNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                />
              </label>
            )}
          </section>
          <p className="muted">The log stops counting toward scores. It is kept with your reason, so the research team can see every change.</p>
        </div>
      )}
      {obs && !deleting && (
        <div className="sheet-scroll">
          <section className="form-group" aria-labelledby="ls-when">
            <h3 className="form-label" id="ls-when">When it happened</h3>
            <div className="form-card">
              <label className="form-row">
                <span>Time</span>
                {/* A tinted pill with a clock, so it reads as tappable; iOS shows a bare time otherwise (F-16). */}
                <span className="time-pill">
                  <Icon name="clock" size={18} />
                  <input type="time" value={hhmm(obs.at)} onChange={(e) => e.target.value && onPatch({ at: fromClock(e.target.value, obs.loggedAt) })} />
                </span>
              </label>
              <div className="form-row stacked">
                <span id="ls-earlier" className="form-hint">How long before you logged it</span>
                <div className="quick-times" role="group" aria-labelledby="ls-earlier">
                  {EARLIER.map((m) => (
                    <button
                      key={m}
                      className={minutesBefore === m ? "on" : undefined}
                      aria-pressed={minutesBefore === m}
                      aria-label={m === 0 ? "When I logged it" : `${m === 60 ? "1 hr" : `${m} min`} before logging`}
                      onClick={() => onPatch({ at: obs.loggedAt - m * 60_000 })}
                    >
                      {m === 0 ? "At log" : m === 60 ? "1 hr" : `${m} min`}
                    </button>
                  ))}
                </div>
              </div>
              <label className="form-row">
                <span>Time is approximate</span>
                <input type="checkbox" role="switch" className="switch" checked={!!obs.approx} onChange={(e) => onPatch({ approx: e.target.checked })} />
              </label>
            </div>
          </section>

          <section className="form-group" aria-labelledby="ls-before">
            <h3 className="form-label" id="ls-before">What happened just before <span className="muted">Optional</span></h3>
            <div className="choice-grid">
              {BEFORE_OPTIONS.map((o) => (
                <button key={o} className="choice" aria-pressed={obs.before === o} onClick={() => { noteWanted.current = o === "Other" && obs.before !== o; onPatch({ before: obs.before === o ? undefined : o, beforeNote: undefined }); }}>
                  <span>{o}</span>
                  {obs.before === o && <Icon name="check" size={18} />}
                </button>
              ))}
            </div>
            {obs.before === "Other" && (
              <label className="other-note">
                <span>What happened?</span>
                <input
                  type="text"
                  ref={(el) => {
                    // Right after Other is tapped: bring the field above the action row and open the keyboard.
                    if (el && noteWanted.current) {
                      noteWanted.current = false;
                      el.focus({ preventScroll: true });
                      el.scrollIntoView({ block: "nearest" });
                    }
                  }}
                  value={obs.beforeNote ?? ""}
                  maxLength={120}
                  placeholder="A few words, no names"
                  autoComplete="off"
                  enterKeyHint="done"
                  onChange={(e) => onPatch({ beforeNote: e.target.value || undefined })}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                />
              </label>
            )}
          </section>
        </div>
      )}
    </Sheet>
  );
}
