// Display settings: stored choices, the phone's own settings, and what lands on <html>.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyDisplay, currentTheme, getContrastPref, getThemePref, isHighContrast, onDisplayChange, resolveTheme, setContrastPref, setThemePref, toggleTheme } from "../src/ui/display";

const phone = { dark: false, moreContrast: false };
const store = new Map<string, string>();
let root: { dataset: Record<string, string>; classList: { add(): void; remove(): void } };
let barColor = "";

beforeEach(() => {
  phone.dark = false;
  phone.moreContrast = false;
  store.clear();
  root = { dataset: {}, classList: { add() {}, remove() {} } };
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal("window", {
    matchMedia: (q: string) => ({ matches: q.includes("dark") ? phone.dark : phone.moreContrast, addEventListener() {} }),
  });
  vi.stubGlobal("document", { documentElement: root, querySelector: () => ({ setAttribute: (_: string, v: string) => (barColor = v) }) });
});

describe("theme", () => {
  it("follows the phone by default", () => {
    expect(getThemePref()).toBe("auto");
    expect(resolveTheme()).toBe("light");
    phone.dark = true;
    applyDisplay();
    expect(root.dataset.theme).toBe("dark");
    expect(barColor).toBe("#0e1417");
  });

  it("an explicit choice overrides the phone and is remembered", () => {
    phone.dark = true;
    setThemePref("light");
    expect(root.dataset.theme).toBe("light");
    expect(store.get("cmai-theme")).toBe("light");
    expect(barColor).toBe("#f6f5f1");
  });

  it("the header toggle flips what is on screen and keeps it", () => {
    applyDisplay();
    expect(currentTheme()).toBe("light");
    toggleTheme();
    expect(currentTheme()).toBe("dark");
    expect(getThemePref()).toBe("dark");
    toggleTheme();
    expect(getThemePref()).toBe("light");
  });

  it("going back to Match phone forgets the stored choice", () => {
    setThemePref("dark");
    setThemePref("auto");
    expect(store.has("cmai-theme")).toBe(false);
    expect(root.dataset.theme).toBe("light");
  });

  it("ignores a junk stored value", () => {
    store.set("cmai-theme", "sepia");
    expect(getThemePref()).toBe("auto");
  });

  it("tells listeners, so the header button and settings stay in step", () => {
    const seen: string[] = [];
    const stop = onDisplayChange(() => seen.push(currentTheme()));
    toggleTheme();
    stop();
    toggleTheme();
    expect(seen).toEqual(["dark"]);
  });
});

describe("contrast", () => {
  it("follows the phone by default", () => {
    expect(getContrastPref()).toBe("auto");
    expect(isHighContrast()).toBe(false);
    phone.moreContrast = true;
    expect(isHighContrast()).toBe(true);
  });

  it("an explicit choice overrides the phone", () => {
    phone.moreContrast = true;
    setContrastPref("standard");
    expect(root.dataset.contrast).toBeUndefined();
    setContrastPref("high");
    expect(root.dataset.contrast).toBe("high");
  });

  it("works with either theme and sets the status bar to match", () => {
    setContrastPref("high");
    expect(barColor).toBe("#ffffff");
    setThemePref("dark");
    expect(root.dataset).toMatchObject({ theme: "dark", contrast: "high" });
    expect(barColor).toBe("#000000");
  });
});
