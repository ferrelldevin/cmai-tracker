// Screen 4: a hub with the welcome card and patients on top, and a list of rows that each
// open their own page: backup and export, display, keeping data safe, demo data, and how
// ratings are worked out (iOS Settings pattern; design note docs/design/notes/001-navigation.md).

import { useEffect, useRef, useState } from "react";
import { db, localMidnight, type Patient } from "../data/db";
import { loadDemoData } from "../data/seed";
import { buildExport, download } from "../data/exporter";
import { deletePatient, removeDemoData, restoreBackup } from "../data/manage";
import { RATING_LABELS, ratingFromCount, RULE_VERSION, WINDOW_DAYS } from "../scoring/engine";
import { ago, shortDate } from "./format";
import { Icon, type IconName } from "./Icon";
import { PatientAvatar } from "./PatientAvatar";
import { Sheet } from "./Sheet";
import { canInstall, install, isInstalled, onInstallChange } from "./install";
import type { DataPage } from "./route";
import { currentTheme, getContrastPref, getThemePref, onDisplayChange, setContrastPref, setThemePref, type ContrastPref, type ThemePref } from "./display";

interface Props {
  patients: Patient[];
  current: string | null;
  page: DataPage | null;
  pageTitle: string;
  onPage: (page: DataPage) => void;
  onBack: () => void;
  onPatient: (id: string) => void;
  onChange: () => void;
}

type Msg = { at: "patients" | "demo" | "export" | "safe"; text: string; tone?: "error" };

const LAST_EXPORT = "cmai-last-export";
const readLastExport = () => {
  try { return Number(localStorage.getItem(LAST_EXPORT)) || null; } catch { return null; }
};

/** The next unused code in the P-NN series, offered as the example in the add field. */
function nextCode(patients: Patient[]) {
  const used = new Set(patients.map((p) => p.id));
  for (let n = 1; n < 1000; n++) {
    const id = `P-${String(n).padStart(2, "0")}`;
    if (!used.has(id)) return id;
  }
  return "P-01";
}

/** Count bands from the engine itself, so this page cannot drift from the rule. */
function countBands() {
  const bands: { from: number; to: number | null; rating: number }[] = [];
  for (let n = 0; n <= 200; n++) {
    const r = ratingFromCount(n);
    const last = bands[bands.length - 1];
    if (last && last.rating === r) last.to = n;
    else bands.push({ from: n, to: n, rating: r });
  }
  bands[bands.length - 1].to = null;
  return bands;
}

