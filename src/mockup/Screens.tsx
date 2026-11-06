// Design mockup of the five-step flow: Login, Log, Score, Report, Settings.
// Not the app: nothing here is imported by src/App.tsx or saved anywhere. It exists so
// layout can be tried in Storybook (npm run storybook) before the real screens change,
// which waits on Dr. Gupta's review (cmai-mobile-plan.md).

import { useState, type CSSProperties, type ReactNode } from "react";
import { GROUP_LABELS, type FactorGroup } from "../scoring/items";
import { Icon, type IconName } from "../ui/Icon";
import { ArrowRightLeft } from "lucide-react";
import { BEHAVIOR_ICONS } from "./behavior-icons";
import {
  BEHAVIOR_SCORES,
  DEMO_CAREGIVER,
  DEMO_PATIENTS,
  GROUP_ORDER,
  PERIOD,
  RATING_LABELS,
  SHORT,
  TODAY_LOGS,
  TOTAL_BEFORE,
  TOTAL_NOW,
} from "./mock-data";
import {
  BUSY_DAY,
  GROUP_AVG,
  LOGS_BEFORE,
  LOGS_NOW,
  PER_DAY,
  TOGETHER,
  fmtTime,
  heatFor,
  perHour,
  periodDate,
  type MockLog,
} from "./mock-history";

export type MockTab = "log" | "score" | "report" | "settings";

const TABS: { id: MockTab; label: string; icon: IconName }[] = [
  { id: "log", label: "Log", icon: "plus" },
  { id: "score", label: "Score", icon: "chart" },
  { id: "report", label: "Report", icon: "review" },
  { id: "settings", label: "Settings", icon: "data" },
];

/** A phone-sized frame: resident banner on top, four tabs at the bottom. */
export function Phone({ tab, children, bare }: { tab?: MockTab; children: ReactNode; bare?: boolean }) {
  // Switch steps through the demo residents, so each badge color can be tried.
  const [who, setWho] = useState(0);
  const pt = DEMO_PATIENTS[who];
  return (
    <div className="mk-phone">
      {!bare && (
        <div className="mk-banner" data-res={who}>
          <span className="mk-banner-who">
            <span className="mk-avatar" aria-hidden>
              <span className="mk-av-letter">{pt.label.slice(-1)}</span>
              <span className="mk-av-num">{pt.short}</span>
            </span>
            <span className="mk-banner-text">
              <b>
                <span className="mk-name">{pt.label}</span>
                <span className="mk-code">{pt.code}</span>
              </b>
              <span>
                <span className="mk-pid">{pt.code} · </span>
                {pt.room}
                <span className="mk-sw-word"> · switch</span>
              </span>
            </span>
            <span className="mk-banner-chev" aria-hidden>
              <Icon name="chevron" size={16} />
            </span>
          </span>
          <button
            type="button"
            className="mk-banner-switch"
            aria-label="Switch resident"
            onClick={() => setWho((who + 1) % DEMO_PATIENTS.length)}
          >
            <ArrowRightLeft size={16} aria-hidden />
            Switch
          </button>
        </div>
      )}
      <div className="mk-body">{children}</div>
      {!bare && (
        <nav className="mk-tabs" aria-label="Sections">
          {TABS.map((t) => (
            <span
              key={t.id}
              className={t.id === tab ? "mk-tab on" : "mk-tab"}
              aria-current={t.id === tab ? "page" : undefined}
            >
              <span className="mk-tab-icon">
                <Icon name={t.icon} size={22} />
              </span>
              {t.label}
            </span>
          ))}
        </nav>
      )}
    </div>
  );
}

/* 1. Login ---------------------------------------------------------------- */

export interface LoginProps {
  step: "sign-in" | "choose-resident";
  method: "phone-pin" | "lab-account";
}

