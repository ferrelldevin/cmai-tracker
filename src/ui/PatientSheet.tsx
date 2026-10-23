// Patient switcher: a bottom sheet (centered on desktop) listing every patient with the
// details that tell them apart: color badge, code, period and day, and last log.
// Built on the native <dialog>, which traps focus, closes on Esc and makes the page behind
// it inert. Design note: docs/design/notes/002-patient-switcher.md.

import { useEffect, useRef, useState } from "react";
import type { Patient } from "../data/db";
import { patientSummaries, type PatientSummary } from "../data/patients";
import { lastSeen } from "./format";
import { Icon } from "./Icon";
import { PatientAvatar } from "./PatientAvatar";

const SEARCH_FROM = 8; // a search box appears once the list is this long

interface Props {
  open: boolean;
  patients: Patient[];
  current: string | null;
  onPick: (id: string) => void;
  onManage: () => void;
  onClose: () => void;
}

export function PatientSheet({ open, patients, current, onPick, onManage, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<PatientSummary[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      setQuery("");
      d.showModal();
      // Start on the current patient, so a quick confirm is one tap away.
      d.querySelector<HTMLElement>('[aria-current="true"]')?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    patientSummaries(patients, Date.now()).then((r) => live && setRows(r)).catch(() => live && setRows(null));
    return () => { live = false; };
  }, [open, patients]);

  const list = (rows ?? patients.map((p) => ({ ...p, period: 0, day: 0, lastLogged: undefined as number | null | undefined })))
    .filter((p) => p.id.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby="sheet-h"
      onClose={onClose}
      onClick={(e) => { if (e.target === dialog.current) onClose(); }}
    >
      <div className="sheet-body">
        <div className="sheet-grab" aria-hidden />
        <div className="sheet-head">
          <h2 id="sheet-h">Choose patient</h2>
          <button className="ghost small sheet-close" onClick={onClose}>Close</button>
        </div>
        {patients.length >= SEARCH_FROM && (
          <input
            className="sheet-search"
            type="search"
            placeholder="Find a code"
            aria-label="Find a patient by code"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        )}
        <ul className="sheet-list">
          {list.map((p) => {
            const isCurrent = p.id === current;
            return (
              <li key={p.id}>
                <button className="sheet-row" aria-current={isCurrent} onClick={() => onPick(p.id)}>
                  <PatientAvatar id={p.id} size={40} />
                  <span className="sheet-text">
                    <span className="sheet-code">{p.id}{p.demo && <span className="tag">demo</span>}</span>
                    {p.period > 0 && <span className="sheet-meta">Period {p.period} · day {p.day} of 14</span>}
                    {p.lastLogged !== undefined && <span className="sheet-meta">{p.lastLogged === null ? "No logs yet" : `Last log ${lastSeen(p.lastLogged)}`}</span>}
                  </span>
                  {isCurrent && <Icon name="check" size={22} className="sheet-check" />}
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li className="sheet-empty muted">No patient code contains "{query}".</li>}
        </ul>
        <button className="ghost sheet-manage" onClick={onManage}><Icon name="data" size={18} /> Manage patients</button>
      </div>
    </dialog>
  );
}
