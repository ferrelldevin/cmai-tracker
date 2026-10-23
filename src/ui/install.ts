// Install support. Chrome and Edge on Android and desktop fire `beforeinstallprompt`
// once, early, so it is caught at startup and kept for the Data screen's button.
// Safari has no prompt; the Data screen shows Add to Home Screen steps instead.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function listenForInstall() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export const canInstall = () => deferred !== null;

export const isInstalled = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export async function install() {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  listeners.forEach((l) => l());
  return outcome === "accepted";
}

export function onInstallChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
