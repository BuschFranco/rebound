import { formatPrice } from "./format";
import type {
  CartLine,
  CategoryInfo,
  DiscountPromotion,
  FreeShippingPromotion,
  NthDiscountPromotion,
  NxmPromotion,
  Product,
  Promotion,
} from "@/types";

/**
 * Motor de promociones: lo usan el carrito (navegador) y la verificación final (servidor), así el
 * total que ve el cliente es el mismo que se calcula al comprar.
 *
 * Reglas: pueden convivir varias promos. Las de envío gratis se suman a las de descuento; si hay varios
 * descuentos vigentes NO se acumulan: se aplica el que más ahorra al cliente.
 */

// ---------- Vigencia ----------

/** Si la promo está vigente en ese momento (fechas fijas, iguales para todos). */
export function isPromoRunning(promo: Promotion | null | undefined, now = Date.now()): promo is Promotion {
  return !!promo && promo.startsAt <= now && now < promo.endsAt;
}

export function runningPromos(promos: Promotion[], now = Date.now()) {
  return promos.filter((p) => isPromoRunning(p, now));
}

export const isDiscount = (p: Promotion): p is DiscountPromotion => p.kind !== "free_shipping";
export const isFreeShipping = (p: Promotion): p is FreeShippingPromotion => p.kind === "free_shipping";

// ---------- Descuentos ----------

type Unit = { productId: string; category: string; price: number };

function toUnits(lines: CartLine[]): Unit[] {
  return lines.flatMap((l) =>
    Array.from({ length: l.quantity }, () => ({ productId: l.product.id, category: l.product.category, price: l.product.price })),
  );
}

type DiscountResult = {
  discount: number;
  /** Unidades que salen gratis o con descuento. */
  discountedUnits: number;
  /** Cuántas unidades más hacen falta para el próximo descuento (null = no se puede saber sin más datos). */
  unitsToNext: number | null;
  /** Dónde sumar esas unidades: "any" (cualquier producto), "same" (repetir un producto) o categorías. */
  nextWhere: "any" | "same" | string[];
};

const groupBy = <T,>(items: T[], key: (t: T) => string) => {
  const map = new Map<string, T[]>();
  for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return map;
};

/** Llevá N, pagá M sobre todo el carrito: de mayor a menor precio, en cada grupo de N las más baratas son gratis. */
function nxmDiscount(units: Unit[], promo: NxmPromotion): DiscountResult {
  const prices = units.map((u) => u.price).sort((a, b) => b - a);
  let discount = 0;
  let discountedUnits = 0;
  for (let g = 0; g < Math.floor(prices.length / promo.buy); g++) {
    for (const price of prices.slice(g * promo.buy + promo.pay, (g + 1) * promo.buy)) {
      discount += price;
      discountedUnits += 1;
    }
  }
  return { discount, discountedUnits, unitsToNext: promo.buy - (prices.length % promo.buy), nextWhere: "any" };
}

/** % de descuento en la N-ésima unidad de cada grupo (mismo producto o misma categoría elegida). */
function nthDiscount(units: Unit[], promo: NthDiscountPromotion): DiscountResult {
  const eligible = promo.scope === "categories" ? units.filter((u) => promo.categorySlugs.includes(u.category)) : units;
  const groups = groupBy(eligible, (u) => (promo.scope === "same_product" ? u.productId : u.category));
  let discount = 0;
  let discountedUnits = 0;
  let unitsToNext = promo.nth;
  for (const group of groups.values()) {
    // De mayor a menor: el descuento cae en las posiciones N, 2N… (las más baratas de cada tramo).
    const prices = group.map((u) => u.price).sort((a, b) => b - a);
    prices.forEach((price, i) => {
      if ((i + 1) % promo.nth === 0) {
        discount += Math.round((price * promo.percent) / 100);
        discountedUnits += 1;
      }
    });
    unitsToNext = Math.min(unitsToNext, promo.nth - (prices.length % promo.nth));
  }
  return {
    discount,
    discountedUnits,
    unitsToNext: groups.size === 0 && promo.scope === "same_product" ? null : unitsToNext,
    nextWhere: promo.scope === "same_product" ? "same" : promo.categorySlugs,
  };
}

function discountFor(units: Unit[], promo: DiscountPromotion) {
  return promo.kind === "nxm" ? nxmDiscount(units, promo) : nthDiscount(units, promo);
}

