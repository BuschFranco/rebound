"use client";

import { useCatalog } from "@/context/CatalogContext";
import { usePromo } from "@/context/PromoContext";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/order";
import { formatPromoValidity, ordinal } from "@/lib/promo";
import type { DiscountPromotion } from "@/types";
import { PromoCountdown } from "./PromoCountdown";
import { HighlightFree } from "./HighlightFree";

/** Qué gana el cliente con la próxima unidad, según el tipo de promo. */
function benefit(promo: DiscountPromotion) {
  if (promo.kind === "nxm") return `el más barato te sale gratis (${promo.label})`;
  const off = promo.percent === 100 ? "es gratis" : `tiene ${promo.percent}% off`;
  return `la ${ordinal(promo.nth)} unidad ${off} (${promo.label})`;
}

/**
 * Promos en el carrito: el descuento aplicado (si hay varios, el que más ahorra), la próxima oportunidad
 * de ahorro y el envío gratis por promo (cumplido o cuánto falta).
 */
export function CartPromo({ order }: { order: Order }) {
  const { active } = usePromo();
  const { categories } = useCatalog();
  const { promo, shipping, freeShippingLabel, freeShippingNext } = order;
  if (!active || promo.units === 0) return null;

  const next = promo.next;
  const where =
    next?.where === "same"
      ? " de un producto que ya tenés"
      : Array.isArray(next?.where)
        ? ` de ${next.where.map((s) => categories.find((c) => c.slug === s)?.label ?? s).join(" o ")}`
        : "";
  // Barra de progreso solo para el NxM (grupos de N unidades).
  const nxm = next?.promo.kind === "nxm" ? next.promo : promo.applied?.kind === "nxm" ? promo.applied : null;
  const filled = nxm ? (promo.units % nxm.buy === 0 ? nxm.buy : promo.units % nxm.buy) : 0;
  const shown = promo.applied ?? next?.promo ?? null;

  const freeShippingLine = freeShippingLabel ? (
    <>🚚 <strong className="text-whatsapp">Envío gratis</strong> <span className="text-muted">({freeShippingLabel})</span></>
  ) : freeShippingNext?.missingUnits ? (
    <>
      🚚 Sumá <strong className="text-accent">{freeShippingNext.missingUnits} {freeShippingNext.missingUnits === 1 ? "producto" : "productos"} más</strong>{" "}
      <span className="text-muted">y el envío es <span className="font-semibold text-accent">gratis</span>.</span>
    </>
  ) : freeShippingNext?.missingAmount && shipping.status !== "ok" ? (
    <>
      🚚 Sumá <strong className="text-accent">{formatPrice(freeShippingNext.missingAmount)}</strong>{" "}
      <span className="text-muted">más y el envío es <span className="font-semibold text-accent">gratis</span>.</span>
    </>
  ) : null;

  if (!shown && !freeShippingLine) return null;

  return (
    <div className="space-y-2 border-b border-line bg-surface-2/60 px-5 py-4 text-sm">
      {promo.applied && (
        <p>
          🔥 <strong className="text-ink">Se aplicó {promo.applied.label}:</strong>{" "}
          <span className="text-accent">ahorrás {formatPrice(promo.discount)}</span>
        </p>
      )}
      {next && (
        <p>
          Sumá <strong className="text-accent">{next.units} {next.units === 1 ? "producto" : "productos"} más</strong>
          <span className="text-muted">
            <HighlightFree text={`${where} y ${benefit(next.promo)}`} />
            {/* Otra promo distinta de la aplicada: no se suman, se usa la que más ahorre. */}
            {promo.applied && next.promo.id !== promo.applied.id ? ", si te ahorra más que la actual" : ""}.
          </span>
        </p>
      )}
      {nxm && (
        <div className="grid gap-1.5 pt-1" style={{ gridTemplateColumns: `repeat(${nxm.buy}, 1fr)` }} aria-hidden>
          {Array.from({ length: nxm.buy }, (_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-colors duration-500 ${i < filled ? "bg-accent-2" : "bg-line"}`} />
          ))}
        </div>
      )}
      {freeShippingLine && <p>{freeShippingLine}</p>}
      {shown && (
        <>
          <p className="text-[11px] text-muted">
            {shown.label} válido {formatPromoValidity(shown)}. Los descuentos no se acumulan: se aplica el que más te
            conviene.
          </p>
          <PromoCountdown promo={shown} tone="onDark" className="mt-1 text-ink" />
        </>
      )}
    </div>
  );
}
