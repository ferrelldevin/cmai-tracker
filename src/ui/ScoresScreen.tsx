// Screen 2: results, one 14-day period at a time (design note 006). The top of a period
// answers what the reader came for: is the patient agitated, which behaviors drove it,
// better or worse than last period, and how much data the numbers rest on. Detail sits
// below behind the section bar. Every period side by side is its own page ("All periods").

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { meaningfulChanges, RATING_LABELS } from "../scoring/engine";
import { GROUP_LABELS, ITEMS } from "../scoring/items";
import type { CheckIn, StoredObservation } from "../data/db";
import type { ScoredWindow } from "./useCmaiData";
import { changeText, periodIndex, periodView, type BehaviorRow, type PeriodView } from "./periodView";
import { shortDate, windowLabel } from "./format";
import { Icon } from "./Icon";
import { SectionNav, type Section } from "./SectionNav";

const periodSections: Section[] = [
  { id: "sc-summary", label: "Summary" },
  { id: "sc-behaviors", label: "Behaviors" },
  { id: "sc-time", label: "Time of day" },
  { id: "sc-groups", label: "Groups" },
  { id: "sc-total", label: "Total" },
];
const allSections: Section[] = [
  { id: "sa-behaviors", label: "Behaviors" },
  { id: "sa-groups", label: "Groups" },
  { id: "sa-total", label: "Total" },
];

const GROUPS = ["aggressive", "physical", "verbal"] as const;
const SERIES = { aggressive: "var(--series-1)", physical: "var(--series-2)", verbal: "var(--series-3)" } as const;
// A line pattern per group as well as a color, so the lines stay apart without color vision.
const DASH = { aggressive: undefined, physical: "7 4", verbal: "2 4" } as const;
const TOP = 5; // behaviors listed in the summary

interface Props {
  windows: ScoredWindow[];
  observations: StoredObservation[];
  checkins: CheckIn[];
  view: "period" | "all";
  period?: number; // 1-based, from the URL
  onPeriod: (period: number) => void;
  onAll: () => void;
  onBack: () => void;
  onLog: () => void;
  onReview: () => void;
}

export function ScoresScreen(props: Props) {
  const { windows, observations, checkins } = props;
  if (!windows.length || (!observations.length && !checkins.length)) {
    return (
      <div className="empty">
        <p><b>No logs yet for this patient.</b></p>
        <p>Scores appear here once a behavior or a quiet day is logged. Ratings for a period are final after its 14 days end.</p>
        <button onClick={props.onLog}><Icon name="plus" /> Go to Log</button>
      </div>
    );
  }
  return props.view === "all" ? <AllPeriods {...props} /> : <OnePeriod {...props} />;
}

// ---------- One period ----------