export type PromoSummary = {
  units: number;
  subtotal: number;
  discount: number;
  total: number;
  /** Promo de descuento aplicada (la que más ahorra), o null. */
  applied: DiscountPromotion | null;
  discountedUnits: number;
  /** Próxima oportunidad de ahorro para mostrar en el carrito. */
  next: { promo: DiscountPromotion; units: number; where: DiscountResult["nextWhere"] } | null;
};

/** Evalúa cada descuento vigente y aplica el de mayor ahorro (no se acumulan). */
export function computeDiscounts(lines: CartLine[], promos: Promotion[]): PromoSummary {
  const units = toUnits(lines);
  const subtotal = units.reduce((sum, u) => sum + u.price, 0);
  const results = promos.filter(isDiscount).map((promo) => ({ promo, ...discountFor(units, promo) }));

  const best = results.reduce<(typeof results)[number] | null>(
    (top, r) => (r.discount > 0 && (!top || r.discount > top.discount) ? r : top),
    null,
  );
  // Próxima oportunidad: la que pide menos unidades (si empata, la aplicada).
  const candidates = results.filter((r) => r.unitsToNext !== null && r.unitsToNext > 0);
  const nextBest = candidates.sort(
    (a, b) => (a.unitsToNext ?? 0) - (b.unitsToNext ?? 0) || Number(b.promo === best?.promo) - Number(a.promo === best?.promo),
  )[0];

  const discount = best?.discount ?? 0;
  return {
    units: units.length,
    subtotal,
    discount,
    total: subtotal - discount,
    applied: best?.promo ?? null,
    discountedUnits: best?.discountedUnits ?? 0,
    next: units.length > 0 && nextBest ? { promo: nextBest.promo, units: nextBest.unitsToNext!, where: nextBest.nextWhere } : null,
  };
}

// ---------- Envío gratis ----------

export type FreeShippingStatus = {
  /** Promo que da el envío gratis (null = ninguna lo cumple). */
  promo: FreeShippingPromotion | null;
  /** La más cercana a cumplirse, para "te faltan…". */
  nearest: { promo: FreeShippingPromotion; missingAmount?: number; missingUnits?: number } | null;
};

export function freeShippingStatus(lines: CartLine[], total: number, promos: Promotion[]): FreeShippingStatus {
  const units = lines.reduce((sum, l) => sum + l.quantity, 0);
  let promo: FreeShippingPromotion | null = null;
  let nearest: FreeShippingStatus["nearest"] = null;
  for (const p of promos.filter(isFreeShipping)) {
    if (p.rule === "products") {
      if (lines.some((l) => p.productIds.includes(l.product.id))) promo ??= p;
    } else if (p.rule === "min_amount") {
      if (total >= p.minAmount) promo ??= p;
      else if (!nearest || (nearest.missingAmount ?? Infinity) > p.minAmount - total) {
        nearest = { promo: p, missingAmount: p.minAmount - total };
      }
    } else if (units >= p.minUnits) {
      promo ??= p;
    } else if (!nearest || nearest.missingAmount === undefined) {
      nearest = { promo: p, missingUnits: p.minUnits - units };
    }
  }
  return { promo, nearest: promo ? null : nearest };
}

// ---------- Textos para el sitio ----------

const ORDINALS: Record<number, string> = { 2: "2da", 3: "3ra", 4: "4ta", 5: "5ta", 6: "6ta", 7: "7ma", 8: "8va", 9: "9na", 10: "10ma" };
export const ordinal = (n: number) => ORDINALS[n] ?? `${n}ª`;

