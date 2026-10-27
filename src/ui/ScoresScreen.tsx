import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { meaningfulChanges, RATING_LABELS } from "../scoring/engine";
import { GROUP_LABELS, ITEMS } from "../scoring/items";
import type { StoredObservation } from "../data/db";
import type { ScoredWindow } from "./useCmaiData";
import { shortDate, windowLabel } from "./format";
import { Icon } from "./Icon";
import { SectionNav, type Section } from "./SectionNav";
import { changeSince, periodBehaviors, selectedPeriod } from "./scoreView";

const sections: Section[] = [
  { id: "sc-total", label: "Total" },
  { id: "sc-behaviors", label: "Behaviors" },
  { id: "sc-status", label: "Status" },
  { id: "sc-patterns", label: "Patterns" },
  { id: "sc-history", label: "History" },
];
const groups = ["aggressive", "physical", "verbal"] as const;
const SERIES = { aggressive: "var(--series-1)", physical: "var(--series-2)", verbal: "var(--series-3)" };
const DASH = { aggressive: undefined, physical: "7 4", verbal: "2 4" };
const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--rule)", color: "var(--text)" };

interface Props {
  patientId: string;
  windows: ScoredWindow[];
  observations: StoredObservation[];
  hasActivity: boolean;
  period?: number; // 1-based, from the URL
  onPeriod: (period: number) => void;
  onLog: () => void;
}

