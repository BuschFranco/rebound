const STORAGE_KEY = "rebound-promo-start-v1";

let start: number | null | undefined;
const listeners = new Set<() => void>();

function read(): number | null {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(stored) && stored > 0 && stored <= Date.now()) return stored;
    const now = Date.now();
    window.localStorage.setItem(STORAGE_KEY, String(now));
    return now;
  } catch {
    // Storage unavailable: el contador arranca ahora y dura lo que dure la pestaña.
    return Date.now();
  }
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  start = undefined;
  listeners.forEach((l) => l());
}

/** Momento (ms) del primer ingreso del visitante; el primero que llega lo guarda en localStorage. */
export const promoClock = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): number | null {
    if (start === undefined) start = read();
    return start;
  },
  getServerSnapshot(): number | null {
    return null;
  },
};
