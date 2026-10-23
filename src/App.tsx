import { useEffect, useRef, useState } from "react";
import { DataScreen } from "./ui/DataScreen";
import { LogScreen } from "./ui/LogScreen";
import { ReviewScreen } from "./ui/ReviewScreen";
import { ScoresScreen } from "./ui/ScoresScreen";
import { Icon, type IconName } from "./ui/Icon";
import { PatientAvatar } from "./ui/PatientAvatar";
import { useCmaiData } from "./ui/useCmaiData";

type Tab = "log" | "scores" | "review" | "data";

const TABS: { id: Tab; label: string; title: string; icon: IconName }[] = [
  { id: "log", label: "Log", title: "Log a behavior", icon: "plus" },
  { id: "scores", label: "Scores", title: "Scores", icon: "chart" },
  { id: "review", label: "Review", title: "Day-14 review", icon: "review" },
  { id: "data", label: "Data", title: "Patients and data", icon: "data" },
];

const readSaved = () => {
  try { return localStorage.getItem("cmai-patient"); } catch { return null; }
};

export default function App() {
  const [patientId, setPatientId] = useState<string | null>(readSaved);
  const [tab, setTab] = useState<Tab>(() => (readSaved() ? "log" : "data"));
  const { patients, observations, checkins, windows, refresh, loaded, everLoaded, error } = useCmaiData(patientId);
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    try { if (patientId) localStorage.setItem("cmai-patient", patientId); else localStorage.removeItem("cmai-patient"); } catch { /* private mode */ }
  }, [patientId]);

  useEffect(() => {
    if (!loaded) return;
    if (patients.length && !patients.some((p) => p.id === patientId)) setPatientId(patients[0].id);
    if (!patients.length && patientId) setPatientId(null);
  }, [loaded, patients, patientId]);

  // A new screen starts at the top, and screen readers land on its heading.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [tab]);

  const hasPatient = !!patientId && patients.some((p) => p.id === patientId);
  const shown: Tab = hasPatient ? tab : "data";
  const current = patients.find((p) => p.id === patientId);

  // Nudge on the Review tab when the latest finished period has no review yet.
  const finished = windows.filter((w) => !w.score.provisional);
  const reviewDue = finished.length > 0 && Object.keys(finished[finished.length - 1].review).length === 0;
  const open = windows[windows.length - 1];
  const periodLine = open ? `Period ${windows.length} · day ${Math.min(14, open.elapsed + 1)} of 14` : "";

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <img src="icon.svg" alt="" width="28" height="28" />
          <b>CMAI Tracker</b>
        </div>
        {hasPatient && current && (
          <div className="pt-banner">
            <PatientAvatar id={current.id} />
            <div className="pt-id">
              <b>{current.id}</b>
              {current.demo && <span className="tag">demo</span>}
              <span className="pt-meta">{periodLine}</span>
            </div>
            {patients.length > 1 && (
              <>
                <span className="pt-switch-hint" aria-hidden>Switch <Icon name="chevron" size={18} /></span>
                {/* The whole banner opens the phone's own picker: a big target, native on every platform. */}
                <select className="pt-select" aria-label={`Patient: ${current.id}. Switch patient`} value={patientId ?? ""} onChange={(e) => setPatientId(e.target.value)}>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.id}{p.demo ? " (demo)" : ""}</option>)}
                </select>
              </>
            )}
          </div>
        )}
      </header>

      {error && (
        <div className="banner" role="alert">
          <b>This browser is not letting the app save data.</b> Private browsing, a full phone, or blocked site data can cause this. Open the app in a normal Safari or Chrome window and try again.
          <span className="muted"> Details: {error}</span>
        </div>
      )}

      <main ref={mainRef} tabIndex={-1} aria-busy={!everLoaded}>
        <h1 className="sr">{TABS.find((t) => t.id === shown)!.title}{current ? `, ${current.id}` : ""}</h1>
        {!everLoaded ? (
          <div className="loading" role="status"><span className="spinner" aria-hidden /> Loading…</div>
        ) : shown === "data" ? (
          <DataScreen patients={patients} current={hasPatient ? patientId : null} onPatient={(id) => { setPatientId(id); setTab("log"); }} onChange={refresh} />
        ) : shown === "log" ? (
          <LogScreen patientId={patientId!} observations={observations} checkins={checkins} onChange={refresh} />
        ) : shown === "scores" ? (
          <ScoresScreen key={patientId} windows={windows} observations={observations} onLog={() => setTab("log")} />
        ) : (
          <ReviewScreen key={patientId} patientId={patientId!} windows={windows} onChange={refresh} />
        )}
      </main>

      <nav className="tabs" aria-label="Screens">
        <div className="tabs-inner">
          {TABS.map(({ id, label, title, icon }) => (
            <button
              key={id}
              className={shown === id ? "on" : ""}
              aria-current={shown === id ? "page" : undefined}
              aria-label={id === "review" && reviewDue ? `${title}, review due` : title}
              onClick={() => setTab(id)}
              disabled={id !== "data" && !hasPatient}
            >
              <span className="tab-icon" aria-hidden>
                <Icon name={icon} size={22} />
                {id === "review" && reviewDue && <span className="badge" />}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