const categoryNames = (slugs: string[], categories: CategoryInfo[]) => {
  const names = slugs.map((s) => categories.find((c) => c.slug === s)?.label ?? s);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} o ${names.at(-1)}` : (names[0] ?? "");
};

/** Etiqueta corta sugerida (el panel la usa por defecto; en la base se puede editar). */
export function defaultPromoLabel(promo: Promotion) {
  if (promo.kind === "nxm") return `${promo.buy}x${promo.pay}`;
  if (promo.kind === "nth_discount") return `${ordinal(promo.nth)} ${promo.percent === 100 ? "gratis" : `al ${promo.percent}%`}`;
  if (promo.rule === "min_amount") return `Envío gratis desde ${formatPrice(promo.minAmount)}`;
  if (promo.rule === "min_units") return `Envío gratis llevando ${promo.minUnits}`;
  return "Envío gratis";
}

/** Título para la barra superior, el hero y el banner. */
export function promoHeadline(promo: Promotion, categories: CategoryInfo[]) {
  if (promo.kind === "nxm") return `${promo.label} en toda la web`;
  if (promo.kind === "nth_discount") {
    return promo.scope === "categories" ? `${promo.label} en ${categoryNames(promo.categorySlugs, categories)}` : `${promo.label} en el mismo producto`;
  }
  if (promo.rule === "products") return `${promo.label} en productos seleccionados`;
  return promo.label;
}

/** Explicación en una oración (banner, ficha, preguntas frecuentes). */
export function promoDescription(promo: Promotion, categories: CategoryInfo[], products: Product[] = []) {
  if (promo.kind === "nxm") {
    return `Llevá ${promo.buy}, pagá ${promo.pay}: el más barato de cada ${promo.buy} es gratis. Combinás modelos, talles y categorías.`;
  }
  if (promo.kind === "nth_discount") {
    const off = promo.percent === 100 ? "es gratis" : `tiene ${promo.percent}% off`;
    if (promo.scope === "same_product") {
      return `Llevando ${promo.nth} unidades del mismo producto (pueden ser talles o colores distintos), la ${ordinal(promo.nth)} ${off}.`;
    }
    // "2da" → "2do" (el producto).
    return `Llevando ${promo.nth} productos de ${categoryNames(promo.categorySlugs, categories)} (pueden ser modelos distintos), el ${ordinal(promo.nth).replace(/a$/, "o")} más barato ${off}.`;
  }
  if (promo.rule === "products") {
    // Con el catálogo a mano se nombran los productos (Términos); si no, se explica en general.
    const names = promo.productIds.flatMap((id) => products.find((x) => x.id === id)?.name ?? []);
    return names.length
      ? `Envío gratis en pedidos que incluyan alguno de estos productos: ${names.join(", ")}.`
      : "Los productos marcados con envío gratis no pagan envío: alcanza con uno en el pedido.";
  }
  if (promo.rule === "min_amount") {
    return `Envío gratis en pedidos desde ${formatPrice(promo.minAmount)} (con descuentos aplicados), dentro de las zonas de entrega.`;
  }
  return `Envío gratis llevando ${promo.minUnits} productos o más, dentro de las zonas de entrega.`;
}

/** Texto legal para Términos y condiciones. */
export function promoConditions(promo: Promotion, categories: CategoryInfo[], products: Product[] = []) {
  const stacking = isDiscount(promo)
    ? "No se acumula con otras promociones de descuento: si hay varias, se aplica la que más te conviene."
    : "Se combina con las promociones de descuento.";
  return `${promoDescription(promo, categories, products)} Vigencia: ${formatPromoValidity(promo)} (hora de Argentina), igual para todos los clientes. ${stacking}`;
}

/** Si la promo le aplica a este producto (para las etiquetas de las tarjetas y la ficha). */
export function promoAppliesTo(promo: Promotion, product: Product) {
  if (promo.kind === "nth_discount" && promo.scope === "categories") return promo.categorySlugs.includes(product.category);
  if (promo.kind === "free_shipping" && promo.rule === "products") return promo.productIds.includes(product.id);
  return true;
}

/** Etiquetas cortas para la tarjeta de un producto: descuentos que le aplican y envío gratis propio. */
export function productBadges(promos: Promotion[], product: Product) {
  return promos
    .filter((p) => promoAppliesTo(p, product) && (isDiscount(p) || p.rule === "products"))
    .map((p) => (p.kind === "free_shipping" ? "Envío gratis" : p.label));
}

/** Precio por unidad llevando `buy` unidades (NxM). */
export function promoUnitPrice(price: number, promo: NxmPromotion) {
  return Math.round((price * promo.pay) / promo.buy);
}

/** Total pagando `buy` unidades del mismo producto (NxM). */
export function promoPackPrice(price: number, promo: NxmPromotion) {
  return price * promo.pay;
}

/** Precio de la unidad con descuento (N-ésima unidad). */
export function nthUnitPrice(price: number, promo: NthDiscountPromotion) {
  return price - Math.round((price * promo.percent) / 100);
}

const TZ = "America/Argentina/Buenos_Aires";
const dayMonth = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: TZ });
const dayMonthYear = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });

/** "del 1 al 31 de octubre de 2026" / "del 20 de octubre al 5 de noviembre de 2026" (hora de Argentina). */
export function formatPromoValidity(promo: Pick<Promotion, "startsAt" | "endsAt">) {
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
