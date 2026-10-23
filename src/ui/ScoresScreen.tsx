// Screen 2: results. Per-behavior change first, then factor averages,
// then the total (shown because the lab asked; the manual, p.5, warns it is not
// useful on its own). Time-of-day pattern last.

import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { meaningfulChanges, RATING_LABELS } from "../scoring/engine";
import { GROUP_LABELS, ITEMS } from "../scoring/items";
import type { StoredObservation } from "../data/db";
import type { ScoredWindow } from "./useCmaiData";
import { shortDate, windowLabel } from "./format";
import { Icon } from "./Icon";
import { SectionNav, type Section } from "./SectionNav";

const sections: Section[] = [
  { id: "sc-status", label: "Status" },
  { id: "sc-behaviors", label: "Behaviors" },
  { id: "sc-groups", label: "Groups" },
  { id: "sc-total", label: "Total" },
  { id: "sc-time", label: "Time of day" },
];

const SERIES = { aggressive: "var(--series-1)", physical: "var(--series-2)", verbal: "var(--series-3)" } as const;
// A line pattern per group as well as a color, so the lines stay apart without color vision.
const DASH = { aggressive: undefined, physical: "7 4", verbal: "2 4" } as const;

interface Props {
  windows: ScoredWindow[];
  observations: StoredObservation[];
  onLog: () => void;
}

