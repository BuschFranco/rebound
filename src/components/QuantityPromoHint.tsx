"use client";

import { useCart } from "@/context/CartContext";
import { PROMO } from "@/data/business";
import { formatPrice } from "@/lib/format";
import { computePromo, PROMO_ACTIVE } from "@/lib/promo";
import type { Product } from "@/types";

/**
 * Debajo del botón de compra:
 * - si al agregar la cantidad elegida se gana una unidad gratis, lo celebra y muestra el ahorro;
 * - si no, cuenta cuántas faltan según lo que ya hay en el carrito y ofrece llevar esa cantidad.
 */
export function QuantityPromoHint({
  product,
  quantity,
  onSetQuantity,
}: {
  product: Product;
  quantity: number;
  onSetQuantity: (quantity: number) => void;
}) {
  const { items, promo: current } = useCart();
  if (!PROMO_ACTIVE) return null;

  const future = computePromo([
    ...items,
    {
      key: "__preview__",
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0],
      price: product.price,
      size: "",
      color: "",
      quantity,
    },
  ]);

  const gained = future.freeUnits - current.freeUnits;
  const savings = future.discount - current.discount;
  const alreadySaving = current.freeUnits > 0;
  const these = quantity === 1 ? "esta" : `estas ${quantity}`;

  if (gained > 0) {
    return (
      <div role="status" className="rounded-xl bg-gradient-brand p-[1px]">
        <div className="rounded-[11px] bg-surface px-4 py-3 text-sm font-semibold text-ink">
          🔥 ¡Agregando {these} {alreadySaving ? "sumás otra" : "entrás en la promo"} {PROMO.label}!{" "}
          <span className="text-accent">
            Te llevás {gained} {alreadySaving ? "más " : ""}gratis y ahorrás {formatPrice(savings)}
            {alreadySaving ? " extra" : ""}.
          </span>
        </div>
      </div>
    );
  }

  // Cuántas faltan según lo que ya está en el carrito (sin contar la selección actual).
  const missing = current.unitsToNextFree;

  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${
        alreadySaving ? "border border-accent/40 bg-surface-2" : "border border-dashed border-accent/50 bg-accent/5"
      }`}
    >
      <div className="min-w-0 flex-1 text-sm">
        {alreadySaving && (
          <p className="mb-1 font-semibold text-ink">
            ✅ Ya estás aprovechando el {PROMO.label} en tu carrito.
          </p>
        )}
        <p>
          {alreadySaving ? "Sumá" : "Llevá"}{" "}
          <strong className="text-accent">
            {missing} {missing === 1 ? "producto" : "productos"}
            {current.units > 0 ? " más" : ""}
          </strong>{" "}
          {alreadySaving ? "y te llevás otro" : "y el más barato te sale"}{" "}
          <strong className="text-ink">gratis</strong>
          {alreadySaving ? "." : ` (${PROMO.label}).`}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onSetQuantity(missing)}
        className="shrink-0 rounded-full bg-accent px-3.5 py-2 text-xs font-bold uppercase tracking-widest text-black transition hover:brightness-110"
        aria-label={`Elegir ${missing} unidades`}
      >
        Llevar {missing}
      </button>
    </div>
  );
}
