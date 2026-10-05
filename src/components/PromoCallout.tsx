"use client";

import { usePromo } from "@/context/PromoContext";
import { formatPrice } from "@/lib/format";
import { formatPromoValidity, promoPackPrice, promoUnitPrice } from "@/lib/promo";
import { PromoCountdown } from "./PromoCountdown";

/** Explica la promo NxM con los números del producto que se está viendo. */
export function PromoCallout({ price }: { price: number }) {
  const { promo: promotion } = usePromo();
  if (!promotion) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-accent-2 p-[1px]">
      <div className="flex items-center gap-4 rounded-[15px] bg-surface/95 p-4">
        <span className="font-display text-4xl uppercase italic leading-none pr-1 text-accent-2">
          {promotion.label}
        </span>
        <div className="text-sm">
          <p className="font-semibold text-ink">
            Llevando {promotion.buy} pagás {formatPrice(promoPackPrice(price, promotion))} →{" "}
            <span className="text-accent">{formatPrice(promoUnitPrice(price, promotion))} c/u</span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Combiná modelos, talles, colores y categorías: el más barato de cada {promotion.buy} es gratis.
            Válido {formatPromoValidity(promotion)}.
          </p>
          <PromoCountdown className="mt-1 text-xs font-semibold text-accent" />
        </div>
      </div>
    </div>
  );
}
