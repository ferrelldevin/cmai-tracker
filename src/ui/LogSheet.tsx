// Log details: the one place a log's time and context are changed, reached from the
// confirmation's Edit and from Recent logs. Changes save as they are made, so closing
// the sheet any way loses nothing. Design note: docs/design/notes/003-log-confirmation.md.

import type { StoredObservation } from "../data/db";
import { DAY_MS } from "../scoring/engine";
import { ITEMS } from "../scoring/items";
import { dayAndTime } from "./format";
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
  onDelete: () => void;
  onClose: () => void;
}

export function LogSheet({ obs, viaKeyboard, onPatch, onDelete, onClose }: Props) {
  const item = obs ? ITEMS[obs.itemId - 1] : null;
  const minutesBefore = obs ? Math.round((obs.loggedAt - obs.at) / 60_000) : 0;

  return (
    <Sheet
      open={!!obs}
      viaKeyboard={viaKeyboard}
      keyboardFocus=".log-sheet .chip"
      className="log-sheet"
      title={item?.name ?? ""}
      subtitle={obs && <>{obs.patientId} · logged {dayAndTime(obs.loggedAt)}</>}
      onClose={onClose}
    >
      {obs && (
        <>
          <div className="sheet-scroll">
            <fieldset className="sheet-field">
              <legend>When did it happen?</legend>
              <div className="chip-wrap">
                {EARLIER.map((m) => (
                  <button key={m} className={minutesBefore === m ? "chip on" : "chip"} aria-pressed={minutesBefore === m} onClick={() => onPatch({ at: obs.loggedAt - m * 60_000 })}>
                    {m === 0 ? "When I logged it" : m === 60 ? "1 hr before" : `${m} min before`}
                  </button>
                ))}
              </div>
              <label className="inline-field">
                Or a time
                <input type="time" value={hhmm(obs.at)} onChange={(e) => e.target.value && onPatch({ at: fromClock(e.target.value, obs.loggedAt) })} />
              </label>
              <label className="inline-field">
                <input type="checkbox" checked={!!obs.approx} onChange={(e) => onPatch({ approx: e.target.checked })} /> Time is approximate
              </label>
            </fieldset>
            <fieldset className="sheet-field">
              <legend>What happened just before? <span className="muted">Optional</span></legend>
              <div className="chip-wrap">
                {BEFORE_OPTIONS.map((o) => (
                  <button key={o} className={obs.before === o ? "chip on" : "chip"} aria-pressed={obs.before === o} onClick={() => onPatch({ before: obs.before === o ? undefined : o })}>
                    {o}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="sheet-actions">
            <button className="ghost danger-text" onClick={onDelete}>Delete log</button>
            <button onClick={onClose}>Done</button>
        </div>
        </>
      )}
    </Sheet>
  );
}
