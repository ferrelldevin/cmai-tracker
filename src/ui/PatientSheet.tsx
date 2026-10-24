// Patient switcher: a sheet listing every patient with the details that tell them apart:
// color badge, code, period and day, and last log. Design note: docs/design/notes/002-patient-switcher.md.

import { useEffect, useState } from "react";
import type { Patient } from "../data/db";
import { patientSummaries, type PatientSummary } from "../data/patients";
import { lastSeen } from "./format";
import { Icon } from "./Icon";
import { PatientAvatar } from "./PatientAvatar";
import { Sheet } from "./Sheet";

const SEARCH_FROM = 8; // a search box appears once the list is this long

interface Props {
  open: boolean;
  /** Opened from the keyboard: start on the current row. From touch or mouse: start on the sheet itself, so no focus ring appears. */
  viaKeyboard: boolean;
  patients: Patient[];
  current: string | null;
  onPick: (id: string) => void;
  onManage: () => void;
  onClose: () => void;
}

export function PatientSheet({ open, viaKeyboard, patients, current, onPick, onManage, onClose }: Props) {
  const [rows, setRows] = useState<PatientSummary[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => { if (open) setQuery(""); }, [open]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    patientSummaries(patients, Date.now()).then((r) => live && setRows(r)).catch(() => live && setRows(null));
    return () => { live = false; };
  }, [open, patients]);

  const list = (rows ?? patients.map((p) => ({ ...p, period: 0, day: 0, lastLogged: undefined as number | null | undefined })))
    .filter((p) => p.id.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Sheet open={open} viaKeyboard={viaKeyboard} keyboardFocus='[aria-current="true"]' title="Choose patient" onClose={onClose}>
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
    </Sheet>
  );
}
