"use client";

import type { ReactNode } from "react";
import { useCatalog } from "@/context/CatalogContext";
import { usePromo } from "@/context/PromoContext";
import { PROMO_BANNER_EYEBROW, resolveBanner } from "@/lib/banners";
import { formatPromoValidity, promoDescription, promoHeadline } from "@/lib/promo";
import type { Promotion } from "@/types";
import { BannerCard } from "./BannerCard";
import { PromoCountdown } from "./PromoCountdown";
import { HighlightFree } from "./HighlightFree";

/** A dónde lleva el banner de cada promo y qué dice su botón. */
function bannerLink(promo: Promotion): { href: string; cta: string } {
  if (promo.kind === "nth_discount" && promo.scope === "categories" && promo.categorySlugs.length === 1) {
    return { href: `/catalogo?categoria=${promo.categorySlugs[0]}`, cta: `Armá tu ${promo.label}` };
  }
  if (promo.kind === "free_shipping") return { href: "/catalogo", cta: "Ver catálogo" };
  return { href: "/catalogo", cta: `Armá tu ${promo.label}` };
}

/** Pastilla del hero: la promo principal con su cuenta regresiva (o `fallback` si no hay promos vigentes). */
export function HeroPromoTag({ fallback }: { fallback: ReactNode }) {
  const { primary, promos } = usePromo();
  const { categories } = useCatalog();
  if (!primary) return <>{fallback}</>;
  const others = promos.length - 1;
  return (
    // El reloj va dentro de la pastilla: los bloques grandes chocan con el título.
    <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl bg-accent-2 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white sm:rounded-full">
      <span>
        {promoHeadline(primary, categories)}
        {others > 0 && <span className="text-white/75"> · +{others} {others === 1 ? "promo" : "promos"}</span>}
      </span>
      <PromoCountdown promo={primary} variant="inline" className="text-white/90" />
    </p>
  );
}

/** Banner de una promo: lo cargado en el panel para esa promo; lo vacío, automático. */
function PromoBannerCard({ promo }: { promo: Promotion }) {
  const { categories } = useCatalog();
  const { href, cta } = bannerLink(promo);
  const banner = resolveBanner(
    promo.banner,
    {
      eyebrow: PROMO_BANNER_EYEBROW,
      title: promoHeadline(promo, categories),
      text: `${promoDescription(promo, categories)} También con las ofertas.`,
      cta,
    },
    { etiqueta: promo.label, vigencia: formatPromoValidity(promo) },
  );

  return (
    <BannerCard href={href} cta={banner.cta} image={banner.image} tint="bg-accent-2 opacity-80" align="from-black/70">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">{banner.eyebrow}</p>
      <h2 className="mt-2 font-display text-5xl uppercase italic leading-[0.9] sm:text-6xl">{banner.title}</h2>
      <p className="mt-3 max-w-md text-sm text-white/85 sm:text-base">
        <HighlightFree text={banner.text} />
      </p>
      <PromoCountdown promo={promo} label="Termina en" className="mt-4 text-white" />
    </BannerCard>
  );
}

export type OffersBannerContent = { eyebrow: string; title: string; text: string; cta: string; image: string };

/**
 * Banners de la home: uno por cada promo vigente (la principal primero) y, si hay productos rebajados,
 * el de ofertas. En grilla de 2 columnas en la compu; si la cantidad es impar, el último ocupa todo el ancho
 * (3 = dos arriba y uno abajo, 4 = 2x2…). En el celular, uno debajo del otro.
 */
export function HomeBanners({ offers }: { offers: OffersBannerContent | null }) {
  const { promos, primary } = usePromo();
  const ordered = primary ? [primary, ...promos.filter((p) => p.id !== primary.id)] : promos;
  if (ordered.length === 0 && !offers) return null;
  // Último en posición impar: ocupa las dos columnas.
  const item = "flex lg:[&:last-child:nth-child(odd)]:col-span-2";

  return (
    <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
      <ul aria-label="Promos y ofertas" className="grid gap-4 lg:grid-cols-2">
        {ordered.map((promo) => (
          <li key={promo.id} className={item}>
            <PromoBannerCard promo={promo} />
          </li>
        ))}
        {offers && (
          <li className={item}>
            <BannerCard href="/ofertas" cta={offers.cta} image={offers.image} tint="bg-gradient-brand opacity-85" align="from-black/60">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">{offers.eyebrow}</p>
              <h2 className="mt-2 font-display text-5xl uppercase italic leading-[0.9] sm:text-6xl">{offers.title}</h2>
              <p className="mt-3 max-w-md text-sm text-white/85 sm:text-base">
                <HighlightFree text={offers.text} />
              </p>
            </BannerCard>
          </li>
        )}
      </ul>
    </section>
  );
}
