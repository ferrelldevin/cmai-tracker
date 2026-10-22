// Screen 4: patients, demo data, export, and install.

import { useEffect, useState } from "react";
import { db, localMidnight } from "../data/db";
import { loadDemoData } from "../data/seed";
import { buildExport, download } from "../data/exporter";

interface Props {
  onPatient: (id: string) => void;
  onChange: () => void;
}

export function DataScreen({ onPatient, onChange }: Props) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  async function addPatient() {
    const id = code.trim().toUpperCase();
    if (!/^[A-Z0-9-]{2,12}$/.test(id)) return setMsg("Use a code like P-03: letters, numbers, dashes. No names.");
    if (await db.patients.get(id)) return setMsg(`${id} already exists.`);
    await db.patients.add({ id, anchor: localMidnight(Date.now()) });
    setCode("");
    setMsg(`Added ${id}. Day 1 of its first 14-day period is today.`);
    onPatient(id);
    onChange();
  }

  async function demo() {
    const first = await loadDemoData();
    setMsg("Loaded six weeks of made-up data for P-DEMO-A (improving) and P-DEMO-B (worsening).");
    onPatient(first);
    onChange();
  }

  async function exportAll() {
    const stamp = new Date().toISOString().slice(0, 10);
    const out = await buildExport();
    download(`cmai-${stamp}.json`, out.json, "application/json");
    download(`cmai-observations-${stamp}.csv`, out.observationsCsv, "text/csv");
    download(`cmai-scores-${stamp}.csv`, out.scoresCsv, "text/csv");
    setMsg("Exported 3 files: everything as JSON, plus observations and scores as CSV.");
  }

  async function keepData() {
    const ok = (await navigator.storage?.persist?.()) ?? false;
    setPersisted(ok);
  }

  return (
    <div className="data">
      <section className="card">
        <h2>Add a patient</h2>
        <p className="muted">Use a code, never a name. The 14-day periods start today.</p>
        <div className="row">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="P-03" aria-label="Patient code" />
          <button onClick={addPatient}>Add</button>
        </div>
      </section>
      <section className="card">
        <h2>Demo data</h2>
        <p className="muted">Two made-up patients with six weeks of logs, so every chart has something to show.</p>
        <button onClick={demo}>Load demo data</button>
      </section>
      <section className="card">
        <h2>Export for the research team</h2>
        <p className="muted">JSON with everything, plus two CSVs: one row per logged behavior, and one row per patient, period, and behavior.</p>
        <button onClick={exportAll}>Export</button>
      </section>
      <section className="card">
        <h2>Keep data safe on this phone</h2>
        <p className="muted">
          On iPhone, Safari can clear a website's data if it goes unused for a while. Add this app to your Home Screen (Share, then Add to Home Screen) and export regularly.
        </p>
        <p>Storage protected: <b>{persisted === null ? "unknown" : persisted ? "yes" : "not yet"}</b></p>
        {!persisted && <button className="ghost" onClick={keepData}>Ask the browser to keep data</button>}
      </section>
      {msg && <p className="msg" role="status">{msg}</p>}
    </div>
  );
}
