import type { CartItem } from "@/types";

const STORAGE_KEY = "rebound-cart-v1";
const EMPTY: CartItem[] = [];

let items: CartItem[] | null = null;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartItem[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(next: CartItem[]) {
  items = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, blocked): the cart still works in memory.
  }
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  items = read();
  listeners.forEach((l) => l());
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): CartItem[] {
    if (items === null) items = read();
    return items;
  },
  getServerSnapshot(): CartItem[] {
    return EMPTY;
  },
  add(item: CartItem) {
    const current = cartStore.getSnapshot();
    const existing = current.find((i) => i.key === item.key);
    write(
      existing
        ? current.map((i) => (i.key === item.key ? { ...i, quantity: i.quantity + item.quantity } : i))
        : [...current, item],
    );
  },
  updateQty(key: string, quantity: number) {
    const current = cartStore.getSnapshot();
    write(
      quantity <= 0
        ? current.filter((i) => i.key !== key)
        : current.map((i) => (i.key === key ? { ...i, quantity } : i)),
    );
  },
  remove(key: string) {
    write(cartStore.getSnapshot().filter((i) => i.key !== key));
  },
  clear() {
    write(EMPTY);
  },
};
