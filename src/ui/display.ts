// Display settings: theme (light or dark) and contrast. Each is "auto" by default, which follows
// the phone: Dark Mode through prefers-color-scheme, Increase Contrast through prefers-contrast.
// A choice is stored on this device only. The resolved values are written to <html> as
// data-theme="light|dark" and data-contrast="high", which switch the tokens in styles.css,
// and to the theme-color meta, which colors the phone's status bar.
//
// index.html runs a copy of resolve-and-apply inline, before the first paint, so the app never
// flashes the wrong theme. Keep the two in step.

export type ThemePref = "auto" | "light" | "dark";
export type ContrastPref = "auto" | "standard" | "high";
export type Theme = "light" | "dark";

const THEME_KEY = "cmai-theme";
const CONTRAST_KEY = "cmai-contrast";

// The canvas color (--bg) of each mode, for the status bar.
const BAR_COLOR = { light: "#f6f5f1", dark: "#0e1417", "light-high": "#ffffff", "dark-high": "#000000" };

const media = (q: string) => window.matchMedia?.(q);
const listeners = new Set<() => void>();

function read<T extends string>(key: string, allowed: readonly T[]): T | "auto" {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : "auto";
  } catch {
    return "auto";
  }
}

function write(key: string, value: string) {
  try {
    if (value === "auto") localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* private mode: still applies for this visit */ }
}

export const getThemePref = (): ThemePref => read(THEME_KEY, ["light", "dark"] as const);
export const getContrastPref = (): ContrastPref => read(CONTRAST_KEY, ["standard", "high"] as const);

export function resolveTheme(pref = getThemePref()): Theme {
  if (pref !== "auto") return pref;
  return media("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

export function isHighContrast(pref = getContrastPref()) {
  return pref === "high" || (pref === "auto" && !!media("(prefers-contrast: more)")?.matches);
}

/** The theme on screen right now. */
export const currentTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function applyDisplay() {
  const root = document.documentElement;
  const theme = resolveTheme();
  const high = isHighContrast();
  // Colors switch at once rather than fading button by button.
  root.classList?.add("no-transitions");
  root.dataset.theme = theme;
  if (high) root.dataset.contrast = "high";
  else delete root.dataset.contrast;
  document.querySelector?.('meta[name="theme-color"]')?.setAttribute("content", BAR_COLOR[high ? (`${theme}-high` as const) : theme]);
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("no-transitions")));
  listeners.forEach((l) => l());
}

export function setThemePref(pref: ThemePref) {
  write(THEME_KEY, pref);
  applyDisplay();
}

export function setContrastPref(pref: ContrastPref) {
  write(CONTRAST_KEY, pref);
  applyDisplay();
}

/** The header button: flip to the other theme and keep it, whatever the phone says. */
export const toggleTheme = () => setThemePref(currentTheme() === "dark" ? "light" : "dark");

export function onDisplayChange(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** Applies the stored choices now and again whenever the phone's settings change. */
export function listenForDisplay() {
  applyDisplay();
  media("(prefers-color-scheme: dark)")?.addEventListener?.("change", applyDisplay);
  media("(prefers-contrast: more)")?.addEventListener?.("change", applyDisplay);
}