function OnePeriod({ windows, observations, checkins, period, onPeriod, onAll, onReview }: Props) {
  const [showAll, setShowAll] = useState(false);
  const v = periodView(windows, periodIndex(windows, period), checkins.map((c) => c.day));
  const { index, window: w } = v;
  const n = index + 1;
  const open = w.score.provisional;

  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${(h % 12) || 12}${h < 12 ? "a" : "p"}`, count: 0 }));
  for (const o of observations) {
    if (o.at >= w.score.windowStart && o.at < w.score.windowEnd) hours[new Date(o.at).getHours()].count++;
  }

  const listed = showAll ? v.rows.filter((r) => r.rating <= 7) : [...v.seen, ...v.stopped];

  return (
    <div className="scores">
      <div className="period-step">
        <button className="ghost icon-btn" aria-label="Previous period" disabled={index === 0} onClick={() => onPeriod(n - 1)}>
          <Icon name="chevron" size={22} className="back-icon" />
        </button>
        <div className="period-step-label" aria-live="polite">
          <b>Period {n}</b>
          {open && <span className="tag">in progress</span>}
          <span className="muted">{shortDate(w.score.windowStart)} to {shortDate(w.score.windowEnd - 1)} · {n} of {windows.length}</span>
        </div>
        <button className="ghost icon-btn" aria-label="Next period" disabled={index === windows.length - 1} onClick={() => onPeriod(n + 1)}>
          <Icon name="chevron" size={22} className="fwd-icon" />
        </button>
      </div>
      <div className="period-sub">
        <p className="muted">CMAI-based, app-derived ratings.</p>
        <button className="ghost small" onClick={onAll}>All periods <Icon name="chevron" size={18} className="fwd-icon" /></button>
      </div>

      <SectionNav label="Jump to a section" sections={periodSections} />

      <section className="card" id="sc-summary">
        <h2>Period {n} at a glance</h2>
        {open && (
          <p className="note">
            Still in progress: {w.elapsed ? `numbers so far, from ${w.elapsed} of 14 days.` : "this period started today."} They are final, and compared with the period before, once it ends on {shortDate(w.score.windowEnd)}.
          </p>
        )}
        <div className="status-row compact" role="group" aria-label="Agitation status (manual rules, p.5 to 6)">
          {GROUPS.map((g) => (
            <div key={g} className={w.summary.agitated[g] ? "status warn" : "status ok"}>
              <Icon name={w.summary.agitated[g] ? "alert" : "check"} className="status-icon" />
              <b>{GROUP_LABELS[g]}</b>
              <span className="status-state">{w.summary.agitated[g] ? "Meets agitated rule" : "Below threshold"}</span>
            </div>
          ))}
        </div>

        <h3 className="sub-h">Most frequent this period</h3>
        {v.seen.length ? (
          <ul className="beh-list">
            {v.seen.slice(0, TOP).map((r) => <BehaviorLine key={r.item.id} row={r} open={open} />)}
          </ul>
        ) : (
          <p className="muted">No behaviors were logged in this period.</p>
        )}
        {v.seen.length > TOP && <p className="muted">{v.seen.length - TOP} more in <a href="#sc-behaviors" onClick={(e) => jumpTo(e, "sc-behaviors")}>Behaviors</a>.</p>}

        <dl className="coverage">
          <div>
            <dt>Days covered</dt>
            <dd>{w.elapsed ? `${w.elapsed - w.unlogged} of ${w.elapsed}${w.elapsed < 14 ? " so far" : ""}` : "None ended yet"}</dd>
          </div>
          <div>
            <dt>Quiet-day check-ins</dt>
            <dd>{v.quietDays}</dd>
          </div>
          <div>
            <dt>Day-14 review</dt>
            <dd>{open ? "After the period ends" : v.reviewed ? `${v.reviewed} of 29 checked` : "Not done yet"}</dd>
          </div>
        </dl>
        {w.unlogged > 0 && (
          <p className="note">{w.unlogged} {w.unlogged === 1 ? "day has" : "days have"} no log and no "nothing to log today" check-in. Those days count as unknown, not as zero, so ratings may read low.</p>
        )}
        {!open && v.reviewed < 29 && (
          <button className="ghost small" onClick={onReview}><Icon name="review" size={18} /> {v.reviewed ? "Finish the review" : "Start the review"}</button>
        )}
      </section>

      <section className="card" id="sc-behaviors">
        <h2>Each behavior, period {n} <span className="tag">app-derived</span></h2>
        <p className="muted">1 = never, 7 = several times an hour. {open ? "Compared with last period once this one ends." : "↑ or ↓ marks a change worth noticing: 2 or more points from last period, or 1 point the same way two periods running. A single 1-point move is within how much two raters can differ (manual p.7), so it reads \"about the same\"."}</p>
        {listed.length ? (
          <ul className="beh-list">
            {listed.map((r) => <BehaviorLine key={r.item.id} row={r} open={open} />)}
          </ul>
        ) : (
          <p className="muted">No behaviors were logged in this period or the one before.</p>
        )}
        {v.codes.length > 0 && (
          <p className="muted">Coded at review, left out of sums: {v.codes.map((r) => `#${r.item.id} ${r.item.name} (${RATING_LABELS[r.rating]})`).join("; ")}.</p>
        )}
        <button className="ghost" onClick={() => setShowAll(!showAll)}>{showAll ? "Show only behaviors seen" : "Show all 29 behaviors"}</button>
      </section>

      <section className="card" id="sc-time">
        <h2>Time of day, period {n}</h2>
        <p className="muted">When behaviors were logged. A late-day peak can point to a trigger worth changing before reaching for medication.</p>
        <div className="chart">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hours} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--text-muted)" tickLine={false} interval={2} />
              <YAxis allowDecimals={false} stroke="var(--text-muted)" tickLine={false} />
              <Tooltip cursor={{ fill: "var(--hover)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--rule)", color: "var(--text)" }} formatter={(val) => [val, "Logs"]} />
              <Bar dataKey="count" name="Logs" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card" id="sc-groups">
        <h2>Group averages, period {n}</h2>
        <p className="muted">Mean of the 1 to 7 ratings in each group (manual factors, p.7).</p>
        <table className="compare">
          <thead>
            <tr><th scope="col">Group</th><th scope="col">Period {n}</th><th scope="col">{v.prev ? `Period ${n - 1}` : "Before"}</th></tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <tr key={g}>
                <th scope="row">{GROUP_LABELS[g]}</th>
                <td>{w.summary.factors[g].mean.toFixed(1)}</td>
                <td>{v.prev ? v.prev.summary.factors[g].mean.toFixed(1) : "none"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="ghost small" onClick={onAll}>Trend across all periods <Icon name="chevron" size={18} className="fwd-icon" /></button>
      </section>

      <section className="card" id="sc-total">
        <h2>Total score <span className="tag">secondary</span></h2>
        <p className="big-num">{w.summary.total}<span className="muted"> of 203{v.prev ? ` · period ${n - 1}: ${v.prev.summary.total}` : ""}</span></p>
        <p className="muted">Sum of all 29 CMAI-based ratings (29 to 203). Shown because the lab asked. The manual (p.5) says a total on its own "is not useful", so read it with the behaviors above.</p>
        {!open && v.prev && <p className="note">{changedLine(v)}</p>}
      </section>
    </div>
  );
}

