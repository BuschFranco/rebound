import type { CartLine, Promotion, ShippingLocation, ShippingZone } from "@/types";
import { computeDiscounts, freeShippingStatus, type FreeShippingStatus, type PromoSummary } from "./promo";
import { quoteShipping, resolveZone } from "./shipping";

export type OrderShipping =
  | { status: "unset" }
  | { status: "out-of-zone"; location: ShippingLocation }
  | {
      status: "ok";
      location: ShippingLocation;
      zoneName: string;
      eta: string;
      cost: number;
      isFree: boolean;
      missingForFree: number;
    };

export type OrderLine = {
  key: string;
  name: string;
  slug: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
};

/** Pedido calculado: lo mismo se muestra en el carrito y se verifica en el servidor antes de comprar. */
export type Order = {
  lines: OrderLine[];
  promo: PromoSummary;
  /** Etiqueta del descuento aplicado ("3x2", "2da al 50%"), o null si no hay. */
  discountLabel: string | null;
  /** Etiqueta de la promo que da el envío gratis, o null. */
  freeShippingLabel: string | null;
  /** Promo de envío gratis más cercana a cumplirse (para "te faltan…"). */
  freeShippingNext: FreeShippingStatus["nearest"];
  shipping: OrderShipping;
  /** Productos con promo + envío (si hay localidad dentro de zona). */
  total: number;
};

export function buildOrder({
  lines,
  promotions,
  zones,
  location,
}: {
  lines: CartLine[];
  /** Promos vigentes (pueden ser varias; las vencidas o futuras no se pasan). */
  promotions: Promotion[];
  zones: ShippingZone[];
  location: ShippingLocation | null;
}): Order {
  const promo = computeDiscounts(lines, promotions);
  const freeShipping = freeShippingStatus(lines, promo.total, promotions);

  let shipping: OrderShipping = { status: "unset" };
  if (location) {
    const zone = resolveZone(zones, location);
    if (!zone) {
      shipping = { status: "out-of-zone", location };
    } else {
      const quote = quoteShipping(zone, promo.total, freeShipping.promo !== null, freeShipping.nearest?.missingAmount);
      shipping = {
        status: "ok",
        location,
        zoneName: zone.name,
        eta: zone.eta,
        cost: quote.cost,
        isFree: quote.isFree,
        missingForFree: quote.missingForFree,
      };
    }
  }

  return {
    lines: lines.map((l) => ({
      key: l.key,
      name: l.product.name,
      slug: l.product.slug,
      size: l.size,
      color: l.color,
      quantity: l.quantity,
      price: l.product.price,
    })),
    promo,
    discountLabel: promo.applied?.label ?? null,
    freeShippingLabel: freeShipping.promo?.label ?? null,
    freeShippingNext: freeShipping.nearest,
    shipping,
    total: promo.total + (shipping.status === "ok" ? shipping.cost : 0),
  };
}
