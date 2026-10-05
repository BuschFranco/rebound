/**
 * Productos favoritos del cliente (ids, el último marcado primero), sin registro ni servidor.
 *
 * Se guardan en localStorage y, como respaldo, en una cookie propia y funcional (sin datos personales):
 * si se borra el localStorage, se recuperan de la cookie. Se sincronizan entre pestañas.
 */
const STORAGE_KEY = "rebound-favorites-v1";
const COOKIE = "rebound-favorites";
const MAX = 60;
const ONE_YEAR = 60 * 60 * 24 * 365;
const EMPTY: string[] = [];

let ids: string[] | undefined;
const listeners = new Set<() => void>();

function clean(list: unknown): string[] {
  return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string" && v.length > 0).slice(0, MAX) : EMPTY;
}

function readCookie(): string[] {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return EMPTY;
  return clean(decodeURIComponent(raw.slice(COOKIE.length + 1)).split(","));
}

function writeCookie(next: string[]) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = next.length
    ? `${COOKIE}=${encodeURIComponent(next.join(","))}; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax${secure}`
    : `${COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}

function read(): string[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return clean(JSON.parse(stored));
  } catch {
    // localStorage bloqueado o dañado: se intenta con la cookie.
  }
  const fromCookie = readCookie();
  if (fromCookie.length) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fromCookie));
    } catch {
      // Sin storage: alcanza con la cookie.
    }
  }
  return fromCookie;
}

function write(next: string[]) {
  ids = next;
  try {
    if (next.length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sin storage: queda la cookie.
  }
  writeCookie(next);
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  ids = read();
  listeners.forEach((l) => l());
}

export const favoritesStore = {
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
  /** Marca o desmarca. Al marcar, queda primero. */
  toggle(id: string) {
    const current = favoritesStore.getSnapshot();
    write(current.includes(id) ? current.filter((v) => v !== id) : [id, ...current].slice(0, MAX));
  },
  remove(id: string) {
    write(favoritesStore.getSnapshot().filter((v) => v !== id));
  },
  clear() {
    write(EMPTY);
  },
};
