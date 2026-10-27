import { useEffect, useRef, useState } from "react";
import { DataScreen } from "./ui/DataScreen";
import { LogScreen } from "./ui/LogScreen";
import { ScoresScreen } from "./ui/ScoresScreen";
import { Icon, type IconName } from "./ui/Icon";
import { PatientAvatar } from "./ui/PatientAvatar";
import { PatientSheet } from "./ui/PatientSheet";
import { patientPosition } from "./data/patients";
import { useCmaiData } from "./ui/useCmaiData";
import { currentTheme, onDisplayChange, toggleTheme } from "./ui/display";
import { useRoute, type DataPage, type Tab } from "./ui/route";

const TABS: { id: Tab; label: string; title: string; icon: IconName }[] = [
  { id: "log", label: "Log", title: "Log a behavior", icon: "plus" },
  { id: "scores", label: "Scores", title: "Scores", icon: "chart" },
  { id: "data", label: "Data", title: "Patients and data", icon: "data" },
];

const PAGE_TITLES: Record<DataPage, string> = {
  backup: "Backup and export",
  display: "Display",
  safe: "Keep data safe",
  demo: "Demo data",
  about: "How ratings are worked out",
};

const readSaved = () => {
  try { return localStorage.getItem("cmai-patient"); } catch { return null; }
};

