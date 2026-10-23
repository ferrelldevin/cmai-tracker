// The contrast setting: stored choice, device preference, and the attribute it sets.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyContrast, getContrastPref, isHighContrast, setContrastPref } from "../src/ui/contrast";

let deviceWantsMore = false;
const store = new Map<string, string>();

beforeEach(() => {
  deviceWantsMore = false;
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal("window", { matchMedia: () => ({ matches: deviceWantsMore, addEventListener() {} }) });
  vi.stubGlobal("document", { documentElement: { dataset: {} as Record<string, string> } });
});

describe("contrast setting", () => {
  it("defaults to following the device", () => {
    expect(getContrastPref()).toBe("auto");
    expect(isHighContrast()).toBe(false);
    deviceWantsMore = true;
    expect(isHighContrast()).toBe(true);
  });

  it("an explicit choice overrides the device", () => {
    deviceWantsMore = true;
    setContrastPref("standard");
    expect(getContrastPref()).toBe("standard");
    expect(document.documentElement.dataset.contrast).toBeUndefined();
    deviceWantsMore = false;
    setContrastPref("high");
    expect(document.documentElement.dataset.contrast).toBe("high");
  });

  it("going back to auto forgets the stored choice", () => {
    setContrastPref("high");
    setContrastPref("auto");
    expect(store.has("cmai-contrast")).toBe(false);
    applyContrast();
    expect(document.documentElement.dataset.contrast).toBeUndefined();
  });

  it("ignores a junk stored value", () => {
    store.set("cmai-contrast", "neon");
    expect(getContrastPref()).toBe("auto");
  });
});
