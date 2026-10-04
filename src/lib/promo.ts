import { PROMO } from "@/data/business";
import type { CartItem } from "@/types";

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

const FREE_PER_GROUP = PROMO.buy - PROMO.pay;

/**
 * Aplica la promo NxM sobre todo el carrito: se ordenan las unidades de mayor a menor precio y,
 * en cada grupo de `buy` unidades, las `buy - pay` más baratas salen gratis.
 */
export function computePromo(items: CartItem[]): PromoSummary {
  const prices = items.flatMap((i) => Array<number>(i.quantity).fill(i.price)).sort((a, b) => b - a);
  const units = prices.length;
  const subtotal = prices.reduce((sum, p) => sum + p, 0);

  let discount = 0;
  let freeUnits = 0;
  if (PROMO.enabled) {
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

export const PROMO_ACTIVE = PROMO.enabled && FREE_PER_GROUP > 0;
