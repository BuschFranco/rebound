"use client";

import { usePromo } from "@/context/PromoContext";
import { POLICIES, PROMO } from "@/data/business";
import { formatPrice } from "@/lib/format";
import { promoPackPrice, promoUnitPrice } from "@/lib/promo";
import { PromoCountdown } from "./PromoCountdown";

/** Explica la promo NxM con los números del producto que se está viendo. */
export function PromoCallout({ price }: { price: number }) {
  const { active } = usePromo();
  if (!active) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-brand p-[1px]">
      <div className="flex items-center gap-4 rounded-[15px] bg-surface/95 p-4">
        <span className="font-display text-4xl uppercase italic leading-none text-gradient pr-1">
          {PROMO.label}
        </span>
        <div className="text-sm">
          <p className="font-semibold text-ink">
            Llevando {PROMO.buy} pagás {formatPrice(promoPackPrice(price))} →{" "}
            <span className="text-accent">{formatPrice(promoUnitPrice(price))} c/u</span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Combiná modelos, talles, colores y categorías: el más barato de cada {PROMO.buy} es gratis.
            Válido {POLICIES.promoValidity}.
          </p>
          <PromoCountdown className="mt-1 text-xs font-semibold text-accent" />
        </div>
      </div>
    </div>
  );
}
