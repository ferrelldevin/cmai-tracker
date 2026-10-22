import { useEffect, useState } from "react";
import { DataScreen } from "./ui/DataScreen";
import { LogScreen } from "./ui/LogScreen";
import { ReviewScreen } from "./ui/ReviewScreen";
import { ScoresScreen } from "./ui/ScoresScreen";
import { useCmaiData } from "./ui/useCmaiData";

type Tab = "log" | "scores" | "review" | "data";
const TABS: [Tab, string][] = [["log", "Log"], ["scores", "Scores"], ["review", "Day-14 review"], ["data", "Patients & data"]];

const readSaved = () => {
  try { return localStorage.getItem("cmai-patient"); } catch { return null; }
};

export default function App() {
  const [patientId, setPatientId] = useState<string | null>(readSaved);
  const [tab, setTab] = useState<Tab>(() => (readSaved() ? "log" : "data"));
  const { patients, observations, windows, refresh } = useCmaiData(patientId);

  useEffect(() => {
    try { if (patientId) localStorage.setItem("cmai-patient", patientId); } catch { /* private mode */ }
  }, [patientId]);

  useEffect(() => {
    if (patients.length && !patients.some((p) => p.id === patientId)) setPatientId(patients[0].id);
  }, [patients, patientId]);

  const hasPatient = !!patientId && patients.some((p) => p.id === patientId);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <b>CMAI Tracker</b>
          <span className="muted">CMAI-based ratings from event logs</span>
        </div>
        {patients.length > 0 && (
          <label className="patient">
            <span className="sr">Patient</span>
            <select value={patientId ?? ""} onChange={(e) => setPatientId(e.target.value)}>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.id}{p.demo ? " (demo)" : ""}</option>)}
            </select>
          </label>
        )}
      </header>

      <main>
        {tab === "data" || !hasPatient ? (
          <DataScreen onPatient={(id) => { setPatientId(id); setTab("log"); }} onChange={refresh} />
        ) : tab === "log" ? (
          <LogScreen patientId={patientId!} observations={observations} onChange={refresh} />
        ) : tab === "scores" ? (
          <ScoresScreen key={patientId} windows={windows} observations={observations} />
        ) : (
          <ReviewScreen key={patientId} patientId={patientId!} windows={windows} onChange={refresh} />
        )}
      </main>

      <nav className="tabs" aria-label="Screens">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)} disabled={id !== "data" && !hasPatient}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
