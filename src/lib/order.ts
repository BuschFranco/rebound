import type { CartLine, Promotion, ShippingLocation, ShippingZone } from "@/types";
import { computePromo, type PromoSummary } from "./promo";
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
  /** Etiqueta de la promo aplicada ("3x2"), o null si no hay. */
  promoLabel: string | null;
  shipping: OrderShipping;
  /** Productos con promo + envío (si hay localidad dentro de zona). */
  total: number;
};

export function buildOrder({
  lines,
  promotion,
  zones,
  location,
}: {
  lines: CartLine[];
  /** Promo vigente (null = sin promo). */
  promotion: Promotion | null;
  zones: ShippingZone[];
  location: ShippingLocation | null;
}): Order {
  const promo = computePromo(lines, promotion);

  let shipping: OrderShipping = { status: "unset" };
  if (location) {
    const zone = resolveZone(zones, location);
    if (!zone) {
      shipping = { status: "out-of-zone", location };
    } else {
      const quote = quoteShipping(zone, promo.total);
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
    promoLabel: promotion?.label ?? null,
    shipping,
    total: promo.total + (shipping.status === "ok" ? shipping.cost : 0),
  };
}