export function DataScreen({ patients, current, page, pageTitle, onPage, onBack, onPatient, onChange }: Props) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<Msg | null>(null);
  // A message belongs to the page it was said on; leaving the page clears it.
  useEffect(() => setMsg(null), [page]);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  // Deleting asks in a sheet; viaKeyboard decides where focus starts (F-14 rule).
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; viaKeyboard: boolean } | null>(null);
  const [lastExport, setLastExport] = useState(readLastExport);
  const [, setInstallTick] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const hasDemo = patients.some((p) => p.demo);
  const suggested = nextCode(patients);
  const firstRun = patients.length === 0;

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
    return onInstallChange(() => setInstallTick((t) => t + 1));
  }, []);

  const say = (at: Msg["at"], text: string, tone?: "error") => setMsg({ at, text, tone });
  const msgFor = (at: Msg["at"]) =>
    msg?.at === at ? <p className={msg.tone === "error" ? "msg error" : "msg"} role={msg.tone === "error" ? "alert" : "status"}>{msg.text}</p> : null;

  async function addPatient(e: React.FormEvent) {
    e.preventDefault();
    const id = code.trim().toUpperCase();
    if (!id) {
      say("patients", `Type a code first, such as ${suggested}.`, "error");
      codeInput.current?.focus();
      return;
    }
    if (!/^[A-Z0-9-]{2,12}$/.test(id)) {
      say("patients", "Use a code like P-03: 2 to 12 letters, numbers or dashes. No names.", "error");
      codeInput.current?.focus();
      return;
    }
    if (await db.patients.get(id)) return say("patients", `${id} already exists. Pick it from the list below.`, "error");
    await db.patients.add({ id, anchor: localMidnight(Date.now()) });
    setCode("");
    say("patients", `Added ${id}. Day 1 of its first 14-day period is today.`);
    onPatient(id);
    onChange();
  }

  async function demo() {
    const first = await loadDemoData();
    say("demo", "Loaded six weeks of made-up data for P-DEMO-A (improving) and P-DEMO-B (worsening).");
    onPatient(first);
    onChange();
  }

  async function clearDemo() {
    const n = await removeDemoData();
    say("demo", n ? "Removed the demo patients and their logs." : "There was no demo data to remove.");
    onChange();
  }

  async function remove(id: string) {
    await deletePatient(id);
    setConfirmDelete(null);
    say("patients", `Deleted ${id} and all of its logs, reviews and check-ins.`);
    onChange();
  }

  async function exportFile(kind: "json" | "observations" | "scores") {
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const out = await buildExport();
      if (kind === "json") download(`cmai-backup-${stamp}.json`, out.json, "application/json");
      if (kind === "observations") download(`cmai-observations-${stamp}.csv`, out.observationsCsv, "text/csv");
      if (kind === "scores") download(`cmai-scores-${stamp}.csv`, out.scoresCsv, "text/csv");
      const t = Date.now();
      try { localStorage.setItem(LAST_EXPORT, String(t)); } catch { /* private mode */ }
      setLastExport(t);
      say("export", kind === "json" ? "Backup saved. Keep it somewhere safe, like your email or cloud drive." : "CSV saved.");
    } catch (e) {
      say("export", `Export did not work: ${e instanceof Error ? e.message : e}. Try again, or try another browser.`, "error");
    }
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    try {
      const r = await restoreBackup(await file.text());
      say("export", `Restored ${r.patients} new patient${r.patients === 1 ? "" : "s"} and ${r.observations} new log${r.observations === 1 ? "" : "s"}. Logs already on this phone were kept and not doubled.`);
      onChange();
    } catch (e) {
      say("export", e instanceof Error ? e.message : String(e), "error");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function keepData() {
    const ok = (await navigator.storage?.persist?.()) ?? false;
    setPersisted(ok);
    if (!ok) say("safe", "The browser said no. Installing the app and exporting a backup regularly are the best protection.", "error");
  }

  async function doInstall() {
    if (await install()) say("safe", "Installed. Open CMAI Tracker from your Home Screen from now on.");
  }

  const installed = isInstalled();
  const themeLabel = { auto: "Match phone", light: "Light", dark: "Dark" }[getThemePref()];
  const contrastLabel = getContrastPref() === "high" ? ", high contrast" : "";

  if (page) {
    return (
      <div className="data subpage">
        <div className="page-head">
          <button className="back-btn ghost small" onClick={onBack}><Icon name="chevron" size={20} className="back-icon" /> Data</button>
          <p className="screen-title" aria-hidden>{pageTitle}</p>{/* the screen heading is the h1 in App */}
        </div>
        {page === "backup" && (
          <section className="card backup" aria-label="Backup and export">
            <h3 className="form-label">Backup</h3>
            <p className="muted">Everything on this phone in one file. Restore it here or on another phone; logs already there are kept, not doubled.</p>
            <div className="row wrap">
              <button onClick={() => exportFile("json")} disabled={firstRun}><Icon name="download" /> Download backup</button>
              <button className="ghost" onClick={() => fileInput.current?.click()}><Icon name="upload" /> Restore from backup</button>
              <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
            </div>
            <p className="muted">Last export: <b>{lastExport ? `${ago(lastExport)} (${shortDate(lastExport)})` : "never"}</b></p>
            <h3 className="form-label">For the research team</h3>
            <p className="muted">Spreadsheets that open in Excel. Logs: one row per logged behavior. Scores: one row per patient, period and behavior.</p>
            <div className="row wrap">
              <button className="ghost" onClick={() => exportFile("observations")} disabled={firstRun}>Logs CSV</button>
              <button className="ghost" onClick={() => exportFile("scores")} disabled={firstRun}>Scores CSV</button>
            </div>
            {msgFor("export")}
          </section>
        )}
        {page === "display" && <DisplaySettings />}
        {page === "safe" && (
          <section className="card" aria-label="Keep data safe on this phone">
            {installed ? (
              <p className="ok-line">✓ Installed. You are using the Home Screen app.</p>
            ) : canInstall() ? (
              <>
                <p className="muted">Install the app so it opens like any other app and works with no signal.</p>
                <button onClick={doInstall}>Install app</button>
              </>
            ) : (
              <p className="muted">
                On iPhone, Safari can clear a website's data if it goes unused for a while. Add this app to your Home Screen (tap Share, then Add to Home Screen) and export a backup regularly.
              </p>
            )}
            <p>Storage protected: <b>{persisted === null ? "unknown" : persisted ? "yes" : "not yet"}</b></p>
            {!persisted && <button className="ghost" onClick={keepData}>Ask the browser to keep data</button>}
            {msgFor("safe")}
          </section>
        )}
        {page === "demo" && (
          <section className="card" aria-label="Demo data">
            <p className="muted">Two made-up patients with six weeks of logs, so every chart has something to show. Loading again resets them.</p>
            <div className="row wrap">
              <button className={hasDemo ? "ghost" : ""} onClick={demo}>{hasDemo ? "Reset demo data" : "Load demo data"}</button>
              {hasDemo && <button className="ghost danger-text" onClick={clearDemo}>Remove demo data</button>}
            </div>
            {msgFor("demo")}
          </section>
        )}
        {page === "about" && (
          <section className="card" aria-label="How ratings are worked out">
            <p className="muted">
              The app counts the logs for each behavior in a {WINDOW_DAYS}-day period and turns the count into a 1 to 7 rating. These are CMAI-based (app-derived) ratings, not a CMAI interview. You can correct any of them at the day-14 review.
            </p>
            <table className="bands">
              <caption className="sr">Logs in 14 days and the rating they give</caption>
              <thead><tr><th scope="col">Logs in 14 days</th><th scope="col">Rating</th></tr></thead>
              <tbody>
                {countBands().map((b) => (
                  <tr key={b.rating}>
                    <td>{b.to === null ? `${b.from} or more` : b.from === b.to ? b.from : `${b.from} to ${b.to}`}</td>
                    <td><b>{b.rating}</b> · {RATING_LABELS[b.rating]}</td>
                  </tr>
                ))}
                <tr><td>3+ within an hour, on 7 or more days</td><td><b>7</b> · {RATING_LABELS[7]}</td></tr>
              </tbody>
            </table>
            <p className="muted">
              <b>Unlogged days</b> are days with no logs and no "Nothing to log today" tap. They count as unknown, not as zero, so a period with many of them may read low.
              The day-14 review is also the only place to record <b>8</b> (would happen if not prevented) and <b>9</b> (not applicable).
            </p>
            <p className="muted small-print">
              Version {__APP_VERSION__} · scoring rule {RULE_VERSION} · a prototype for Professor Gupta's Hands-On Lab, not a medical device. Full rules:{" "}
              <a href="https://github.com/ferrelldevin/cmai-tracker/blob/main/docs/scoring-spec.md" target="_blank" rel="noreferrer">scoring spec</a>.
            </p>
          </section>
        )}
      </div>
    );
  }

  const rows: { page: DataPage; icon: IconName; title: string; status: string; hide?: boolean }[] = [
    { page: "backup", icon: "download", title: "Backup and export", status: lastExport ? `Last export ${ago(lastExport)}` : "Never exported" },
    { page: "display", icon: currentTheme() === "dark" ? "moon" : "sun", title: "Display", status: `${themeLabel}${contrastLabel}` },
    { page: "safe", icon: "lock", title: "Keep data safe", status: installed ? "Installed" : persisted ? "Storage protected" : "Not installed yet" },
    { page: "demo", icon: "chart", title: "Demo data", status: hasDemo ? "Loaded" : "Not loaded", hide: firstRun },
    { page: "about", icon: "info", title: "How ratings are worked out", status: `Rule ${RULE_VERSION}` },
  ];

  return (
    <div className="data">
      {firstRun && (
        <section className="card welcome" aria-labelledby="welcome-h">
          <img className="welcome-mark" src="icon.svg" alt="" width="56" height="56" />
          <h2 id="welcome-h">Welcome to CMAI Tracker</h2>
          <p>Log agitated behaviors as they happen. Every 14 days the app turns the logs into CMAI-based ratings, 1 to 7 for each of the 29 behaviors.</p>
          <ol className="steps">
            <li><b>Log.</b> One tap the moment you see a behavior.</li>
            <li><b>Scores.</b> See each behavior period by period, and when in the day it happens.</li>
            <li><b>Review.</b> On day 15, check the app's ratings against what you saw.</li>
          </ol>
          <p className="privacy"><Icon name="lock" size={18} /> Everything stays on this phone. Nothing is sent anywhere unless you export it.</p>
          <div className="row wrap">
            <button onClick={() => codeInput.current?.focus()}>Add a patient</button>
            <button className="ghost" onClick={demo}>Try demo data</button>
          </div>
        </section>
      )}

      <section className="card" aria-labelledby="patients-h">
        <h2 id="patients-h">Patients</h2>
        <p className="muted">Use a code, never a name. A new patient's first 14-day period starts today.</p>
        <form className="add-patient" onSubmit={addPatient}>
          <label htmlFor="new-code" className="field-label">New patient code</label>
          <div className="row">
          <input
            id="new-code"
            ref={codeInput}
            value={code}
            onChange={(e) => { setCode(e.target.value); if (msg?.at === "patients") setMsg(null); }}
            placeholder={`e.g. ${suggested}`}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            maxLength={12}
          />
          <button type="submit">Add</button>
          </div>
        </form>
        {msgFor("patients")}
        {patients.length > 0 && (
          <ul className="patient-list">
            {patients.map((p) => (
              <li key={p.id} className={p.id === current ? "current" : ""}>
                <PatientAvatar id={p.id} size={36} />
                <div className="patient-main">
                  <b>{p.id}</b>
                  {p.demo && <span className="tag">demo</span>}
                  <span className="muted">{p.id === current ? `Open now · since ${shortDate(p.anchor)}` : `Since ${shortDate(p.anchor)}`}</span>
                </div>
                <div className="row">
                  {p.id !== current && <button className="ghost small" onClick={() => onPatient(p.id)}>Open</button>}
                  <button className="ghost small danger-text" aria-label={`Delete ${p.id}`} onClick={(e) => { setMsg(null); setConfirmDelete({ id: p.id, viaKeyboard: e.detail === 0 }); }}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Sheet
          open={!!confirmDelete}
          viaKeyboard={confirmDelete?.viaKeyboard ?? false}
          keyboardFocus=".confirm-cancel"
          className="confirm-sheet"
          title={confirmDelete ? `Delete ${confirmDelete.id}?` : ""}
          headerClose={false}
          footer={confirmDelete && <>
            <button className="ghost confirm-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button className="danger" onClick={() => remove(confirmDelete.id)}>Delete {confirmDelete.id}</button>
          </>}
          onClose={() => setConfirmDelete(null)}
        >
          {confirmDelete && (
            <div className="sheet-scroll">
              <p>This removes all of its logs, reviews and check-ins from this phone. It cannot be undone.</p>
              {confirmDelete.id === current && <p className="muted">{confirmDelete.id} is the patient open now.</p>}
              <p className="muted">Export a backup first if you may need them.</p>
            </div>
          )}
        </Sheet>
      </section>

      <nav className="card menu" aria-label="More">
        <ul>
          {rows.filter((r) => !r.hide).map((r) => (
            <li key={r.page}>
              <a className="menu-row" href={`#/data/${r.page}`} onClick={(e) => { e.preventDefault(); onPage(r.page); }}>
                <span className="menu-icon" aria-hidden><Icon name={r.icon} size={20} /></span>
                <span className="menu-text">
                  <span className="menu-title">{r.title}</span>
                  <span className="menu-status">{r.status}</span>
                </span>
                <Icon name="chevron" size={20} className="menu-chevron" />
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

const THEME_CHOICES: { value: ThemePref; label: string }[] = [
  { value: "auto", label: "Match phone" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const CONTRAST_CHOICES: { value: ContrastPref; label: string }[] = [
  { value: "auto", label: "Match phone" },
  { value: "standard", label: "Standard" },
  { value: "high", label: "High" },
];

function Choice<T extends string>({ name, legend, choices, value, onChoose }: { name: string; legend: string; choices: { value: T; label: string }[]; value: T; onChoose: (v: T) => void }) {
  return (
    <fieldset className="setting">
      <legend>{legend}</legend>
      <div className="segmented">
        {choices.map((c) => (
          <label key={c.value}>
            <input type="radio" name={name} value={c.value} checked={value === c.value} onChange={() => onChoose(c.value)} />
            {c.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function DisplaySettings() {
  const [theme, setTheme] = useState(getThemePref);
  const [contrast, setContrast] = useState(getContrastPref);
  // The header button changes the theme too; keep these radios in step with it.
  useEffect(() => onDisplayChange(() => { setTheme(getThemePref()); setContrast(getContrastPref()); }), []);
  return (
    <section className="card" aria-label="Display">
      <p className="muted">"Match phone" follows the phone's own Dark Mode and Increase Contrast settings. Dark is easier on the eyes on night shifts. High contrast uses black or white text, darker colors and thicker outlines, for bright light or low vision.</p>
      <Choice name="theme" legend="Appearance" choices={THEME_CHOICES} value={theme} onChoose={setThemePref} />
      <Choice name="contrast" legend="Contrast" choices={CONTRAST_CHOICES} value={contrast} onChoose={setContrastPref} />
    </section>
  );
}
