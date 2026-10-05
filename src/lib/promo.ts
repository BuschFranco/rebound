import type { CartLine, Promotion } from "@/types";

export type PromoSummary = {
  units: number;
  subtotal: number;
  discount: number;
  total: number;
  /** Unidades que salen gratis con la promo. */
  freeUnits: number;
  /** Cuántas unidades faltan para la próxima unidad gratis (0 si no hay promo aplicada). */
  unitsToNextFree: number;
};

/** Si la promo está vigente en ese momento (fechas fijas, iguales para todos). */
export function isPromoRunning(promo: Promotion | null, now = Date.now()): promo is Promotion {
  return promo !== null && promo.startsAt <= now && now < promo.endsAt;
}

/**
 * Aplica la promo NxM sobre todo el carrito: se ordenan las unidades de mayor a menor precio y,
 * en cada grupo de `buy` unidades, las `buy - pay` más baratas salen gratis.
 * `promo` null = sin promo aplicada (no hay, no empezó o venció).
 */
export function computePromo(lines: CartLine[], promo: Promotion | null): PromoSummary {
  const prices = lines.flatMap((l) => Array<number>(l.quantity).fill(l.product.price)).sort((a, b) => b - a);
  const units = prices.length;
  const subtotal = prices.reduce((sum, p) => sum + p, 0);

  let discount = 0;
  let freeUnits = 0;
  if (promo) {
    const groups = Math.floor(units / promo.buy);
    for (let g = 0; g < groups; g++) {
      const group = prices.slice(g * promo.buy, (g + 1) * promo.buy);
      group.slice(promo.pay).forEach((p) => {
        discount += p;
        freeUnits += 1;
      });
    }
  }

  return {
    units,
    subtotal,
    discount,
    total: subtotal - discount,
    freeUnits,
    unitsToNextFree: promo ? promo.buy - (units % promo.buy) : 0,
  };
}

/** Precio por unidad llevando `buy` unidades del mismo producto. */
export function promoUnitPrice(price: number, promo: Promotion) {
  return Math.round((price * promo.pay) / promo.buy);
}

/** Total pagando `buy` unidades del mismo producto con la promo. */
export function promoPackPrice(price: number, promo: Promotion) {
  return price * promo.pay;
}

const TZ = "America/Argentina/Buenos_Aires";
const dayMonth = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: TZ });
const dayMonthYear = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });

/** "del 1 al 31 de octubre de 2026" / "del 20 de octubre al 5 de noviembre de 2026" (hora de Argentina). */
export function formatPromoValidity(promo: Promotion) {
  const start = new Date(promo.startsAt);
  // ends_at suele ser el último segundo del día: se muestra ese día.
  const end = new Date(promo.endsAt - 1);
  const sameYear = dayMonthYear.format(start).slice(-4) === dayMonthYear.format(end).slice(-4);
  const sameMonth = sameYear && dayMonth.format(start).split(" de ")[1] === dayMonth.format(end).split(" de ")[1];
  const from = sameMonth
    ? new Intl.DateTimeFormat("es-AR", { day: "numeric", timeZone: TZ }).format(start)
    : sameYear
      ? dayMonth.format(start)
      : dayMonthYear.format(start);
  return `del ${from} al ${dayMonthYear.format(end)}`;
}
