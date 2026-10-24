// Log details: the one place a log's time and context are changed, reached from the
// confirmation's Edit and from Recent logs. Changes save as they are made, so the header
// says Done and closing the sheet any way loses nothing. Laid out as grouped form rows,
// the pattern of iOS and Material settings sheets. Design note: docs/design/notes/003-log-confirmation.md.

import type { StoredObservation } from "../data/db";
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
      keyboardFocus=".log-sheet input[type='time']"
      className="log-sheet"
      title={item?.name ?? ""}
      subtitle={obs && <>{obs.patientId} · logged {dayAndTime(obs.loggedAt)}</>}
      closeLabel="Done"
      closePrimary
      onClose={onClose}
    >
      {obs && (
        <div className="sheet-scroll">
          <section className="form-group" aria-labelledby="ls-when">
            <h3 className="form-label" id="ls-when">When it happened</h3>
            <div className="form-card">
              <label className="form-row">
                <span>Time</span>
                <input type="time" value={hhmm(obs.at)} onChange={(e) => e.target.value && onPatch({ at: fromClock(e.target.value, obs.loggedAt) })} />
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
                <button key={o} className="choice" aria-pressed={obs.before === o} onClick={() => onPatch({ before: obs.before === o ? undefined : o })}>
                  <span>{o}</span>
                  {obs.before === o && <Icon name="check" size={18} />}
                </button>
              ))}
            </div>
          </section>

          <button className="text-danger" onClick={onDelete}><Icon name="trash" size={18} /> Delete log</button>
        </div>
      )}
    </Sheet>
  );
}
