// Screen 3: the day-14 check. The app shows what it worked out from the logs;
// the caregiver confirms or corrects each one. This keeps the look-back step the
// CMAI was validated with, and is the only place to record codes 8 and 9 (manual p.3).

import { useState } from "react";
import { RATING_LABELS } from "../scoring/engine";
import { GROUP_LABELS, ITEMS, type FactorGroup } from "../scoring/items";
import { db, reviewKey } from "../data/db";
import type { ScoredWindow } from "./useCmaiData";
import { shortDate, windowLabel } from "./format";
import { SectionNav } from "./SectionNav";

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
      <label className="period-pick">
        Period to review
        <select value={pick} onChange={(e) => { setPick(Number(e.target.value)); setSaved(false); }}>
          {finished.map(({ w, i }) => <option key={i} value={i}>{windowLabel(w.score.windowStart, w.score.windowEnd, i)}</option>)}
        </select>
      </label>
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
          <ul className="review-list">
            {ITEMS.filter((item) => item.group === g).map((item) => {
              const s = score.items[item.id - 1];
              const chosen = review[item.id];
              const changed = chosen !== undefined && chosen !== s.rating;
              return (
                <li key={item.id} className={changed ? "changed" : ""}>
                  <div>
                    <b>{item.id}. {item.name}</b>
                    <span className="muted"> · logged {s.count}× · app says {s.rating} ({RATING_LABELS[s.rating]})</span>
                  </div>
                  <select aria-label={`Rating for ${item.name}`} value={chosen ?? ""} onChange={(e) => choose(item.id, e.target.value)}>
                    <option value="">Not reviewed (use {s.rating})</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => (
                      <option key={r} value={r}>{r} · {RATING_LABELS[r]}{r === s.rating ? " (matches app)" : ""}</option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {reviewedCount < 29 && <button onClick={confirmAll}>Confirm the other {29 - reviewedCount} as the app rated them</button>}
    </div>
  );
}