function BehaviorLine({ row, open }: { row: BehaviorRow; open: boolean }) {
  const ch = changeText(row, open);
  return (
    <li className="beh">
      <span className={`rv-cell small r${row.rating}${open ? " unchecked" : ""}`} aria-hidden>{row.rating}</span>
      <span className="beh-text">
        <span className="beh-name">{row.item.id}. {row.item.name}</span>
        <span className="beh-meta">
          {row.count} logged · {ch}
          {row.change && <span className={row.change === "up" ? "chg up" : "chg"} aria-hidden> {row.change === "up" ? "↑" : "↓"}</span>}
          {row.reviewed && <span className="beh-reviewed"> · {row.rating === row.derived ? "confirmed at review" : `set at review, app said ${row.derived}`}</span>}
        </span>
        <span className="sr">, rated {row.rating}, {RATING_LABELS[row.rating]}</span>
      </span>
    </li>
  );
}

// Totals often fall with no change in treatment, so say which behaviors moved.
function changedLine(v: PeriodView) {
  const moved = v.rows.filter((r) => r.change);
  if (!moved.length) return `No behavior changed enough to mark since period ${v.index}. Read any change in the total with that in mind.`;
  return `Behaviors that changed since period ${v.index}: ${moved.map((r) => `#${r.item.id} ${r.item.name} (${r.change === "up" ? "more often" : "less often"})`).join("; ")}.`;
}

function jumpTo(e: React.MouseEvent, id: string) {
  // Use the section bar's own jump, so the section lands under the pinned bars.
  const chip = document.querySelector<HTMLElement>(`.section-nav [data-section="${id}"]`);
  if (!chip) return;
  e.preventDefault();
  chip.click();
}

// ---------- All periods ----------

