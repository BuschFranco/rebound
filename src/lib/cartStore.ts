import type { CartItem, CartLine } from "@/types";

/**
 * Carrito persistente sin registro, guardado en el localStorage del navegador.
 * Solo guarda qué eligió el cliente (producto, talle, color, cantidad) más el nombre y precio que vio,
 * para poder avisarle si algo cambió. Precio, nombre y disponibilidad reales salen siempre del
 * catálogo de la base (ver cartValidation.ts). Se sincroniza entre pestañas.
 */
const STORAGE_KEY = "rebound-cart-v3";
/** Versiones anteriores (array de ítems sin fecha). Se migran al leer. */
const LEGACY_KEYS = ["rebound-cart-v2", "rebound-cart-v1"];
/** Un carrito sin cambios durante este tiempo se descarta (precios y stock ya no serían los mismos). */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const EMPTY: CartItem[] = [];

type Stored = { version: 3; updatedAt: number; items: unknown };

let items: CartItem[] | null = null;
const listeners = new Set<() => void>();

/** Valida la forma de lo guardado y une duplicados (también lo usa el servidor al cotizar). */
export function sanitizeCartItems(parsed: unknown): CartItem[] {
  if (!Array.isArray(parsed)) return EMPTY;
  const byKey = new Map<string, CartItem>();
  for (const raw of parsed) {
    if (typeof raw !== "object" || raw === null) continue;
    const { productId, size, color, quantity, name, seenPrice } = raw as Partial<CartItem>;
    if (typeof productId !== "string" || typeof size !== "string" || typeof color !== "string") continue;
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) continue;
    const key = `${productId}__${size}__${color}`;
    const prev = byKey.get(key);
    byKey.set(key, {
      key,
      productId,
      size,
      color,
      quantity: Math.min(99, (prev?.quantity ?? 0) + Math.floor(quantity)),
      ...(typeof name === "string" ? { name } : {}),
      ...(typeof seenPrice === "number" && Number.isFinite(seenPrice) ? { seenPrice } : {}),
    });
  }
  return [...byKey.values()];
}

function read(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<Stored>;
      if (typeof stored.updatedAt !== "number" || Date.now() - stored.updatedAt > MAX_AGE_MS) {
        window.localStorage.removeItem(STORAGE_KEY);
        return EMPTY;
      }
      return sanitizeCartItems(stored.items);
    }
    for (const legacyKey of LEGACY_KEYS) {
      const legacy = window.localStorage.getItem(legacyKey);
      if (legacy) return sanitizeCartItems(JSON.parse(legacy));
    }
    return EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(next: CartItem[]) {
  items = next;
  try {
    const stored: Stored = { version: 3, updatedAt: Date.now(), items: next };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    LEGACY_KEYS.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // Storage no disponible (modo privado, bloqueado): el carrito igual funciona en memoria.
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
        ? current.map((i) =>
            i.key === item.key
              ? { ...i, name: item.name, seenPrice: item.seenPrice, quantity: Math.min(99, i.quantity + item.quantity) }
              : i,
          )
        : [...current, item],
    );
  },
  updateQty(key: string, quantity: number) {
    const current = cartStore.getSnapshot();
    write(
      quantity <= 0
        ? current.filter((i) => i.key !== key)
        : current.map((i) => (i.key === key ? { ...i, quantity: Math.min(99, quantity) } : i)),
    );
  },
  remove(key: string) {
    write(cartStore.getSnapshot().filter((i) => i.key !== key));
  },
  clear() {
    write(EMPTY);
  },
  /**
   * El cliente ya vio los avisos: el carrito queda solo con lo vigente
   * y con el precio y nombre actuales como "vistos".
   */
  acknowledge(validLines: CartLine[]) {
    const byKey = new Map(validLines.map((l) => [l.key, l]));
    const next = cartStore
      .getSnapshot()
      .flatMap((i) => {
        const line = byKey.get(i.key);
        return line ? [{ ...i, name: line.product.name, seenPrice: line.product.price }] : [];
      });
    write(next);
  },
};
