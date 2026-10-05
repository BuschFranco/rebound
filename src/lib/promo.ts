import { PROMO } from "@/data/business";
import type { CartLine } from "@/types";

export type PromoSummary = {
  units: number;
  subtotal: number;
  discount: number;
  total: number;
  /** Unidades que salen gratis con la promo. */
  freeUnits: number;
  /** Cuántas unidades faltan para la próxima unidad gratis. */
  unitsToNextFree: number;
};

/**
 * Aplica la promo NxM (si `active`, o sea que está habilitada y no venció para el visitante) sobre todo el carrito: se ordenan las unidades de mayor a menor precio y,
 * en cada grupo de `buy` unidades, las `buy - pay` más baratas salen gratis.
 */
export function computePromo(lines: CartLine[], active: boolean): PromoSummary {
  const prices = lines.flatMap((l) => Array<number>(l.quantity).fill(l.product.price)).sort((a, b) => b - a);
  const units = prices.length;
  const subtotal = prices.reduce((sum, p) => sum + p, 0);

  let discount = 0;
  let freeUnits = 0;
  if (active) {
    const groups = Math.floor(units / PROMO.buy);
    for (let g = 0; g < groups; g++) {
      const group = prices.slice(g * PROMO.buy, (g + 1) * PROMO.buy);
      group.slice(PROMO.pay).forEach((p) => {
        discount += p;
        freeUnits += 1;
      });
    }
  }

  const remainder = units % PROMO.buy;
  return {
    units,
    subtotal,
    discount,
    total: subtotal - discount,
    freeUnits,
    unitsToNextFree: PROMO.buy - remainder,
  };
}

/** Precio por unidad llevando `buy` unidades del mismo producto. */
export function promoUnitPrice(price: number) {
  return Math.round((price * PROMO.pay) / PROMO.buy);
}

/** Total pagando `buy` unidades del mismo producto con la promo. */
export function promoPackPrice(price: number) {
  return price * PROMO.pay;
}
