"use client";

import { useCart } from "@/context/CartContext";
import { usePromo } from "@/context/PromoContext";
import { formatPrice } from "@/lib/format";
import { computeDiscounts, isDiscount } from "@/lib/promo";
import type { CartLine, Product } from "@/types";

/** Hasta cuántas unidades se simulan para encontrar la próxima oportunidad de ahorro. */
const MAX_PREVIEW = 6;

/**
 * Debajo del botón de compra (sirve para cualquier promo de descuento: 3x2, 2da al 50%, por categoría):
 * - si al agregar la cantidad elegida se gana un descuento, lo celebra y muestra el ahorro;
 * - si no, busca cuántas unidades de este producto hacen falta para ahorrar y ofrece llevar esa cantidad.
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
  const { lines, promo: current } = useCart();
  const { promos, appliesTo } = usePromo();
  if (!appliesTo(product).some(isDiscount)) return null;

  const withPreview = (n: number) =>
    computeDiscounts([...lines, { key: "__preview__", productId: product.id, size: "", color: "", quantity: n, product } as CartLine], promos);

  const future = withPreview(quantity);
  const savings = future.discount - current.discount;
  const alreadySaving = current.discount > 0;
  const these = quantity === 1 ? "esta" : `estas ${quantity}`;

  if (savings > 0 && future.applied) {
    return (
      <div role="status" className="rounded-xl bg-accent-2 p-[1px]">
        <div className="rounded-[11px] bg-surface px-4 py-3 text-sm font-semibold text-ink">
          🔥 ¡Agregando {these} se aplica {future.applied.label}!{" "}
          <span className="text-accent">
            Ahorrás {formatPrice(savings)}
            {alreadySaving ? " extra" : ""}.
          </span>
        </div>
      </div>
    );
  }

  // La menor cantidad de este producto que da un ahorro nuevo.
  let missing = 0;
  let target = future;
  for (let n = 1; n <= MAX_PREVIEW; n++) {
    const preview = withPreview(n);
    if (preview.discount > current.discount) {
      missing = n;
      target = preview;
      break;
    }
  }
  if (!missing || !target.applied) return null;

  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${
        alreadySaving ? "border border-accent/40 bg-surface-2" : "border border-dashed border-accent/50 bg-accent/5"
      }`}
    >
      <div className="min-w-0 flex-1 text-sm">
        {alreadySaving && current.applied && (
          <p className="mb-1 font-semibold text-ink">✅ Ya estás aprovechando {current.applied.label} en tu carrito.</p>
        )}
        <p>
          Llevando <strong className="text-accent">{missing} {missing === 1 ? "unidad" : "unidades"}</strong> de este producto
          ahorrás <strong className="text-ink">{formatPrice(target.discount - current.discount)}</strong> ({target.applied.label}).
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
