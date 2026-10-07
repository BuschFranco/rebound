"use client";

import { useCatalog } from "@/context/CatalogContext";
import { usePromo } from "@/context/PromoContext";
import { formatPrice } from "@/lib/format";
import { formatPromoValidity, nthUnitPrice, ordinal, promoDescription, promoPackPrice, promoUnitPrice } from "@/lib/promo";
import type { Product, Promotion } from "@/types";
import { PromoCountdown } from "./PromoCountdown";
import { HighlightFree } from "./HighlightFree";

/** Lo que gana el cliente con esta promo, con los números del producto que está viendo. */
function headline(promo: Promotion, product: Product) {
  if (promo.kind === "nxm") {
    return (
      <>
        Llevando {promo.buy} pagás {formatPrice(promoPackPrice(product.price, promo))} →{" "}
        <span className="text-accent">{formatPrice(promoUnitPrice(product.price, promo))} c/u</span>
      </>
    );
  }
  if (promo.kind === "nth_discount") {
    const unit = promo.percent === 100 ? "gratis" : formatPrice(nthUnitPrice(product.price, promo));
    return promo.scope === "same_product" ? (
      <>
        Llevando {promo.nth}, la {ordinal(promo.nth)} sale <span className="text-accent">{unit}</span>
      </>
    ) : (
      <>
        Combinalo con otros de la categoría: el {ordinal(promo.nth).replace(/a$/, "o")} más barato tiene{" "}
        <span className="text-accent">{promo.percent}% off</span>
      </>
    );
  }
  if (promo.rule === "products") return <span className="text-whatsapp">Este producto tiene envío gratis</span>;
  // Con los números de este producto: si ya alcanza solo, o cuánto falta.
  if (promo.rule === "min_amount") {
    return product.price >= promo.minAmount ? (
      <span className="text-whatsapp">Con este producto ya tenés envío gratis</span>
    ) : (
      <>
        Sumá <span className="text-accent">{formatPrice(promo.minAmount - product.price)}</span> más a este producto y el envío es <span className="text-accent">gratis</span>
      </>
    );
  }
  return promo.minUnits <= 1 ? (
    <span className="text-whatsapp">Con este producto ya tenés envío gratis</span>
  ) : (
    <>
      Sumá <span className="text-accent">{promo.minUnits - 1} {promo.minUnits - 1 === 1 ? "producto" : "productos"} más</span> y el envío es <span className="text-accent">gratis</span>
    </>
  );
}

/** Explica cada promo vigente que le aplica al producto (una por bloque), con sus números. */
export function PromoCallout({ product }: { product: Product }) {
  const { appliesTo } = usePromo();
  const { categories } = useCatalog();
  const promos = appliesTo(product);
  if (promos.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-accent-2 p-[1px]">
      <div className="divide-y divide-line rounded-[15px] bg-surface/95">
        {promos.map((promo, i) => (
          <div key={promo.id} className="flex items-center gap-4 p-4">
            <span
              className={`w-24 shrink-0 font-display uppercase italic leading-none text-accent-2 ${
                promo.kind === "free_shipping" ? "text-xl" : promo.label.length > 5 ? "text-2xl" : "text-4xl"
              }`}
            >
              {promo.kind === "free_shipping" ? "Envío gratis" : promo.label}
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-ink">{headline(promo, product)}</p>
              <p className="mt-0.5 text-xs text-muted">
                <HighlightFree text={promoDescription(promo, categories)} /> Válido {formatPromoValidity(promo)}.
              </p>
              {/* Un solo contador por recuadro, para no saturar la ficha. */}
              {i === 0 && <PromoCountdown promo={promo} tone="onDark" className="mt-3 text-ink" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
