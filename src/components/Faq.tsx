"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePromo } from "@/context/PromoContext";
import { DELIVERY, POLICIES } from "@/data/business";
import { useCatalog } from "@/context/CatalogContext";
import { formatPromoValidity, isDiscount, promoDescription } from "@/lib/promo";
import type { CategoryInfo, Promotion } from "@/types";
import { SectionHeading } from "./SectionHeading";
import { HighlightFree } from "./HighlightFree";

type QA = { q: string; a: ReactNode };

function buildQuestions(promos: Promotion[], categories: CategoryInfo[]): QA[] {
  return [
  {
    q: "¿Cómo funciona pagar al recibir?",
    a: (
      <>
        Armás el carrito y nos mandás el pedido por WhatsApp. Te confirmamos stock, costo de envío y
        día de entrega, y <strong>pagás recién cuando lo tenés en la mano</strong>, en{" "}
        {POLICIES.paymentMethods.join(" o ").toLowerCase()}. Sin tarjeta, sin anticipo.
      </>
    ),
  },
  // Una pregunta por promo vigente.
  ...promos.map((promo) => ({
    q: promo.kind === "free_shipping" ? `¿Cómo funciona el ${promo.label.toLowerCase()}?` : `¿Cómo funciona el ${promo.label}?`,
    a: (
      <>
        <HighlightFree text={promoDescription(promo, categories)} /> Se calcula solo en el carrito. Válido {formatPromoValidity(promo)}.
        {isDiscount(promo) && promos.filter(isDiscount).length > 1 && (
          <> Los descuentos no se acumulan: se aplica el que más te conviene.</>
        )}
      </>
    ),
  })),
  {
    q: "¿Cuánto tarda en llegar?",
    a: (
      <>
        Entregamos en {POLICIES.shippingAreasShort} en <strong>{DELIVERY.label}</strong>. El costo
        de envío depende de tu localidad y te lo decimos antes de que confirmes.{" "}
        <Link href="/envios">Ver envíos</Link>.
      </>
    ),
  },
  {
    q: "¿Y si no me queda el talle?",
    a: (
      <>
        Lo cambiás <strong>gratis dentro de los {POLICIES.exchangeDays} días</strong>: lo retiramos y
        te llevamos el nuevo. Para acertar de entrada, usá la guía de talles de cada producto.{" "}
        <Link href="/cambios-y-devoluciones">Ver cambios</Link>.
      </>
    ),
  },
  {
    q: "¿Qué pasa si llega con una falla?",
    a: (
      <>
        Te lo cambiamos o te devolvemos la plata, a tu elección y sin costo. Todo tiene{" "}
        {POLICIES.legalWarrantyMonths} meses de garantía.
      </>
    ),
  },
  {
    q: "¿Es seguro comprar por WhatsApp?",
    a: (
      <>
        Sí: no te pedimos datos de tarjeta ni pagos por adelantado, y revisás el pedido antes de
        pagar. Además, tenés {POLICIES.revocationDays} días para arrepentirte desde el{" "}
        <Link href="/arrepentimiento">Botón de arrepentimiento</Link>.
      </>
    ),
  },
  ];
}

export function Faq({ className = "" }: { className?: string }) {
  const { promos } = usePromo();
  const { categories } = useCatalog();
  const questions = buildQuestions(promos, categories);
  return (
    <section className={className}>
      <SectionHeading eyebrow="Sacate las dudas" title="Preguntas frecuentes" />
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {questions.map(({ q, a }) => (
          <details key={q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold transition hover:text-accent [&::-webkit-details-marker]:hidden">
              {q}
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-accent transition-transform duration-300 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="px-5 pb-5 text-sm leading-relaxed text-muted [&_a]:text-accent [&_a]:underline [&_strong]:text-ink">
              {a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
