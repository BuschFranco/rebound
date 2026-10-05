import type { CartItem } from "@/types";
import { getProductById } from "./products";

const STORAGE_KEY = "rebound-cart-v2";
/** Versión anterior: guardaba también precio y nombre, que quedaban desactualizados. */
const LEGACY_KEY = "rebound-cart-v1";
const EMPTY: CartItem[] = [];

let items: CartItem[] | null = null;
const listeners = new Set<() => void>();

/** Se queda solo con lo que sigue existiendo en el catálogo (producto, talle y color). */
function sanitize(parsed: unknown): CartItem[] {
  if (!Array.isArray(parsed)) return EMPTY;
  const byKey = new Map<string, CartItem>();
  for (const raw of parsed) {
    if (typeof raw !== "object" || raw === null) continue;
    const { productId, size, color, quantity } = raw as Partial<CartItem>;
    if (typeof productId !== "string" || typeof size !== "string" || typeof color !== "string") continue;
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) continue;
    const product = getProductById(productId);
    if (!product || !product.sizes.includes(size) || !product.colors.some((c) => c.name === color)) continue;
    const key = `${productId}__${size}__${color}`;
    const prev = byKey.get(key);
    byKey.set(key, { key, productId, size, color, quantity: (prev?.quantity ?? 0) + Math.floor(quantity) });
  }
  return [...byKey.values()];
}

function read(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    return raw ? sanitize(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(next: CartItem[]) {
  items = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.localStorage.removeItem(LEGACY_KEY);
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
