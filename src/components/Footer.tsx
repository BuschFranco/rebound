/* eslint-disable @next/next/no-img-element -- el QR de Data Fiscal es una imagen externa de ARCA */
import Link from "next/link";
import { BUSINESS, CONSUMER_DEFENSE_URL, POLICIES } from "@/data/business";
import { formatPromoValidity } from "@/lib/promo";
import { Logo } from "./Logo";
import { PromoGate } from "./PromoGate";
import type { CategoryInfo, Promotion } from "@/types";

const HELP_LINKS = [
  { href: "/envios", label: "Envíos y pagos" },
  { href: "/cambios-y-devoluciones", label: "Cambios, devoluciones y garantía" },
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/privacidad", label: "Política de privacidad" },
];

const PERKS = [
  "Pagás solo al recibir",
  `Cambio gratis ${POLICIES.exchangeDays} días`,
  "Devolución sin costo por fallas",
  `Envíos en ${POLICIES.shippingAreasShort}`,
];

export function Footer({ categories, promotions }: { categories: CategoryInfo[]; promotions: Promotion[] }) {
  return (
    <footer className="relative mt-28 overflow-hidden border-t border-line bg-surface">
      <div className="absolute inset-x-0 top-0 h-px bg-accent" aria-hidden />

      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-px border-b border-line bg-line lg:grid-cols-4">
        {PERKS.map((perk) => (
          <li
            key={perk}
            className="flex items-center justify-center bg-surface px-4 py-5 text-center font-display text-lg uppercase italic leading-tight sm:text-xl"
          >
            {perk}
          </li>
        ))}
      </ul>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">
            Indumentaria y zapatillas de basket. Hecho para la cancha y la calle. Pedís por
            WhatsApp, coordinamos el envío y pagás al recibir.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest">Categorías</h3>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/catalogo?categoria=${c.slug}`} className="transition hover:text-accent">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest">Ayuda y legales</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {HELP_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition hover:text-accent">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="divide-y divide-line rounded-xl border border-line bg-surface-2 text-sm leading-snug">
            <a
              href={CONSUMER_DEFENSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 transition hover:text-accent"
            >
              <span className="block font-bold text-ink">Defensa de las y los Consumidores</span>
              <span className="text-muted">
                Para reclamos <span className="font-semibold text-accent underline">ingrese aquí</span>
              </span>
            </a>
            <Link href="/arrepentimiento" className="block px-4 py-3 transition hover:text-accent">
              <span className="block font-bold text-ink">Botón de arrepentimiento</span>
              <span className="text-muted">
                Cancelá tu compra en {POLICIES.revocationDays} días,{" "}
                <span className="font-semibold text-accent underline">ingresá aquí</span>
              </span>
            </Link>
          </div>
          {BUSINESS.dataFiscalUrl && (
            <a href={BUSINESS.dataFiscalUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
              <img src={BUSINESS.dataFiscalQrImage} alt="Data Fiscal ARCA" width={64} height={88} />
            </a>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-1 px-4 pb-8 text-xs text-muted sm:px-6">
        <p>
          {BUSINESS.address} · {BUSINESS.email}
        </p>
        <p>
          Precios finales en pesos argentinos con IVA incluido. El costo de envío se informa antes
          de confirmar la compra.{" "}
          {promotions.map((p) => (
            <PromoGate key={p.id} promoId={p.id}>
              Promoción {p.label} válida {formatPromoValidity(p)}.{" "}
            </PromoGate>
          ))}
          Imágenes ilustrativas.
        </p>
      </div>

      <p
        className="pointer-events-none select-none text-center font-display text-[22vw] uppercase italic leading-[0.75] text-white/[0.04]"
        aria-hidden
      >
        Rebound
      </p>
      <p className="border-t border-line py-5 text-center text-xs text-muted">
        © 2026 {BUSINESS.brand}. Todos los derechos reservados.
      </p>
    </footer>
  );
}
