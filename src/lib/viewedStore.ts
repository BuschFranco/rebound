/**
 * Productos que el cliente visitó (ids, el más reciente primero), guardados solo en su navegador.
 * Alimenta "Volvé a verlos" y "Basado en lo que viste" en la home. Sin registro ni servidor.
 */
const STORAGE_KEY = "rebound-viewed-v1";
const MAX = 12;
const EMPTY: string[] = [];

let ids: string[] | undefined;
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string").slice(0, MAX) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(next: string[]) {
  ids = next;
  try {
    if (next.length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sin storage: el historial vive solo mientras dure la pestaña.
  }
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  ids = read();
  listeners.forEach((l) => l());
}

export const viewedStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): string[] {
    if (ids === undefined) ids = read();
    return ids;
  },
  getServerSnapshot(): string[] {
    return EMPTY;
  },
  /** Registra una visita: lo pone primero y saca duplicados. */
  add(id: string) {
    const current = viewedStore.getSnapshot();
    if (current[0] === id) return;
    write([id, ...current.filter((v) => v !== id)].slice(0, MAX));
  },
  clear() {
    write(EMPTY);
  },
};