export function ScoresScreen({ windows, observations, onLog }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(() => Math.max(0, windows.filter((w) => !w.score.provisional).length - 1));
  const chips = useRef<HTMLDivElement>(null);

  // Keep the selected period's chip in view (the row scrolls sideways on a phone).
  useEffect(() => {
    chips.current?.querySelector<HTMLElement>("[aria-selected=true]")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selected, windows.length]);

  if (!windows.length || !observations.length) {
    return (
      <div className="empty">
        <p><b>No logs yet for this patient.</b></p>
        <p>Scores appear here once behaviors are logged. Ratings for a period are final after its 14 days end.</p>
        <button onClick={onLog}><Icon name="plus" /> Go to Log</button>
      </div>
    );
  }

  const sel = windows[Math.min(selected, windows.length - 1)];
  const rows = ITEMS.filter((i) => showAll || windows.some((w) => w.finals[i.id] > 1));
  const label = (w: ScoredWindow, i: number) => `P${i + 1}`;

  // Change marks compare finished periods only (they always come first).
  const finished = windows.filter((w) => !w.score.provisional);
  const changes = new Map(ITEMS.map((i) => [i.id, meaningfulChanges(finished.map((w) => w.finals[i.id]))]));
  const changedInSel = ITEMS.filter((i) => changes.get(i.id)?.[selected]);

  // Trend lines use finished periods only: a period still in progress has
  // fewer days of logs, so it would always look like an improvement.
  const trend = windows.filter((w) => !w.score.provisional).map((w, i) => ({
    name: label(w, i),
    aggressive: +w.summary.factors.aggressive.mean.toFixed(2),
    physical: +w.summary.factors.physical.mean.toFixed(2),
    verbal: +w.summary.factors.verbal.mean.toFixed(2),
    total: w.summary.total,
  }));

  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${(h % 12) || 12}${h < 12 ? "a" : "p"}`, count: 0 }));
  for (const o of observations) {
    if (o.at >= sel.score.windowStart && o.at < sel.score.windowEnd) hours[new Date(o.at).getHours()].count++;
  }

  return (
    <div className="scores">
      <div className="period-chips" ref={chips} role="tablist" aria-label="14-day period">
        {windows.map((w, i) => (
          <button key={w.score.windowStart} role="tab" aria-selected={i === selected} className={i === selected ? "chip on" : "chip"} onClick={() => setSelected(i)}>
            {windowLabel(w.score.windowStart, w.score.windowEnd, i)}
            {w.score.provisional && <span className="tag">in progress</span>}
          </button>
        ))}
      </div>

      <p className="muted">Ratings here are CMAI-based (app-derived): worked out from logged events and the day-14 review, not from a CMAI interview.</p>
      <SectionNav label="Jump to a chart" sections={sections} />

      <section className="card" id="sc-status">
        <h2>Agitation status, period {selected + 1}</h2>
        <p className="muted">Manual rules (p.5 to 6). A group is "agitated" when its behaviors reach the manual's frequency thresholds.</p>
        <div className="status-row">
          {(["aggressive", "physical", "verbal"] as const).map((g) => (
            <div key={g} className={sel.summary.agitated[g] ? "status warn" : "status ok"}>
              <Icon name={sel.summary.agitated[g] ? "alert" : "check"} className="status-icon" />
              <b>{GROUP_LABELS[g]}</b>
              <span className="status-state">{sel.summary.agitated[g] ? "Meets agitated rule" : "Below threshold"}</span>
            </div>
          ))}
        </div>
        {sel.unlogged > 0 && (
          <p className="note">
            {sel.unlogged} of {sel.elapsed} days in this period are unlogged: no logs and no "nothing to log today" check-in. Those days count as unknown, not as zero, but ratings may read low.
          </p>
        )}
        {sel.summary.specialCodes.length > 0 && (
          <p className="muted">Left out of sums: {sel.summary.specialCodes.map((c) => `#${c.itemId} (${RATING_LABELS[c.code]})`).join(", ")}</p>
        )}
      </section>

      <section className="card" id="sc-behaviors">
        <h2>Each behavior, period by period <span className="tag">app-derived</span></h2>
        <p className="muted">1 = never, 7 = several times an hour. Stronger color means more often. This is the view the manual recommends.</p>
        <p className="muted">↑ or ↓ marks a change worth noticing: 2 or more points from the period before, or 1 point the same way two periods running. A single 1-point move is within how much two raters can differ (manual p.7), so it is not marked.</p>
        <div className="heat-wrap">
          <table className="heat">
            <thead>
              <tr>
                <th scope="col">Behavior</th>
                {windows.map((w, i) => (
                  <th key={i} scope="col" className={w.score.provisional ? "open" : ""} title={windowLabel(w.score.windowStart, w.score.windowEnd, i)}>
                    P{i + 1}
                    <span className="sub">{w.score.provisional ? "so far" : shortDate(w.score.windowStart)}</span>
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

      <section className="card" id="sc-groups">
        <h2>Average rating by behavior group</h2>
        <p className="muted">Finished periods only. Mean of the 1 to 7 ratings in each group (manual factors, p.7).</p>
        <div className="chart">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
              <YAxis domain={[1, 7]} ticks={[1, 2, 3, 4, 5, 6, 7]} stroke="var(--text-muted)" tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--rule)", color: "var(--text)" }} />
              <Legend />
              {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map((k) => (
                <Line key={k} type="monotone" dataKey={k} name={GROUP_LABELS[k]} stroke={SERIES[k]} strokeWidth={2.5} strokeDasharray={DASH[k]} dot={{ r: 4, strokeDasharray: "" }} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card" id="sc-total">
        <h2>Total score <span className="tag">secondary</span><span className="tag">app-derived</span></h2>
        <p className="muted">Sum of all 29 CMAI-based ratings (29 to 203). Shown because the lab asked. The manual (p.5) says a total on its own "is not useful", so read it with the views above.</p>
        <p className="note">Totals often fall over time without any change in treatment, so check which behaviors drove a change before crediting it.</p>
        {!sel.score.provisional && selected > 0 && (
          <p className="muted">
            {changedInSel.length
              ? `Behaviors that changed in period ${selected + 1}: ${changedInSel.map((i) => `#${i.id} ${i.name} (${changes.get(i.id)![selected] === "up" ? "more often" : "less often"})`).join("; ")}.`
              : `No behavior changed enough to mark in period ${selected + 1}.`}
          </p>
        )}
        <div className="chart">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
              <YAxis stroke="var(--text-muted)" tickLine={false} domain={["dataMin - 5", "dataMax + 5"]} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--rule)", color: "var(--text)" }} />
              <Line type="monotone" dataKey="total" name="Total" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card" id="sc-time">
        <h2>Time of day, period {selected + 1}</h2>
        <p className="muted">When behaviors were logged. A late-day peak can point to a trigger worth changing before reaching for medication.</p>
        <div className="chart">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hours} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--text-muted)" tickLine={false} interval={2} />
              <YAxis allowDecimals={false} stroke="var(--text-muted)" tickLine={false} />
              <Tooltip cursor={{ fill: "var(--hover)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--rule)", color: "var(--text)" }} formatter={(v) => [v, "Logs"]} />
              <Bar dataKey="count" name="Logs" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
