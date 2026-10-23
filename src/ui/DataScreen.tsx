// Screen 4: welcome, patients, demo data, backup and export, install, and about.

import { useEffect, useRef, useState } from "react";
import { db, localMidnight, type Patient } from "../data/db";
import { loadDemoData } from "../data/seed";
import { buildExport, download } from "../data/exporter";
import { deletePatient, removeDemoData, restoreBackup } from "../data/manage";
import { RATING_LABELS, ratingFromCount, RULE_VERSION, WINDOW_DAYS } from "../scoring/engine";
import { ago, shortDate } from "./format";
import { Icon } from "./Icon";
import { PatientAvatar } from "./PatientAvatar";
import { canInstall, install, isInstalled, onInstallChange } from "./install";
import { getContrastPref, setContrastPref, type ContrastPref } from "./contrast";

interface Props {
  patients: Patient[];
  current: string | null;
  onPatient: (id: string) => void;
  onChange: () => void;
}

type Msg = { at: "patients" | "demo" | "export" | "safe"; text: string; tone?: "error" };

const LAST_EXPORT = "cmai-last-export";
const readLastExport = () => {
  try { return Number(localStorage.getItem(LAST_EXPORT)) || null; } catch { return null; }
};

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

export function DataScreen({ patients, current, onPatient, onChange }: Props) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<Msg | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState(readLastExport);
  const [, setInstallTick] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const hasDemo = patients.some((p) => p.demo);
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
        <form className="row" onSubmit={addPatient}>
          <input
            ref={codeInput}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="P-03"
            aria-label="New patient code"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            maxLength={12}
          />
          <button type="submit">Add</button>
        </form>
        {msgFor("patients")}
        {patients.length > 0 && (
          <ul className="patient-list">
            {patients.map((p) => (
              <li key={p.id} className={p.id === current ? "current" : ""}>
                {confirmDelete === p.id ? (
                  <div className="confirm" role="group" aria-label={`Confirm deleting ${p.id}`}>
                    <p><b>Delete {p.id}?</b> This removes all of its logs, reviews and check-ins from this phone, and cannot be undone. Export a backup first if you may need them.</p>
                    <div className="row wrap">
                      <button className="danger" onClick={() => remove(p.id)}>Delete {p.id}</button>
                      <button className="ghost" autoFocus onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <PatientAvatar id={p.id} size={36} />
                    <div className="patient-main">
                      <b>{p.id}</b>
                      {p.demo && <span className="tag">demo</span>}
                      <span className="muted">{p.id === current ? "Open now · " : ""}Period 1 started {shortDate(p.anchor)}</span>
                    </div>
                    <div className="row">
                      {p.id !== current && <button className="ghost small" onClick={() => onPatient(p.id)}>Open</button>}
                      <button className="ghost small danger-text" aria-label={`Delete ${p.id}`} onClick={() => setConfirmDelete(p.id)}>Delete</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!firstRun && (
        <section className="card" aria-labelledby="demo-h">
          <h2 id="demo-h">Demo data</h2>
          <p className="muted">Two made-up patients with six weeks of logs, so every chart has something to show. Loading again resets them.</p>
          <div className="row wrap">
            <button className={hasDemo ? "ghost" : ""} onClick={demo}>{hasDemo ? "Reset demo data" : "Load demo data"}</button>
            {hasDemo && <button className="ghost danger-text" onClick={clearDemo}>Remove demo data</button>}
          </div>
          {msgFor("demo")}
        </section>
      )}

      <section className="card" aria-labelledby="export-h">
        <h2 id="export-h">Backup and export</h2>
        <p className="muted">
          The backup holds everything and can be restored on this or another phone. The CSVs open in Excel for the research team: one row per logged behavior, and one row per patient, period and behavior.
        </p>
        <p className="muted">Last export: <b>{lastExport ? `${ago(lastExport)} (${shortDate(lastExport)})` : "never"}</b></p>
        <div className="row wrap">
          <button onClick={() => exportFile("json")} disabled={firstRun}><Icon name="download" /> Download backup</button>
          <button className="ghost" onClick={() => exportFile("observations")} disabled={firstRun}>Logs CSV</button>
          <button className="ghost" onClick={() => exportFile("scores")} disabled={firstRun}>Scores CSV</button>
        </div>
        <div className="row wrap restore">
          <button className="ghost" onClick={() => fileInput.current?.click()}><Icon name="upload" /> Restore from backup</button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
        </div>
        {msgFor("export")}
      </section>

      <section className="card" aria-labelledby="safe-h">
        <h2 id="safe-h">Keep data safe on this phone</h2>
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

      <DisplaySettings />

      <section className="card" aria-labelledby="about-h">
        <h2 id="about-h">How ratings are worked out</h2>
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
    </div>
  );
}

const CONTRAST_CHOICES: { value: ContrastPref; label: string }[] = [
  { value: "auto", label: "Match phone" },
  { value: "standard", label: "Standard" },
  { value: "high", label: "High" },
];

function DisplaySettings() {
  const [contrast, setContrast] = useState(getContrastPref);
  const choose = (pref: ContrastPref) => {
    setContrast(pref);
    setContrastPref(pref);
  };
  return (
    <section className="card" aria-labelledby="display-h">
      <h2 id="display-h">Display</h2>
      <p className="muted">High contrast uses black text, darker colors and thicker outlines, for bright light or low vision. "Match phone" turns it on when the phone's Increase Contrast setting is on.</p>
      <fieldset className="segmented">
        <legend>Contrast</legend>
        {CONTRAST_CHOICES.map((c) => (
          <label key={c.value}>
            <input type="radio" name="contrast" value={c.value} checked={contrast === c.value} onChange={() => choose(c.value)} />
            {c.label}
          </label>
        ))}
      </fieldset>
    </section>
  );
}
