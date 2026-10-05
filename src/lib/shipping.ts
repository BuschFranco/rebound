import type { SavedAddress, ShippingLocation, ShippingZone } from "@/types";

/**
 * Zona que corresponde a una localidad: primero se busca el partido/comuna exacto
 * y, si no hay, una zona que cubra toda la provincia. `null` = fuera de zona.
 */
export function resolveZone(zones: ShippingZone[], location: Pick<ShippingLocation, "provinciaId" | "departamentoId">) {
  const byDepartamento =
    location.departamentoId &&
    zones.find((z) => z.areas.some((a) => a.departamentoId === location.departamentoId));
  if (byDepartamento) return byDepartamento;
  return (
    zones.find((z) => z.areas.some((a) => a.departamentoId === null && a.provinciaId === location.provinciaId)) ?? null
  );
}

export type ShippingQuote = {
  zone: ShippingZone;
  cost: number;
  isFree: boolean;
  /** Cuánto falta para el envío gratis (0 si ya es gratis o la zona no tiene). */
  missingForFree: number;
};

/** Costo de envío para un subtotal (ya con la promo aplicada), respetando el envío gratis de la zona. */
export function quoteShipping(zone: ShippingZone, subtotal: number): ShippingQuote {
  const isFree = zone.freeFrom !== null && subtotal >= zone.freeFrom;
  return {
    zone,
    cost: isFree ? 0 : zone.price,
    isFree,
    missingForFree: zone.freeFrom !== null && !isFree ? zone.freeFrom - subtotal : 0,
  };
}

/** "Morón (Buenos Aires)" / "Palermo, Comuna 14 (CABA)". */
export function formatLocation(location: ShippingLocation) {
  const provincia = location.provinciaId === "02" ? "CABA" : location.provincia;
  const partido =
    location.partido && location.partido.toLowerCase() !== location.nombre.toLowerCase() ? `, ${location.partido}` : "";
  return `${location.nombre}${partido} (${provincia})`;
}

/** "Av. Corrientes 6120, Piso 3 B (CP 1414)" — solo las partes que el cliente completó. */
export function formatStreetAddress(address: SavedAddress) {
  const street = [address.street, address.number].filter(Boolean).join(" ");
  const parts = [street, address.floor && `Piso/Depto ${address.floor}`].filter(Boolean).join(", ");
  return [parts, address.postalCode && `(CP ${address.postalCode})`].filter(Boolean).join(" ");
}