export function LoginScreen({ step, method }: LoginProps) {
  const [pin, setPin] = useState("");
  if (step === "choose-resident") {
    return (
      <Phone bare>
        <h1 className="mk-h1">Who are you caring for?</h1>
        <p className="mk-muted">
          Signed in as {DEMO_CAREGIVER.name}, {DEMO_CAREGIVER.role.toLowerCase()}.
        </p>
        <ul className="mk-list">
          {DEMO_PATIENTS.map((p, i) => (
            <li key={p.id}>
              <button className="mk-row-btn mk-res-row" data-res={i}>
                <span className="mk-res-badge" aria-hidden="true">
                  {p.short}
                </span>
                <b>{p.code}</b>
                <span>{p.room}</span>
                <Icon name="chevron" className="mk-chev" />
              </button>
            </li>
          ))}
        </ul>
        <p className="mk-open">Open (R2): who assigns residents to caregivers.</p>
      </Phone>
    );
  }
  return (
    <Phone bare>
      <div className="mk-login-head">
        <span className="mk-logo" aria-hidden>
          <Icon name="lock" size={28} />
        </span>
        <h1 className="mk-h1">CMAI Tracker</h1>
        <p className="mk-muted">Gupta Lab, Old Dominion University</p>
      </div>
      {method === "phone-pin" ? (
        <>
          <p className="mk-center">Enter your 4-digit PIN</p>
          {/* Dots are decoration; the count is read out from a live text line instead
              (a plain div may not carry aria-label, axe aria-prohibited-attr). */}
          <div className="mk-pin-dots" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={i < pin.length ? "on" : ""} />
            ))}
          </div>
          <p className="mk-sr-only" role="status">
            {pin.length} of 4 digits entered
          </p>
          <div className="mk-keypad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) =>
              k ? (
                <button
                  key={i}
                  onClick={() => setPin(k === "⌫" ? pin.slice(0, -1) : (pin + k).slice(0, 4))}
                  aria-label={k === "⌫" ? "Delete digit" : k}
                >
                  {k}
                </button>
              ) : (
                <span key={i} />
              ),
            )}
          </div>
        </>
      ) : (
        <form className="mk-form" onSubmit={(e) => e.preventDefault()}>
          <label>
            Lab email
            <input type="email" placeholder="name@odu.edu" />
          </label>
          <label>
            Password
            <input type="password" />
          </label>
          <button className="mk-primary">Sign in</button>
        </form>
      )}
      <p className="mk-open">
        Open (R1): phone PIN or lab accounts. Lab accounts move data off the phone, which needs Dr. Gupta (IRB, HIPAA).
      </p>
    </Phone>
  );
}

/* 2. Behavior log --------------------------------------------------------- */

export interface LogProps {
  layout: "grid" | "list";
  columns: 1 | 2 | 3 | 4;
  groupTabs: boolean;
  showFrequent: boolean;
  /** Tile sizing, for trying options live in Storybook's Controls panel. */
  iconSize?: number;
  iconPlacement?: "top" | "beside-name" | "centered";
  tileHeight?: number;
  tilePaddingY?: number;
  tilePaddingX?: number;
  tileGap?: number;
}

