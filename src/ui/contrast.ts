// Contrast setting. "auto" follows the device ("Increase contrast" on iPhone and Mac,
// "High contrast text" and similar on Android and Windows via prefers-contrast: more).
// The choice is stored on this device only and applied as data-contrast="high" on <html>,
// which switches the tokens in styles.css.

export type ContrastPref = "auto" | "standard" | "high";

const KEY = "cmai-contrast";
const query = () => window.matchMedia?.("(prefers-contrast: more)");

export function getContrastPref(): ContrastPref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "standard" || v === "high" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function isHighContrast(pref = getContrastPref()) {
  return pref === "high" || (pref === "auto" && !!query()?.matches);
}

export function applyContrast(pref = getContrastPref()) {
  if (isHighContrast(pref)) document.documentElement.dataset.contrast = "high";
  else delete document.documentElement.dataset.contrast;
}

export function setContrastPref(pref: ContrastPref) {
  try {
    if (pref === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch { /* private mode: still applies for this visit */ }
  applyContrast(pref);
}

// Applies the stored choice now and again whenever the device setting changes.
export function listenForContrast() {
  applyContrast();
  query()?.addEventListener?.("change", () => applyContrast());
}
