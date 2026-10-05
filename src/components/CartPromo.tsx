"use client";

import { usePromo } from "@/context/PromoContext";
import { formatPromoValidity, type PromoSummary } from "@/lib/promo";
import { PromoCountdown } from "./PromoCountdown";

/** Barra de progreso del NxM: muestra cuánto falta para la próxima unidad gratis. */
export function CartPromo({ promo }: { promo: PromoSummary }) {
  const { promo: promotion } = usePromo();
  if (!promotion || promo.units === 0) return null;

  const filled = promo.units % promotion.buy;
  const completedGroup = filled === 0;
  const missing = promo.unitsToNextFree;

  return (
    <div className="border-b border-line bg-surface-2/60 px-5 py-4">
      <p className="text-sm">
        {completedGroup ? (
          <>
            🔥 <strong className="text-ink">¡{promo.freeUnits === 1 ? "Tenés 1 gratis" : `Tenés ${promo.freeUnits} gratis`}!</strong>{" "}
            <span className="text-muted">Sumá {promotion.buy} más y te llevás otro.</span>
          </>
        ) : (
          <>
            Sumá <strong className="text-accent">{missing} {missing === 1 ? "producto" : "productos"} más</strong>{" "}
            <span className="text-muted">y el más barato te sale gratis ({promotion.label}).</span>
          </>
        )}
      </p>
      <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${promotion.buy}, 1fr)` }} aria-hidden>
        {Array.from({ length: promotion.buy }, (_, i) => {
          const on = completedGroup || i < filled;
          return (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-colors duration-500 ${on ? "bg-accent-2" : "bg-line"}`}
            />
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Válido {formatPromoValidity(promotion)}. Combinable entre todos los productos.
      </p>
      <PromoCountdown className="mt-1 text-xs font-semibold text-accent" />
    </div>
  );
}