export function LogScreen({
  layout,
  columns,
  groupTabs,
  showFrequent,
  iconSize = 26,
  iconPlacement = "top",
  tileHeight = 76,
  tilePaddingY = 8,
  tilePaddingX = 12,
  tileGap = 8,
}: LogProps) {
  const [group, setGroup] = useState<FactorGroup>("aggressive");
  const [counts, setCounts] = useState<Record<number, number>>(() => {
    const c: Record<number, number> = {};
    for (const [id] of TODAY_LOGS) c[id] = (c[id] ?? 0) + 1;
    return c;
  });
  const [last, setLast] = useState<number | null>(null);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const tap = (id: number) => {
    setCounts({ ...counts, [id]: (counts[id] ?? 0) + 1 });
    setLast(id);
  };
  const frequent = [6, 1, 29, 13].slice(0, columns === 3 ? 3 : 4); // one full row at 3 across
  const shown = groupTabs ? [group] : GROUP_ORDER;

  const tile = (id: number) => {
    const BehaviorIcon = BEHAVIOR_ICONS[id];
    const count = counts[id] ? (
      <span className="mk-badge" aria-label={`${counts[id]} today`}>
        {counts[id]}
      </span>
    ) : null;
    const icon = <BehaviorIcon className="mk-bicon" size={iconSize} aria-hidden />;
    if (layout === "list") {
      return (
        <button key={id} className="mk-line" onClick={() => tap(id)}>
          {icon}
          <span className="mk-tile-name">{SHORT[id]}</span>
          {count}
        </button>
      );
    }
    if (iconPlacement === "beside-name") {
      return (
        <button key={id} className="mk-tile place-beside" onClick={() => tap(id)}>
          {icon}
          <span className="mk-tile-name">{SHORT[id]}</span>
          {count}
        </button>
      );
    }
    if (iconPlacement === "centered") {
      return (
        <button key={id} className="mk-tile place-centered" onClick={() => tap(id)}>
          {count}
          {icon}
          <span className="mk-tile-name">{SHORT[id]}</span>
        </button>
      );
    }
    return (
      <button key={id} className="mk-tile" onClick={() => tap(id)}>
        <span className="mk-tile-top">
          {icon}
          {count}
        </span>
        <span className="mk-tile-name">{SHORT[id]}</span>
      </button>
    );
  };
  const cls = layout === "grid" ? "mk-grid" : "mk-lines";
  const sizing = {
    gridTemplateColumns: layout === "grid" ? `repeat(${columns}, 1fr)` : undefined,
    gap: layout === "grid" ? tileGap : undefined,
    "--mk-tile-h": `${tileHeight}px`,
    "--mk-tile-py": `${tilePaddingY}px`,
    "--mk-tile-px": `${tilePaddingX}px`,
  } as CSSProperties;

  return (
    <Phone tab="log">
      <div className="mk-head">
        <h1 className="mk-h1">Log a behavior</h1>
        <span className="mk-muted">{total} today</span>
      </div>
      {showFrequent && (
        <>
          <h2 className="mk-h2">Most logged for this resident</h2>
          <div className={cls} style={sizing}>
            {frequent.map(tile)}
          </div>
        </>
      )}
      {groupTabs && (
        <div className="mk-seg" role="tablist">
          {GROUP_ORDER.map((g) => (
            <button
              key={g}
              role="tab"
              aria-selected={g === group}
              className={g === group ? "on" : ""}
              onClick={() => setGroup(g)}
            >
              {GROUP_LABELS[g].split(/[ ,]/)[0]}
            </button>
          ))}
        </div>
      )}
      {shown.map((g) => (
        <section key={g}>
          {!groupTabs && <h2 className="mk-h2">{GROUP_LABELS[g]}</h2>}
          <div className={cls} style={sizing}>
            {BEHAVIOR_SCORES.filter((b) => b.group === g).map((b) => tile(b.id))}
          </div>
        </section>
      ))}
      <p className="mk-hint">Tap once per event. Hold a tile to see what counts and the manual page.</p>
      {last && (
        <div className="mk-toast" role="status">
          <span>Logged: {SHORT[last]}</span>
          <button
            onClick={() => {
              setCounts({ ...counts, [last]: counts[last] - 1 });
              setLast(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
    </Phone>
  );
}

/* 3. Score ---------------------------------------------------------------- */

export interface ScoreProps {
  order: "behaviors-first" | "total-first";
  showUnlogged: boolean;
}

function Rating({ r }: { r: number }) {
  return (
    <span className={`mk-rating r${r}`} title={RATING_LABELS[r]}>
      {r}
    </span>
  );
}

/** Change from last period, with its size: ↑2, ↓1, or a dash when unchanged. */
function Move({ now, before }: { now: number; before: number }) {
  const d = now - before;
  if (d === 0)
    return (
      <span className="mk-move same" aria-label="No change from last period">
        –
      </span>
    );
  return (
    <span
      className={d < 0 ? "mk-move down" : "mk-move up"}
      aria-label={`${d < 0 ? "Down" : "Up"} ${Math.abs(d)} from last period`}
    >
      {d < 0 ? "↓" : "↑"}
      {Math.abs(d)}
    </span>
  );
}

function TotalLine() {
  return (
    <div className="mk-total-line">
      <span>
        CMAI score <b>{TOTAL_NOW}</b>
        <span className="mk-muted"> / 203 so far</span>
      </span>
      <span className="mk-muted">
        last period {TOTAL_BEFORE} <Move now={TOTAL_NOW} before={TOTAL_BEFORE} />
      </span>
    </div>
  );
}

function BehaviorList({ showUnlogged }: { showUnlogged: boolean }) {
  const seen = BEHAVIOR_SCORES.filter((b) => b.count > 0).sort((a, b) => b.rating - a.rating || b.count - a.count);
  const unseen = BEHAVIOR_SCORES.filter((b) => b.count === 0);
  return (
    <section aria-label="Behaviors this period">
      <ul className="mk-list">
        {seen.map((b) => (
          <li key={b.id} className="mk-srow">
            <Rating r={b.rating} />
            <b data-align-left="score-name">{b.short}</b>
            <span className="mk-muted" data-align-right="score-logs">
              {b.count}
            </span>
            <span data-align-right="score-move">
              <Move now={b.rating} before={b.before} />
            </span>
          </li>
        ))}
      </ul>
      {showUnlogged ? (
        <ul className="mk-list mk-quiet">
          {unseen.map((b) => (
            <li key={b.id} className="mk-srow">
              <Rating r={1} />
              <span>{b.short}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mk-more">+ {unseen.length} not logged (rated 1)</p>
      )}
    </section>
  );
}

export function ScoreScreen({ order, showUnlogged }: ScoreProps) {
  return (
    <Phone tab="score">
      <div className="mk-head">
        <h1 className="mk-h1">Score</h1>
        <span className="mk-muted">Day {PERIOD.day} of 14</span>
      </div>
      {order === "total-first" && <TotalLine />}
      <div className="mk-cols" aria-hidden>
        <span>Rating</span>
        <span data-align-right="score-logs">Logs</span>
        <span data-align-right="score-move">vs last</span>
      </div>
      <BehaviorList showUnlogged={showUnlogged} />
      {order === "behaviors-first" && <TotalLine />}
      <p className="mk-hint">
        Ratings are provisional until the period ends {PERIOD.end}. Tap a rating for its meaning.
      </p>
    </Phone>
  );
}

/* 4. Report --------------------------------------------------------------- */

export interface ReportProps {
  view: "daily" | "two-week";
  todayLogs?: "as logged" | "busy day";
  heatHours?: 2 | 3 | 4 | 6;
}

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/** The two-week view: dates, charts and the behavior table. */
function TwoWeeks({ heatHours }: { heatHours: 2 | 3 | 4 | 6 }) {
  const today = PERIOD.day - 1;
  const days = Array.from({ length: 14 }, (_, d) => periodDate(d));
  const max = Math.max(...(PER_DAY.filter((n) => n !== null) as number[]));
  const sofar = LOGS_NOW.length;
  const lastSameDays = LOGS_BEFORE.filter((l) => l.day <= today).length;
  const tod = heatFor(heatHours);
  const bins = heatBins(tod.max);
  const rows = BEHAVIOR_SCORES.filter((b) => b.count > 0 || b.before > 1).sort(
    (a, b) => b.rating - a.rating || b.count - a.count,
  );
  const lastCount = (id: number) => LOGS_BEFORE.filter((l) => l.itemId === id).length;
  const groupLogs = (g: FactorGroup, logs: MockLog[]) =>
    logs.filter((l) => BEHAVIOR_SCORES.find((b) => b.id === l.itemId)?.group === g).length;
  return (
    <>
      <p className="mk-period">
        <b>
          {fmtDate(days[0])} – {fmtDate(days[13])}
        </b>
        <span className="mk-muted">
          Period {PERIOD.number} · day {PERIOD.day} of 14
        </span>
      </p>

      <div className="mk-stats">
        <div>
          <small>Logs so far</small>
          <b>{sofar}</b>
          <span className="mk-muted">
            {lastSameDays} by day {PERIOD.day} last time
          </span>
        </div>
        <div className="mk-stat-live">
          <small>CMAI score</small>
          <b>{TOTAL_NOW}</b>
          <span className="mk-muted">
            So far, final {fmtDate(days[13]).replace(/^\w+, /, "")} · last {TOTAL_BEFORE}
          </span>
        </div>
        <div>
          <small>Behaviors seen</small>
          <b>{BEHAVIOR_SCORES.filter((b) => b.count > 0).length}</b>
          <span className="mk-muted">of 29</span>
        </div>
      </div>

      <section className="mk-card" aria-labelledby="rp-day">
        <h2 className="mk-card-h" id="rp-day">
          Logs per day
        </h2>
        <div className="mk-daybars" role="img" aria-label={`Logs per day: ${PER_DAY.slice(0, today + 1).join(", ")}`}>
          {days.map((dt, d) => {
            const n = PER_DAY[d];
            return (
              <span
                key={d}
                className={d === today ? "mk-daybar now" : "mk-daybar"}
                title={n === null ? fmtDate(dt) : `${fmtDate(dt)}: ${n} logs`}
              >
                <span className="mk-daybar-n">{n ?? ""}</span>
                <i
                  className={n === null ? "future" : ""}
                  style={{ height: n === null ? 4 : Math.max(4, (n / max) * 72) }}
                />
                <small>{WEEKDAY[dt.getDay()]}</small>
                <small>{dt.getDate()}</small>
              </span>
            );
          })}
        </div>
      </section>

      <section className="mk-card" aria-labelledby="rp-time">
        <h2 className="mk-card-h" id="rp-time">
          Time of day
        </h2>
        {tod.claim && (
          <p className="mk-finding">
            Most logs: <b>{tod.busiest.label}</b> ({tod.busiest.pct}%)
          </p>
        )}
        <div className="mk-heat" role="table" aria-label="Logs by time of day (rows) and date (columns)">
          <div className="mk-heat-row mk-heat-axis" aria-hidden>
            <small className="mk-axis-title">Time</small>
            <small className="mk-axis-title mk-axis-x">Date →</small>
          </div>
          {tod.labels.map((label, b) => (
            <div key={label} className="mk-heat-row" role="row">
              <small role="rowheader">{label}</small>
              {tod.heat[b].map((n, d) => (
                <span
                  key={d}
                  role="cell"
                  className={d > today ? "mk-heat-cell future" : "mk-heat-cell"}
                  title={`${fmtDate(days[d])}, ${label}: ${n} logs`}
                  style={{ background: d > today ? undefined : `var(--r${bins.find((x) => n <= x.to)!.step})` }}
                />
              ))}
            </div>
          ))}
          <div className="mk-heat-row mk-heat-axis" aria-hidden>
            <small />
            {days.map((dt, d) => (
              <small key={d} className={d === today ? "now" : ""}>
                {d % 2 === 0 || d === today ? dt.getDate() : ""}
              </small>
            ))}
          </div>
        </div>
        <div className="mk-key" aria-label="Legend: logs in a block">
          <span className="mk-key-title">Logs</span>
          {bins.map((x) => (
            <span key={x.label} className="mk-key-item">
              <span style={{ background: `var(--r${x.step})` }} />
              {x.label}
            </span>
          ))}
        </div>
      </section>

      <section className="mk-card" aria-labelledby="rp-group">
        <h2 className="mk-card-h" id="rp-group">
          Behavior groups
        </h2>
        <p className="mk-card-sub">Each square is one behavior in the group, showing its rating (1 to 7).</p>
        <div className="mk-groups-cols" aria-hidden="true">
          <span>Group</span>
          <span data-align-right="grp-avg">Average</span>
        </div>
        <ul className="mk-groups">
          {GROUP_AVG.map((g) => {
            const items = BEHAVIOR_SCORES.filter((b) => b.group === g.group).sort((a, b) => b.rating - a.rating);
            const now = groupLogs(g.group, LOGS_NOW);
            const last = groupLogs(g.group, LOGS_BEFORE);
            const name = GROUP_LABELS[g.group].split(/[ ,]/)[0];
            return (
              <li key={g.group}>
                <b className="mk-groups-name" data-align-left="grp">
                  {name}
                </b>
                <div
                  className="mk-groups-squares"
                  data-align-left="grp"
                  aria-label={`${name} ratings: ${items.map((b) => b.rating).join(", ")}`}
                >
                  {items.map((b) => (
                    <span key={b.id} className={`mk-rating mini r${b.rating}`} title={`${b.short}: ${b.rating}`}>
                      {b.rating > 1 ? b.rating : ""}
                    </span>
                  ))}
                </div>
                <span className="mk-groups-logs mk-muted" data-align-left="grp">
                  {now} logs · {last} last period
                </span>
                <div className="mk-groups-avg">
                  <b data-align-right="grp-avg" aria-label={`Average rating ${g.now.toFixed(1)}`}>
                    {g.now.toFixed(1)}
                  </b>
                  <span className="mk-muted" data-align-right="grp-last">
                    last {g.before.toFixed(1)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mk-card" aria-labelledby="rp-table">
        <h2 className="mk-card-h" id="rp-table">
          Behaviors, this period vs last
        </h2>
        <table className="mk-table mk-rtable">
          <thead>
            <tr>
              <th rowSpan={2}>Behavior</th>
              <th rowSpan={2}>Rating</th>
              <th colSpan={2} className="mk-th-group">
                Logs
              </th>
              <th rowSpan={2}>Change</th>
            </tr>
            <tr>
              <th className="mk-th-sub">Now</th>
              <th className="mk-th-sub">Last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td>{b.short}</td>
                <td>
                  <Rating r={b.rating} />
                </td>
                <td className="mk-td-now">{b.count}</td>
                <td className="mk-td-last">{lastCount(b.id)}</td>
                <td>
                  <Move now={b.rating} before={b.before} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mk-card-sub">Change is in rating steps, from last period&apos;s final rating.</p>
      </section>

      <section className="mk-card" aria-labelledby="rp-pat">
        <h2 className="mk-card-h" id="rp-pat">
          Patterns to look into
        </h2>
        <ul className="mk-patterns">
          {TOGETHER.filter((t) => t.times >= 3).map((t) => (
            <li key={`${t.a}-${t.b}`}>
              <b>
                {SHORT[t.a]} and {SHORT[t.b]}
              </b>{" "}
              were logged within 30 minutes of each other {t.times} times.
            </li>
          ))}
          {tod.claim && (
            <li>
              <b>{tod.busiest.pct}% of logs</b> fall {tod.busiest.label}.
            </li>
          )}
        </ul>
        <p className="mk-card-sub">
          Found by simple counting on the phone, once there are enough logs. Patterns, not causes.
        </p>
      </section>

      <button className="mk-secondary">
        <Icon name="download" /> Export this period (CSV)
      </button>
    </>
  );
}

/** Four plain-language legend steps that fit the busiest cell. */
function heatBins(max: number): { to: number; step: number; label: string }[] {
  if (max <= 3)
    return [
      { to: 0, step: 1, label: "0" },
      { to: 1, step: 3, label: "1" },
      { to: 2, step: 5, label: "2" },
      { to: Infinity, step: 7, label: "3+" },
    ];
  const a = Math.ceil(max / 3);
  return [
    { to: 0, step: 1, label: "0" },
    { to: a, step: 3, label: a === 1 ? "1" : `1–${a}` },
    { to: 2 * a, step: 5, label: `${a + 1}–${2 * a}` },
    { to: Infinity, step: 7, label: `${2 * a + 1}+` },
  ];
}

/** Today's view: grouped by behavior, a tap opens each log's time. */
function Today({ busy }: { busy: boolean }) {
  const logs = busy ? BUSY_DAY : LOGS_NOW.filter((l) => l.day === PERIOD.day - 1);
  const [open, setOpen] = useState<number | null>(null);
  const byItem = new Map<number, MockLog[]>();
  for (const l of logs) byItem.set(l.itemId, [...(byItem.get(l.itemId) ?? []), l]);
  const groups = [...byItem.entries()].sort((a, b) => b[1][b[1].length - 1].minute - a[1][a[1].length - 1].minute);
  const last = logs.reduce((m, l) => Math.max(m, l.minute), 0);
  const hours = perHour(logs);
  const hmax = Math.max(1, ...hours);
  const nowHour = 16; // the mock's clock: 4:30 PM
  return (
    <>
      <p className="mk-period">
        <b>{fmtDate(periodDate(PERIOD.day - 1))}</b>
        <span className="mk-muted">Day ends at midnight</span>
      </p>
      <div className="mk-stats">
        <div>
          <small>Logs today</small>
          <b>{logs.length}</b>
        </div>
        <div>
          <small>Behaviors</small>
          <b>{byItem.size}</b>
        </div>
        <div>
          <small>Last log</small>
          <b className="mk-stat-time">{fmtTime(last)}</b>
        </div>
      </div>
      <section className="mk-card" aria-labelledby="rp-hours">
        <h2 className="mk-card-h" id="rp-hours">
          Logs by hour
        </h2>
        <div className="mk-hours" role="img" aria-label={`Logs by hour today: ${hours.join(", ")}`}>
          {hours.map((n, h) => (
            <span
              key={h}
              className={h > nowHour ? "mk-hour future" : h === nowHour ? "mk-hour now" : "mk-hour"}
              title={`${fmtTime(h * 60)}: ${n} logs`}
            >
              {n > 0 && <small>{n}</small>}
              <i style={{ height: h > nowHour ? 3 : n === 0 ? 2 : Math.max(4, (n / hmax) * 56) }} />
            </span>
          ))}
        </div>
        <div className="mk-hours-axis" aria-hidden>
          <small>12a</small>
          <small>6a</small>
          <small>12p</small>
          <small>6p</small>
          <small>12a</small>
        </div>
      </section>
      <ul className="mk-list mk-acc">
        {groups.map(([id, ls]) => {
          const BehaviorIcon = BEHAVIOR_ICONS[id];
          const isOpen = open === id;
          return (
            <li key={id}>
              <button className="mk-acc-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : id)}>
                <BehaviorIcon className="mk-bicon" size={22} aria-hidden />
                <b>{SHORT[id]}</b>
                <span className="mk-muted mk-small">last {fmtTime(ls[ls.length - 1].minute)}</span>
                <span className="mk-badge">{ls.length}</span>
                <span className={isOpen ? "mk-acc-chev open" : "mk-acc-chev"} aria-hidden>
                  <Icon name="chevron" size={16} />
                </span>
              </button>
              {isOpen && (
                <ol className="mk-acc-body">
                  {[...ls].reverse().map((l, i) => (
                    <li key={i}>
                      <span className="mk-time">{fmtTime(l.minute)}</span>
                      <span className="mk-muted mk-small">by {l.by}</span>
                      <button className="mk-link">Remove…</button>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mk-hint">Newest activity first. Removing a log asks for a reason and a confirm.</p>
      <p className="mk-open">Open (R4): a day ends at midnight here until Dr. Gupta confirms.</p>
    </>
  );
}

export function ReportScreen({ view: initial, todayLogs = "as logged", heatHours = 4 }: ReportProps) {
  const [view, setView] = useState(initial);
  return (
    <Phone tab="report">
      <div className="mk-seg" role="tablist" aria-label="Report range">
        <button
          role="tab"
          aria-selected={view === "daily"}
          className={view === "daily" ? "on" : ""}
          onClick={() => setView("daily")}
        >
          Today
        </button>
        <button
          role="tab"
          aria-selected={view === "two-week"}
          className={view === "two-week" ? "on" : ""}
          onClick={() => setView("two-week")}
        >
          Two weeks
        </button>
      </div>
      {view === "daily" ? <Today busy={todayLogs === "busy day"} /> : <TwoWeeks heatHours={heatHours} />}
    </Phone>
  );
}

/* 5. Settings ------------------------------------------------------------- */

export function SettingsScreen() {
  const rows: [string, string][] = [
    ["Residents", `${DEMO_PATIENTS.length} assigned to you`],
    ["Text size", "Standard or large"],
    ["Theme", "Match phone"],
    ["Backup and export", "Last backup Nov 2"],
    ["Demo data", "Made-up residents for practice"],
    ["How ratings are worked out", "Scoring rules, manual pages"],
  ];
  return (
    <Phone tab="settings">
      <h1 className="mk-h1">Settings</h1>
      <div className="mk-profile">
        <span className="mk-avatar" aria-hidden>
          CD
        </span>
        <span>
          <b>{DEMO_CAREGIVER.name}</b>
          <span className="mk-muted mk-small"> · {DEMO_CAREGIVER.role}</span>
        </span>
      </div>
      <ul className="mk-list">
        {rows.map(([k, v]) => (
          <li key={k}>
            <button className="mk-row-btn">
              <b>{k}</b>
              <span>{v}</span>
              <Icon name="chevron" className="mk-chev" />
            </button>
          </li>
        ))}
      </ul>
      <button className="mk-secondary">Sign out</button>
    </Phone>
  );
}
