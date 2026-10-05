import type { SavedAddress, ShippingLocation } from "@/types";

/**
 * Dirección de entrega guardada en el localStorage del navegador del cliente.
 * No se usa cookie a propósito: el servidor no la necesita y así no viaja en cada request.
 * Solo sale del dispositivo dentro del mensaje de WhatsApp que el cliente decide enviar.
 */
const STORAGE_KEY = "rebound-address-v1";
/** Versión anterior: solo guardaba la localidad. Se migra al leer. */
const LEGACY_KEY = "rebound-shipping-v1";

export const EMPTY_ADDRESS: SavedAddress = {
  location: null,
  street: "",
  number: "",
  floor: "",
  postalCode: "",
  notes: "",
  recipient: "",
};

const LIMITS: Record<Exclude<keyof SavedAddress, "location">, number> = {
  street: 80,
  number: 10,
  floor: 20,
  postalCode: 10,
  notes: 140,
  recipient: 60,
};

let address: SavedAddress | undefined;
const listeners = new Set<() => void>();

function parseLocation(value: unknown): ShippingLocation | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<ShippingLocation>;
  if (typeof v.nombre !== "string" || typeof v.provinciaId !== "string" || !/^[0-9]{2}$/.test(v.provinciaId)) {
    return null;
  }
  return {
    id: String(v.id ?? ""),
    nombre: v.nombre,
    partido: String(v.partido ?? ""),
    provincia: String(v.provincia ?? ""),
    provinciaId: v.provinciaId,
    departamentoId: typeof v.departamentoId === "string" ? v.departamentoId : null,
  };
}

/** Normaliza lo que viene del storage o del formulario: recorta espacios y largos. */
export function normalizeAddress(value: unknown): SavedAddress {
  if (!value || typeof value !== "object") return EMPTY_ADDRESS;
  const v = value as Record<string, unknown>;
  const text = (key: keyof typeof LIMITS) =>
    typeof v[key] === "string" ? (v[key] as string).replace(/\s+/g, " ").trim().slice(0, LIMITS[key]) : "";
  return {
    location: parseLocation(v.location),
    street: text("street"),
    number: text("number"),
    floor: text("floor"),
    postalCode: text("postalCode"),
    notes: text("notes"),
    recipient: text("recipient"),
  };
}

export function isEmptyAddress(a: SavedAddress) {
  return !a.location && !a.street && !a.number && !a.floor && !a.postalCode && !a.notes && !a.recipient;
}

function read(): SavedAddress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeAddress(JSON.parse(raw));
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) return { ...EMPTY_ADDRESS, location: parseLocation(JSON.parse(legacy)) };
  } catch {
    // Storage no disponible o dato corrupto: se arranca vacío.
  }
  return EMPTY_ADDRESS;
}

function write(next: SavedAddress) {
  address = next;
  try {
    if (isEmptyAddress(next)) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Sin storage: queda en memoria.
  }
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  address = read();
  listeners.forEach((l) => l());
}

export const addressStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): SavedAddress {
    if (address === undefined) address = read();
    return address;
  },
  getServerSnapshot(): SavedAddress {
    return EMPTY_ADDRESS;
  },
  save(next: SavedAddress) {
    write(normalizeAddress(next));
  },
  clear() {
    write(EMPTY_ADDRESS);
  },
};
