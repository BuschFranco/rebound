"use client";

import type { ReactNode } from "react";
import { formatPrice } from "@/lib/format";
import { hasFreeShipping, type Order } from "@/lib/order";

/**
 * Barra de avance hacia el envío gratis (por zona o por promo). Ver cuánto falta empuja a completar
 * el pedido (efecto del gradiente de meta). Sin un umbral conocido no se muestra.
 */
export function FreeShippingProgress({ order }: { order: Order }) {
  const { shipping, promo, freeShippingLabel, freeShippingNext } = order;
  if (promo.units === 0) return null;

  const done = hasFreeShipping(order);
  // Con localidad, missingForFree ya es el umbral más cercano entre la zona y las promos por monto.
  const missingAmount =
    shipping.status === "ok"
      ? shipping.missingForFree > 0
        ? shipping.missingForFree
        : null
      : (freeShippingNext?.missingAmount ?? null);
  const missingUnits = freeShippingNext?.missingUnits ?? null;

  let progress: number;
  let text: ReactNode;
  if (done) {
    progress = 1;
    text = (
      <>
        🚚 <strong className="text-whatsapp">¡Tenés envío gratis!</strong>
        {freeShippingLabel && <span className="text-muted"> ({freeShippingLabel})</span>}
      </>
    );
  } else if (missingAmount !== null) {
    progress = promo.total / (promo.total + missingAmount);
    text = (
      <>
        🚚 Te faltan <strong className="text-accent">{formatPrice(missingAmount)}</strong> para el envío{" "}
        <strong className="text-accent">gratis</strong>
      </>
    );
  } else if (missingUnits !== null) {
    progress = promo.units / (promo.units + missingUnits);
    text = (
      <>
        🚚 Sumá{" "}
        <strong className="text-accent">
          {missingUnits} {missingUnits === 1 ? "producto" : "productos"} más
        </strong>{" "}
        y el envío es <strong className="text-accent">gratis</strong>
      </>
    );
  } else {
    return null;
  }

  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div className="space-y-2 border-b border-line bg-surface-2/60 px-5 py-3 text-sm">
      <p>{text}</p>
      <div
        role="progressbar"
        aria-label="Avance hacia el envío gratis"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-line"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${done ? "bg-whatsapp" : "bg-accent"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