export default function App() {
  const [patientId, setPatientId] = useState<string | null>(readSaved);
  const { route, go, back } = useRoute(() => ({ tab: readSaved() ? "log" : "data", page: null }));
  const tab = route.tab;
  // The Scores period chosen for each patient, so leaving Scores and coming back keeps it.
  const scoresPeriod = useRef<Record<string, number>>({});
  if (route.tab === "scores" && route.period && patientId) scoresPeriod.current[patientId] = route.period;
  const scoresRoute = (id: string | null) => ({ tab: "scores" as const, page: null, period: id ? scoresPeriod.current[id] : undefined });
  const setTab = (t: Tab) => go(t === "scores" ? scoresRoute(patientId) : { tab: t, page: null });
  const { patients, observations, checkins, windows, refresh, loaded, everLoaded, error } = useCmaiData(patientId);
  const mainRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
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
  }, [tab, route.page]);

  const hasPatient = !!patientId && patients.some((p) => p.id === patientId);

  // The section bars pin just under the patient banner, so they need its height.
  useEffect(() => {
    const el = pinRef.current;
    const set = () => document.documentElement.style.setProperty("--pin-h", `${el ? el.offsetHeight : 0}px`);
    set();
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasPatient]);

  // Switching patient: close the sheet, then say who is now open (announced, and a banner flash).
  const [choosing, setChoosing] = useState(false);
  const [choosingByKey, setChoosingByKey] = useState(false);
  const [notice, setNotice] = useState("");
  const [switched, setSwitched] = useState(false);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => { setNotice(""); setSwitched(false); }, 4000);
    return () => clearTimeout(t);
  }, [notice]);

  function pickPatient(id: string) {
    setChoosing(false);
    if (id === patientId) return;
    setPatientId(id);
    // A period number belongs to one patient: Scores reopens on this patient's own choice.
    if (route.tab === "scores") go(scoresRoute(id));
    setNotice(`Now on ${id}`);
    setSwitched(true);
  }

  function onTab(id: Tab) {
    if (id !== tab) return setTab(id);
    // Tapping the tab you are on: leave a Data page, or go back to the top (iOS convention).
    if (route.page) return back();
    window.scrollTo({ top: 0, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  const shown: Tab = hasPatient ? tab : "data";
  const current = patients.find((p) => p.id === patientId);

  const pos = current ? patientPosition(current.anchor, Date.now()) : null;
  const periodLine = pos ? `Period ${pos.period} · day ${pos.day} of 14` : "";

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <img src="icon.svg" alt="" width="28" height="28" />
          <b>CMAI Tracker</b>
          <ThemeButton />
        </div>
      </header>

      {hasPatient && current && (
        <div className="pin" ref={pinRef}>
          <button
            className={switched ? "pt-banner switched" : "pt-banner"}
            aria-haspopup="dialog"
            onClick={(e) => { setChoosingByKey(e.detail === 0); setChoosing(true); }}
          >
            <PatientAvatar id={current.id} />
            <span className="pt-id">
              <b>{current.id}</b>
              {current.demo && <span className="tag">demo</span>}
              <span className="pt-meta">{tab === "scores" ? "Current: " : ""}{periodLine}</span>
            </span>
            <span className="pt-switch-hint" aria-hidden>{patients.length > 1 ? "Switch" : "Patients"} <Icon name="chevron" size={18} /></span>
            <span className="sr">Choose patient</span>
          </button>
          <p className={notice ? "switch-notice on" : "switch-notice"} role="status">
            {notice && <><Icon name="check" size={16} /> {notice}</>}
          </p>
        </div>
      )}

      {error && (
        <div className="banner" role="alert">
          <b>This browser is not letting the app save data.</b> Private browsing, a full phone, or blocked site data can cause this. Open the app in a normal Safari or Chrome window and try again.
          <span className="muted"> Details: {error}</span>
        </div>
      )}

      <main ref={mainRef} tabIndex={-1} aria-busy={!everLoaded}>
        <h1 className="sr">{shown === "data" && route.page ? PAGE_TITLES[route.page] : TABS.find((t) => t.id === shown)!.title}{current ? `, ${current.id}` : ""}</h1>
        {!everLoaded ? (
          <div className="loading" role="status"><span className="spinner" aria-hidden /> Loading…</div>
        ) : shown === "data" ? (
          <DataScreen
            patients={patients}
            current={hasPatient ? patientId : null}
            page={route.page}
            pageTitle={route.page ? PAGE_TITLES[route.page] : ""}
            onPage={(page) => go({ tab: "data", page })}
            onBack={back}
            onPatient={(id) => { pickPatient(id); setTab("log"); }}
            onChange={refresh}
          />
        ) : shown === "log" ? (
          <LogScreen patientId={patientId!} observations={observations} checkins={checkins} onChange={refresh} />
        ) : loaded && !error ? (
          <ScoresScreen key={patientId} patientId={patientId!} windows={windows} observations={observations} hasActivity={observations.length > 0 || checkins.length > 0} period={route.period} onPeriod={(n) => go({ tab: "scores", page: null, period: n })} onLog={() => setTab("log")} />
        ) : (
          <div className="loading" role="status">{error ? "Scores are unavailable while saved data cannot be read." : "Loading scores…"}</div>
        )}
      </main>

      <PatientSheet
        viaKeyboard={choosingByKey}
        open={choosing}
        patients={patients}
        current={hasPatient ? patientId : null}
        onPick={pickPatient}
        onManage={() => { setChoosing(false); go({ tab: "data", page: null }); }}
        onClose={() => setChoosing(false)}
      />

      <nav className="tabs" aria-label="Screens">
        <div className="tabs-inner">
          {TABS.map(({ id, label, title, icon }) => (
            <button
              key={id}
              className={shown === id ? "on" : ""}
              aria-current={shown === id ? "page" : undefined}
              aria-label={title}
              onClick={() => onTab(id)}
              disabled={id !== "data" && !hasPatient}
            >
              <span className="tab-icon" aria-hidden><Icon name={icon} size={22} /></span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// Quick light/dark switch in the header. The full choice, including "Match phone", is on the Data screen.
function ThemeButton() {
  const [theme, setTheme] = useState(currentTheme);
  useEffect(() => onDisplayChange(() => setTheme(currentTheme())), []);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button className="theme-btn ghost" onClick={toggleTheme} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      <Icon name={theme === "dark" ? "sun" : "moon"} size={20} />
    </button>
  );
}