function AllPeriods({ windows, onPeriod, onBack }: Props) {
  const [showAll, setShowAll] = useState(false);
  const rows = ITEMS.filter((i) => showAll || windows.some((w) => w.finals[i.id] > 1));
  const finished = windows.filter((w) => !w.score.provisional);
  const changes = new Map(ITEMS.map((i) => [i.id, meaningfulChanges(finished.map((w) => w.finals[i.id]))]));

  // Trend lines use finished periods only: a period still in progress has
  // fewer days of logs, so it would always look like an improvement.
  const trend = finished.map((w, i) => ({
    name: `P${i + 1}`,
    aggressive: +w.summary.factors.aggressive.mean.toFixed(2),
    physical: +w.summary.factors.physical.mean.toFixed(2),
    verbal: +w.summary.factors.verbal.mean.toFixed(2),
    total: w.summary.total,
  }));
  // Round steps (5, 10 or 20) so the total axis reads 45, 50, 55 rather than 44, 48, 52, 59.
  const totalAxis = niceAxis(trend.map((t) => t.total));

  return (
    <div className="scores">
      <div className="page-head">
        <button className="back-btn ghost small" onClick={onBack}><Icon name="chevron" size={20} className="back-icon" /> Scores</button>
        <p className="screen-title" aria-hidden>All periods</p>{/* the screen heading is the h1 in App */}
      </div>
      <p className="muted">Every period side by side. Tap a period to open it.</p>
      <SectionNav label="Jump to a chart" sections={allSections} />

      <section className="card" id="sa-behaviors">
        <h2>Each behavior, period by period <span className="tag">app-derived</span></h2>
        <p className="muted">1 = never, 7 = several times an hour. Stronger color means more often. ↑ or ↓ marks a change worth noticing (2+ points, or 1 point the same way twice).</p>
        <div className="heat-wrap">
          <table className="heat">
            <thead>
              <tr>
                <th scope="col">Behavior</th>
                {windows.map((w, i) => (
                  <th key={i} scope="col" className={w.score.provisional ? "open" : ""}>
                    <button className="col-btn" onClick={() => onPeriod(i + 1)} title={`Open ${windowLabel(w.score.windowStart, w.score.windowEnd, i)}`}>
                      P{i + 1}
                      <span className="sub">{w.score.provisional ? "so far" : shortDate(w.score.windowStart)}</span>
                      <span className="sr">, open period {i + 1}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="unlogged-row">
                <th scope="row">Unlogged days</th>
                {windows.map((w, i) => (
                  <td key={i} className={w.unlogged ? "gap" : ""} title={`${w.unlogged} of ${w.elapsed} finished days with no log and no "nothing to log" check-in`}>
                    {w.unlogged}
                  </td>
                ))}
              </tr>
              {rows.map((item) => (
                <tr key={item.id}>
                  <th scope="row">{item.id}. {item.name}</th>
                  {windows.map((w, i) => {
                    const r = w.finals[item.id];
                    const s = w.score.items[item.id - 1];
                    const reviewed = item.id in w.review;
                    const ch = changes.get(item.id)?.[i];
                    return (
                      <td key={i} className={`r r${r}${w.score.provisional ? " open" : ""}`} title={`${RATING_LABELS[r]} · ${s.count} logged${reviewed ? " · set at review" : ""}${w.score.provisional ? " · period not finished" : ""}${ch ? ` · changed (${ch === "up" ? "more often" : "less often"})` : ""}`}>
                        {r}
                        {ch && (
                          <span className="chg">
                            <span aria-hidden>{ch === "up" ? "↑" : "↓"}</span>
                            <span className="sr">{ch === "up" ? "changed, more often" : "changed, less often"}</span>
                          </span>
                        )}
                        {reviewed && <span className="dot" aria-label="set at review">•</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="ghost" onClick={() => setShowAll(!showAll)}>{showAll ? "Hide behaviors never seen" : "Show all 29 behaviors"}</button>
      </section>

      <section className="card" id="sa-groups">
        <h2>Average rating by behavior group</h2>
        <p className="muted">Finished periods only. Mean of the 1 to 7 ratings in each group (manual factors, p.7).</p>
        {trend.length ? (
          <div className="chart">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
                <YAxis domain={[1, 7]} ticks={[1, 2, 3, 4, 5, 6, 7]} interval={0} stroke="var(--text-muted)" tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--rule)", color: "var(--text)" }} />
                <Legend />
                {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map((k) => (
                  <Line key={k} type="monotone" dataKey={k} name={GROUP_LABELS[k]} stroke={SERIES[k]} strokeWidth={2.5} strokeDasharray={DASH[k]} dot={{ r: 4, strokeDasharray: "" }} activeDot={{ r: 6 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="muted">The trend starts once the first period has ended.</p>
        )}
      </section>

      <section className="card" id="sa-total">
        <h2>Total score <span className="tag">secondary</span><span className="tag">app-derived</span></h2>
        <p className="muted">Sum of all 29 CMAI-based ratings (29 to 203). The manual (p.5) says a total on its own "is not useful", so read it with the behaviors above.</p>
        <p className="note">Totals often fall over time without any change in treatment, so check which behaviors drove a change before crediting it.</p>
        {trend.length ? (
          <div className="chart">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
                <YAxis stroke="var(--text-muted)" tickLine={false} domain={totalAxis.domain} ticks={totalAxis.ticks} interval={0} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--rule)", color: "var(--text)" }} />
                <Line type="monotone" dataKey="total" name="Total" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="muted">The trend starts once the first period has ended.</p>
        )}
      </section>
    </div>
  );
}

/** A padded axis on round numbers, within the possible 29 to 203 total. */
function niceAxis(values: number[]) {
  if (!values.length) return { domain: [29, 203] as [number, number], ticks: undefined };
  const lo = Math.min(...values), hi = Math.max(...values);
  const step = [5, 10, 20, 50].find((s) => (hi - lo) / s <= 4) ?? 50;
  const min = Math.max(0, Math.floor((lo - 1) / step) * step);
  const max = Math.ceil((hi + 1) / step) * step;
  const ticks: number[] = [];
  for (let t = min; t <= max; t += step) ticks.push(t);
  return { domain: [min, max] as [number, number], ticks };
}
