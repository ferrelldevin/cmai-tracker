// Where the app is, kept in the URL hash: #/log, #/scores, #/review, #/data, #/data/<page>.
// Switching tabs replaces the history entry (the platform norm: Back does not walk through
// tab taps). Opening a Data page pushes one, so the back gesture returns to the Data hub.
// A reload lands on the same screen.

import { useEffect, useRef, useState } from "react";

export type Tab = "log" | "scores" | "review" | "data";
export type DataPage = "backup" | "display" | "safe" | "demo" | "about";
export interface Route { tab: Tab; page: DataPage | null }

const TABS: readonly Tab[] = ["log", "scores", "review", "data"];
const PAGES: readonly DataPage[] = ["backup", "display", "safe", "demo", "about"];

export function parseRoute(hash: string): Route | null {
  const [tab, page] = hash.replace(/^#\/?/, "").split("/");
  if (!TABS.includes(tab as Tab)) return null;
  return { tab: tab as Tab, page: tab === "data" && PAGES.includes(page as DataPage) ? (page as DataPage) : null };
}

export const routeHash = (r: Route) => `#/${r.tab}${r.page ? `/${r.page}` : ""}`;

/**
 * The current route, plus go() and back(). Only a Data page is pushed onto history, and
 * leaving it by any route pops it first, so the stack never holds more than hub + page.
 */
export function useRoute(fallback: () => Route) {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash) ?? fallback());
  const pending = useRef<Route | null>(null);

  useEffect(() => {
    const sync = () => {
      const target = pending.current;
      pending.current = null;
      if (target) history.replaceState(null, "", routeHash(target));
      setRoute(target ?? parseRoute(location.hash) ?? fallback());
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
    // fallback only matters when the hash is empty or unknown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushed = () => (history.state as { cmaiPage?: boolean } | null)?.cmaiPage === true;

  const go = (next: Route) => {
    if (route.page && pushed() && !next.page) {
      // Pop the page we pushed, then land on the target in its place.
      pending.current = next;
      history.back();
      return;
    }
    const hash = routeHash(next);
    if (next.page && !route.page) history.pushState({ cmaiPage: true }, "", hash);
    else if (hash !== location.hash) history.replaceState(null, "", hash);
    setRoute(next);
  };

  const back = () => go({ tab: route.tab, page: null });
  return { route, go, back };
}