export function ScoresScreen({ patientId, windows, observations, hasActivity, period, onPeriod, onLog }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const chips = useRef<HTMLDivElement>(null);
  const selected = selectedPeriod(windows, period);
  const sel = windows[selected];

  useEffect(() => {
    chips.current?.querySelector<HTMLElement>("[aria-pressed=true]")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selected, windows.length]);

  function choose(index: number) {
    const next = windows[index];
    if (!next) return;
    // The period lives in the URL, so reload, the back gesture and a shared link all keep it.
    onPeriod(index + 1);
    setHistoryOpen(false);
  }

  // Quiet-day check-ins also establish a period; no observations is not necessarily no data.
  if (!sel || !hasActivity) {
    return <div className="empty">
      <p><b>No logs yet for this patient.</b></p>
      <p>Log a behavior or record a quiet day to start seeing this patient's period scores.</p>
      <button onClick={onLog}><Icon name="plus" /> Go to Log</button>
    </div>;
  }

  const rows = periodBehaviors(sel, showAll);
  const inPeriod = observations.filter((o) => o.patientId === patientId && o.at >= sel.score.windowStart && o.at < sel.score.windowEnd);
  const finished = windows.filter((w) => !w.score.provisional);
  const changes = new Map(ITEMS.map((i) => [i.id, meaningfulChanges(finished.map((w) => w.ratings[i.id]))]));
  const hours = Array.from({ length: 24 }, (_, hour) => ({ label: `${hour % 12 || 12}${hour < 12 ? "a" : "p"}`, count: 0 }));
  inPeriod.forEach((o) => hours[new Date(o.at).getHours()].count++);
  const trend = finished.map((w, i) => ({ name: `P${i + 1}`, total: w.summary.total,
    ...Object.fromEntries(groups.map((g) => [g, w.summary.factors[g].n ? +w.summary.factors[g].mean.toFixed(2) : null])) }));
  const date = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return <div className="scores">
    <div className="score-period-heading">
      <h2>Period {selected + 1} scores</h2>
      <span className="tag">{sel.score.provisional ? "In progress · so far" : "Period ended"}</span>
    </div>
    <p className="score-range" role="status">
      {date(sel.score.windowStart)} to {date(sel.score.windowEnd - 1)}
      {/* The banner shows today's period; say so when this page shows an earlier one. */}
      {selected < windows.length - 1 && windows[windows.length - 1].score.provisional && <> · period {windows.length} is in progress</>}
    </p>
    <div className="period-controls" role="group" aria-label="Choose a score period">
      <button className="ghost icon-btn" aria-label="Previous period" disabled={selected === 0} onClick={() => choose(selected - 1)}><Icon name="chevron" size={22} className="back-icon" /></button>
      <div className="period-chips" ref={chips} role="group" aria-label="14-day period">
        {windows.map((w, i) => <button key={w.score.windowStart} aria-pressed={i === selected}
          className={i === selected ? "chip on" : "chip"} onClick={() => choose(i)}
          aria-label={`P${i + 1}, ${windowLabel(w.score.windowStart, w.score.windowEnd, i)}${w.score.provisional ? ", in progress" : ""}`}>P{i + 1}</button>)}
      </div>
      <button className="ghost icon-btn" aria-label="Next period" disabled={selected === windows.length - 1} onClick={() => choose(selected + 1)}><Icon name="chevron" size={22} className="fwd-icon" /></button>
    </div>
    <SectionNav label="Jump to a chart" sections={sections} />

    <section className="card score-overview" id="sc-total" aria-labelledby="score-total-title">
      <div className="score-total-line">
        <div><h2 id="score-total-title">Total score <span className="tag">secondary</span></h2>
          <p className="muted">{sel.summary.itemsInTotal} of 29 ratings · app-derived{sel.score.provisional ? " · so far" : ""}</p></div>
        <strong className="score-total-value">{sel.summary.total}</strong>
      </div>
      <p className={sel.unlogged ? "note" : "muted"}>
        {sel.elapsed - sel.unlogged} of {sel.elapsed} ended days recorded.
        {sel.unlogged > 0 && <> {sel.unlogged} unlogged days are unknown; scores may read low.</>}
        {sel.elapsed === 0 && <> Today has not ended yet.</>}
      </p>
    </section>

    <section className="card" id="sc-behaviors" aria-labelledby="score-behaviors-title">
      <h2 id="score-behaviors-title">Behavior scores</h2>
      <p className="muted">Period {selected + 1} only · 1 = never, 7 = several times an hour.</p>
      {rows.length === 0 ? <p>No behaviors logged in this period. Check the coverage above before interpreting the ratings.</p> :
        <table className="period-scores">
          <caption className="sr">Behavior ratings and logged occurrences for period {selected + 1}</caption>
          <thead><tr><th scope="col">Behavior</th><th scope="col">Rating</th><th scope="col">Logs</th></tr></thead>
          <tbody>{rows.map((item) => {
            const rating = sel.ratings[item.id];
            const derived = sel.score.items[item.id - 1];
            const moved = changeSince(windows, selected, item.id);
            return <tr key={item.id} data-behavior={item.id}>
              <th scope="row"><b>{item.id}. {item.name}</b><span className="score-row-label">{RATING_LABELS[rating]}</span>
                <span className={moved.change ? `score-row-change ${moved.change}` : "score-row-change"}>
                  {moved.text}{moved.change && <span aria-hidden> {moved.change === "up" ? "↑" : "↓"}</span>}
                </span>
                <span className="score-row-source">App-derived from logs</span></th>
              <td><span className={`rating-cell r${rating}${sel.score.provisional ? " provisional" : ""}`}>{rating}</span></td>
              <td>{derived.count}</td>
            </tr>;
          })}</tbody>
        </table>}
      <button className="ghost" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? "Show logged behaviors" : "Show all 29 behaviors"}</button>
      <details className="score-explanation"><summary>How to read these scores</summary>
        <p>Recorded days have a behavior log or a quiet-day check-in. Unlogged days are unknown, not zero. Today is not counted until it ends.</p>
        {sel.summary.specialCodes.length > 0 && <p>Excluded from total and group averages: {sel.summary.specialCodes.map((c) => `#${c.itemId}: ${RATING_LABELS[c.code]}`).join("; ")}.</p>}
        <p>These CMAI-based (app-derived) ratings come from the count rule alone, not a CMAI interview. Counts are logged occurrences in this period; deleted logs are not counted. Nobody can change a rating by hand, so it can be compared fairly with a caregiver's own rating.</p>
        <p>The total is secondary: the manual (p.5) advises reading individual behaviors. A lower total does not by itself show an effect of treatment.</p>
      </details>
    </section>

    <section className="card" id="sc-status">
      <h2>Agitation status · period {selected + 1}</h2>
      <div className="status-row">{groups.map((g) => <div key={g} className={sel.summary.agitated[g] ? "status warn" : "status ok"}>
        <Icon name={sel.summary.agitated[g] ? "alert" : "check"} className="status-icon" />
        <b>{GROUP_LABELS[g]}</b><span className="status-state">{sel.summary.agitated[g] ? "Meets agitated rule" : "Below threshold"}</span>
      </div>)}</div>
      <p className="muted">Manual frequency thresholds (p.5 to 6){sel.score.provisional ? " · provisional while this period is in progress" : ""}. Read alongside observation coverage.</p>
    </section>

    <section className="card" id="sc-patterns">
      <h2>Patterns · period {selected + 1}</h2>
      <h3>Average rating by behavior group</h3>
      <dl className="score-group-values">{groups.map((g) => <div key={g}><dt>{GROUP_LABELS[g]}</dt>
        <dd>{sel.summary.factors[g].n ? sel.summary.factors[g].mean.toFixed(2) : "Not available"}</dd></div>)}</dl>
      <p className="muted">Mean of included 1–7 ratings; codes 8 and 9 are excluded{sel.score.provisional ? ". So far only" : ""}.</p>
      <h3>Time of day</h3>
      <p className="muted">{inPeriod.length} logged {inPeriod.length === 1 ? "occurrence" : "occurrences"} in this period. These are counts, not ratings.</p>
      {inPeriod.length > 0 && <>
        <div className="chart" aria-hidden="true"><ResponsiveContainer width="100%" height={180}>
          <BarChart data={hours} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} /><XAxis dataKey="label" stroke="var(--text-muted)" tickLine={false} interval={2} />
            <YAxis allowDecimals={false} stroke="var(--text-muted)" tickLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Logs"]} />
            <Bar dataKey="count" name="Logs" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        <details className="score-explanation"><summary>View hourly counts</summary><ul>{hours.map((h) => <li key={h.label}>{h.label}: {h.count} logs</li>)}</ul></details>
      </>}
    </section>

    <section className="card" id="sc-history">
      <h2>History</h2>
      <details open={historyOpen} onToggle={(e) => setHistoryOpen(e.currentTarget.open)}>
        <summary>Compare finished periods ({finished.length})</summary>
        {historyOpen && (finished.length < 2 ? <p>At least two finished periods are needed to compare. An in-progress period is excluded.</p> : <>
          <p className="muted">Historical comparison across finished periods. In-progress periods are excluded; unlogged days remain unknown. This view is separate from period {selected + 1} above.</p>
          <div className="heat-wrap"><table className="heat">
            <caption>Behavior ratings across finished periods</caption>
            <thead><tr><th scope="col">Behavior</th>{finished.map((w, i) => <th key={w.score.windowStart} scope="col">P{i + 1}<span className="sub">{shortDate(w.score.windowStart)}</span></th>)}</tr></thead>
            <tbody><tr className="unlogged-row"><th scope="row">Unlogged days</th>{finished.map((w) => <td key={w.score.windowStart}>{w.unlogged}</td>)}</tr>
              {ITEMS.filter((item) => showAll || finished.some((w) => w.ratings[item.id] > 1)).map((item) => <tr key={item.id}><th scope="row">{item.id}. {item.name}</th>{finished.map((w, i) => {
                const change = changes.get(item.id)?.[i];
                return <td key={w.score.windowStart} className={`r${w.ratings[item.id]}`}>
                  {w.ratings[item.id]}{change && <span className="chg" aria-label={change === "up" ? "changed, more often" : "changed, less often"}>{change === "up" ? "↑" : "↓"}</span>}
                </td>;
              })}</tr>)}</tbody>
          </table></div>
          <p className="muted">Arrows mark a 2-point change, or 1 point in the same direction over two consecutive finished periods. Codes 8 and 9 are never compared.</p>
          <h3>Group averages over time</h3>
          <div className="chart" aria-hidden="true"><ResponsiveContainer width="100%" height={220}><LineChart data={trend}>
            <CartesianGrid stroke="var(--grid)" vertical={false} /><XAxis dataKey="name" stroke="var(--text-muted)" />
            <YAxis domain={[1, 7]} ticks={[1, 2, 3, 4, 5, 6, 7]} interval={0} stroke="var(--text-muted)" />
            <Tooltip contentStyle={tooltipStyle} /><Legend />{groups.map((g) => <Line key={g} type="monotone" dataKey={g} name={GROUP_LABELS[g]} stroke={SERIES[g]} strokeDasharray={DASH[g]} strokeWidth={2.5} />)}
          </LineChart></ResponsiveContainer></div>
          <table className="period-scores"><caption>Finished-period group averages and totals</caption><thead><tr><th scope="col">Period</th>{groups.map((g) => <th key={g} scope="col">{GROUP_LABELS[g]}</th>)}<th scope="col">Total</th></tr></thead>
            <tbody>{finished.map((w, i) => <tr key={w.score.windowStart}><th scope="row">P{i + 1}</th>{groups.map((g) => <td key={g}>{w.summary.factors[g].n ? w.summary.factors[g].mean.toFixed(2) : "—"}</td>)}<td>{w.summary.total}</td></tr>)}</tbody></table>
        </>)}
      </details>
    </section>
  </div>;
}
