// Screen 3: the day-14 check. The app shows what it worked out from the logs;
// the caregiver confirms or corrects each one. This keeps the look-back step the
// CMAI was validated with, and is the only place to record codes 8 and 9 (manual p.3).
// Each behavior is a row showing the rating in the same colors as Scores; a tap opens a
// rating sheet instead of the phone's native menu (F-18, design note 005).

import { useEffect, useRef, useState } from "react";
import { RATING_LABELS } from "../scoring/engine";
import { GROUP_LABELS, ITEMS, type FactorGroup } from "../scoring/items";
import { db, reviewKey } from "../data/db";
import type { ScoredWindow } from "./useCmaiData";
import { shortDate, windowLabel } from "./format";
import { Icon } from "./Icon";
import { SectionNav } from "./SectionNav";
import { Sheet } from "./Sheet";

// Same grouping and order as the Log screen, so items are where people expect them.
const GROUP_ORDER: FactorGroup[] = ["aggressive", "physical", "verbal", "other"];
const short = (g: FactorGroup) => GROUP_LABELS[g].split(/[ ,]/)[0];

interface Props {
  patientId: string;
  windows: ScoredWindow[];
  onChange: () => void;
}

export function ReviewScreen({ patientId, windows, onChange }: Props) {
  const finished = windows.map((w, i) => ({ w, i })).filter(({ w }) => !w.score.provisional);
  const [pick, setPick] = useState(finished.length ? finished[finished.length - 1].i : -1);
  const [saved, setSaved] = useState(false);
  const [rating, setRating] = useState<{ itemId: number; viaKeyboard: boolean } | null>(null);
  const chips = useRef<HTMLDivElement>(null);
  // The latest finished period is picked first, so bring its chip into view, as Scores does.
  useEffect(() => {
    chips.current?.querySelector<HTMLElement>("[aria-selected=true]")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pick]);
  if (!finished.length) {
    const opens = windows[0]?.score.windowEnd;
    return (
      <div className="empty">
        <p><b>Nothing to review yet.</b></p>
        <p>The first 14-day period is still running. Review opens on day 15{opens ? `, ${shortDate(opens)}` : ""}. Until then, keep logging.</p>
      </div>
    );
  }

  const { score, review } = windows[pick];

  async function choose(itemId: number, value: string) {
    const key = reviewKey(patientId, score.windowStart, itemId);
    const derived = score.items[itemId - 1].rating;
    if (value === "") await db.reviews.delete(key);
    else await db.reviews.put({ key, patientId, windowStart: score.windowStart, itemId, choice: Number(value), derived, reviewedAt: Date.now() });
    setSaved(true);
    setRating(null);
    onChange();
  }

  async function confirmAll() {
    await db.reviews.bulkPut(
      score.items
        .filter((s) => !(s.itemId in review))
        .map((s) => ({ key: reviewKey(patientId, score.windowStart, s.itemId), patientId, windowStart: score.windowStart, itemId: s.itemId, choice: s.rating, derived: s.rating, reviewedAt: Date.now() })),
    );
    setSaved(true);
    onChange();
  }

  const reviewedCount = Object.keys(review).length;
  // Each chip shows how far the group is, so the bar doubles as a to-do list.
  const sections = GROUP_ORDER.map((g) => {
    const items = ITEMS.filter((i) => i.group === g);
    const done = items.filter((i) => i.id in review).length;
    return { id: `rv-${g}`, label: short(g), detail: `${done}/${items.length}`, ariaLabel: `${GROUP_LABELS[g]}, ${done} of ${items.length} reviewed` };
  });

  return (
    <div className="review">
      <div className="period-chips" ref={chips} role="tablist" aria-label="Period to review">
        {finished.map(({ w, i }) => (
          <button key={i} role="tab" aria-selected={i === pick} className={i === pick ? "chip on" : "chip"} onClick={() => { setPick(i); setSaved(false); }}>
            {windowLabel(w.score.windowStart, w.score.windowEnd, i)}
          </button>
        ))}
      </div>
      <p className="hint">
        The app's ratings are CMAI-based (app-derived): worked out from your logs. Look back over these two weeks. Does each rating match what you saw? Change it if not. Use <b>8</b> if the behavior would have happened but was prevented (for example, restrained), and <b>9</b> if it cannot happen (for example, cannot walk, so cannot pace).
      </p>
      <div className="progress-line" role="status">
        <span>{reviewedCount === 29 ? "✓ All 29 reviewed" : `${reviewedCount} of 29 reviewed`}{saved ? " · saved" : ""}</span>
        <progress max={29} value={reviewedCount} aria-hidden />
      </div>
      <SectionNav label="Jump to a group" sections={sections} />
      {GROUP_ORDER.map((g) => (
        <section key={g} id={`rv-${g}`} className="group" aria-labelledby={`rv-${g}-h`}>
          <h2 className="group-title" id={`rv-${g}-h`}>{GROUP_LABELS[g]}</h2>
          <ul className="item-list review-list">
            {ITEMS.filter((item) => item.group === g).map((item) => {
              const s = score.items[item.id - 1];
              const chosen = review[item.id];
              const shown = chosen ?? s.rating;
              const changed = chosen !== undefined && chosen !== s.rating;
              return (
                <li key={item.id} className="item">
                  <button
                    className="item-btn review-btn"
                    aria-label={`${item.id}. ${item.name}. App says ${s.rating}, ${RATING_LABELS[s.rating]}. ${chosen === undefined ? "Not checked yet" : changed ? `You changed it to ${chosen}, ${RATING_LABELS[chosen]}` : "Confirmed"}`}
                    onClick={(e) => setRating({ itemId: item.id, viaKeyboard: e.detail === 0 })}
                  >
                    <span className={`rv-cell r${shown}${chosen === undefined ? " unchecked" : ""}`} aria-hidden>{shown}</span>
                    <span className="item-text" aria-hidden>
                      <span className="item-name">{item.id}. {item.name}</span>
                      <span className="item-def">Logged {s.count}× · app says {s.rating}, {RATING_LABELS[s.rating].toLowerCase()}</span>
                      <span className={chosen === undefined ? "rv-state" : changed ? "rv-state changed" : "rv-state done"}>
                        {chosen === undefined ? "Not checked yet" : changed ? <>Changed to {RATING_LABELS[chosen].toLowerCase()}</> : <><Icon name="check" size={14} /> Confirmed</>}
                      </span>
                    </span>
                    <Icon name="chevron" size={20} className="fwd-icon" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {reviewedCount < 29 && <button onClick={confirmAll}>Confirm the other {29 - reviewedCount} as the app rated them</button>}
      <RatingSheet
        open={rating}
        item={rating ? ITEMS[rating.itemId - 1] : null}
        appRating={rating ? score.items[rating.itemId - 1].rating : 1}
        count={rating ? score.items[rating.itemId - 1].count : 0}
        chosen={rating ? review[rating.itemId] : undefined}
        period={pick + 1}
        onChoose={(v) => rating && choose(rating.itemId, v)}
        onClose={() => setRating(null)}
      />
    </div>
  );
}

interface RatingProps {
  open: { itemId: number; viaKeyboard: boolean } | null;
  item: (typeof ITEMS)[number] | null;
  appRating: number;
  count: number;
  chosen: number | undefined;
  period: number;
  onChoose: (value: string) => void;
  onClose: () => void;
}

/** One rating, picked from all nine answers in a sheet. A tap saves and closes; the app's own rating is marked. */
function RatingSheet({ open, item, appRating, count, chosen, period, onChoose, onClose }: RatingProps) {
  const current = chosen ?? appRating;
  return (
    <Sheet
      open={!!open}
      viaKeyboard={open?.viaKeyboard ?? false}
      keyboardFocus={`.rating-opt[data-value="${current}"]`}
      className="rating-sheet"
      title={item ? `${item.id}. ${item.name}` : ""}
      subtitle={item && <>Period {period} · logged {count}× · app says {appRating}</>}
      headerClose={false}
      footer={open && <>
        {chosen !== undefined ? <button className="text-quiet" onClick={() => onChoose("")}>Clear my check</button> : <span />}
        <button className="ghost" onClick={onClose}>Cancel</button>
      </>}
      onClose={onClose}
    >
      {open && (
        <div className="sheet-scroll">
          <div className="rating-opts" role="group" aria-label="Rating for the two weeks">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => (
              <button key={r} className="choice rating-opt" data-value={r} aria-pressed={chosen === r} onClick={() => onChoose(String(r))}>
                <span className={`rv-cell small r${r}`} aria-hidden>{r}</span>
                <span className="rating-label">{RATING_LABELS[r]}{r === appRating && <span className="tag">app</span>}</span>
                {chosen === r && <Icon name="check" size={18} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
