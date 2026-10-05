import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CashIcon, TruckIcon, WhatsAppIcon } from "@/components/icons";
import { Faq } from "@/components/Faq";
import { PromoCountdown } from "@/components/PromoCountdown";
import { PromoGate } from "@/components/PromoGate";
import { FavoritesSection } from "@/components/FavoritesSection";
import { PersonalizedSections } from "@/components/PersonalizedSections";
import { CategoryCarousel } from "@/components/CategoryCarousel";
import { ProductCarousel } from "@/components/ProductCarousel";
import { SectionHeading } from "@/components/SectionHeading";
import { StoryBlock } from "@/components/StoryBlock";
import { BANNER_IMAGE, HERO_IMAGE } from "@/data/site";
import { getCatalog } from "@/lib/catalog";
import { DELIVERY, POLICIES } from "@/data/business";
import { formatPromoValidity } from "@/lib/promo";
import { CAROUSEL_MAX, getLatestProducts, getMaxDiscount, getOnSale } from "@/lib/products";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  description:
    "Indumentaria y zapatillas de basket. Armá tu pedido, mandalo por WhatsApp y pagá recién cuando lo recibís. Envíos en CABA y Provincia de Buenos Aires.",
  path: "/",
});

const MARQUEE: { text: string; promo?: boolean }[] = [
  { text: "Drop nuevo" },
  { text: "Pedí por WhatsApp" },
  { text: `Entrega en ${DELIVERY.label}` },
  { text: "Envíos en CABA y Provincia de Bs. As." },
  { text: "Pagás al recibir" },
  { text: `Cambio gratis ${POLICIES.exchangeDays} días` },
  { text: "Hecho para la cancha y la calle" },
];

export default async function Home() {
  const { categories, products, promotion } = await getCatalog();
  // La promo (de la tabla `promotions`) va primera en la marquesina; PromoGate la oculta si no está vigente.
  const marquee = promotion ? [{ text: `${promotion.label} en toda la web`, promo: true }, ...MARQUEE] : MARQUEE;
  // Siempre los últimos publicados; el eyebrow dice "Recién llegado" si alguno es nuevo (< 1 mes y medio).
  const latest = getLatestProducts(products, CAROUSEL_MAX);
  const hasNew = latest.some((p) => p.isNew);
  const onSale = getOnSale(products);
  const maxDiscount = getMaxDiscount(products);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate flex min-h-[78vh] items-end overflow-hidden">
        <Image
          src={HERO_IMAGE}
          alt="Silueta de un jugador volcando la pelota en el aro"
          fill
          loading="eager"
          sizes="100vw"
          className="-z-20 object-cover object-right"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-brand opacity-50 mix-blend-color" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background/85 via-background/20 to-transparent" />
        <div className="absolute inset-0 -z-10 bg-background/55 sm:hidden" />
        <div className="absolute -left-40 bottom-0 -z-10 size-[520px] rounded-full bg-accent/20 blur-[120px]" />
        <div className="absolute -right-20 top-10 -z-10 size-[420px] rounded-full bg-accent-2/20 blur-[120px]" />

        <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-32 sm:px-6 sm:pb-24">
          {promotion ? (
            <PromoGate fallback={<SeasonTag />}>
              <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full bg-accent-2 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white">
                <span>
                  {promotion.label} en toda la web · llevá {promotion.buy}, pagá {promotion.pay}
                </span>
                <PromoCountdown className="tracking-widest" />
              </p>
            </PromoGate>
          ) : (
            <SeasonTag />
          )}
          <h1 className="mt-4 max-w-3xl font-display text-[clamp(3.5rem,11vw,9rem)] uppercase italic leading-[0.85]">
            Jugá en
            <br />
            <span className="pr-4 text-accent">otro nivel</span>
          </h1>
          <p className="mt-6 max-w-md text-base text-white/80 sm:text-lg">
            Indumentaria y zapatillas de basket. Armá tu pedido, mandalo por WhatsApp y pagá recién
            cuando lo recibís.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/catalogo"
              className="rounded-full bg-accent px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-black transition hover:brightness-110"
            >
              Comprar ahora
            </Link>
            <Link
              href="/ofertas"
              className="rounded-full border border-white/40 px-7 py-3.5 text-sm font-bold uppercase tracking-widest transition hover:border-white hover:bg-white/10"
            >
              Ver ofertas
            </Link>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="overflow-hidden border-y border-line bg-surface py-4" aria-hidden>
        <div className="flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0">
              {[...marquee, ...marquee].map(({ text, promo }, i) => {
                const item = (
                  <li
                    key={i}
                    className="flex items-center gap-8 pr-8 font-display text-2xl uppercase italic text-white/90"
                  >
                    {text}
                    <span className="size-2.5 rounded-full bg-accent" />
                  </li>
                );
                return promo ? <PromoGate key={i}>{item}</PromoGate> : item;
              })}
            </ul>
          ))}
        </div>
      </div>

      {/* Categorías */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <SectionHeading eyebrow="Elegí tu juego" title="Categorías" />
        {/* Las más visitadas por el cliente primero; si hay más de las que entran, aparecen flechas. */}
        <CategoryCarousel />
      </section>

      {/* Para quien vuelve: vistos y relacionados (historial local, sin registro) */}
      <PersonalizedSections />

      {/* Drop nuevo: los últimos productos publicados (por published_at) */}
      {latest.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
          <SectionHeading
            eyebrow={hasNew ? "Recién llegado" : "Lo último"}
            title="Drop nuevo"
            href="/catalogo?orden=nuevos"
            linkLabel="Ver lo más nuevo"
          />
          <ProductCarousel products={latest} categories={categories} viewMoreHref="/catalogo?orden=nuevos" label="Drop nuevo" />
        </section>
      )}

      {/* Banner */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="relative isolate overflow-hidden rounded-2xl">
          <Image
            src={BANNER_IMAGE}
            alt=""
            fill
            sizes="(min-width: 1280px) 1280px, 100vw"
            className="-z-20 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-brand opacity-85 mix-blend-multiply" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/60 to-transparent" />
          <div className="px-6 py-16 sm:px-12 sm:py-24">
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold uppercase tracking-[0.35em] text-white/80">
              {promotion ? (
                <PromoGate fallback={<span>Ofertas de temporada</span>}>
                  <span>
                    Promo {promotion.label} · {formatPromoValidity(promotion)}
                  </span>
                  <PromoCountdown className="tracking-widest" />
                </PromoGate>
              ) : (
                <span>Ofertas de temporada</span>
              )}
            </p>
            <h2 className="mt-3 font-display text-6xl uppercase italic leading-[0.9] sm:text-8xl">
              Hasta {maxDiscount}% off
            </h2>
            <Link
              href="/ofertas"
              className="mt-8 inline-block rounded-full bg-white px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-black transition hover:bg-accent"
            >
              Ver ofertas
            </Link>
          </div>
        </div>
      </section>

      {/* Ofertas */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <SectionHeading eyebrow="Precios de liquidación" title="En oferta" href="/ofertas" linkLabel="Ver todas" />
        <ProductCarousel products={onSale} categories={categories} viewMoreHref="/ofertas" label="En oferta" />
      </section>

      {/* Tus favoritos (solo si el cliente marcó alguno) */}
      <FavoritesSection />

      {/* Cómo comprar */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="bg-court grid gap-6 rounded-2xl border border-line bg-surface p-8 sm:grid-cols-3 sm:p-10">
          {[
            { icon: <WhatsAppIcon className="size-7 text-whatsapp" />, title: "Pedí por WhatsApp", text: "Armá el carrito y mandanos el pedido en un toque." },
            { icon: <TruckIcon className="size-7 text-accent" />, title: "Envíos en CABA y PBA", text: "Coordinamos la entrega por chat y te informamos el costo antes de confirmar." },
            { icon: <CashIcon className="size-7 text-accent-2" />, title: "Pagás al recibir", text: `Sin tarjetas ni anticipos. Cambio gratis ${POLICIES.exchangeDays} días y devolución sin costo por fallas.` },
          ].map((f) => (
            <div key={f.title} className="flex gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-2">{f.icon}</span>
              <div>
                <h3 className="font-display text-xl uppercase italic">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <StoryBlock />
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-20 sm:px-6">
        <Faq />
      </div>
    </>
  );
}

function SeasonTag() {
  return <p className="text-xs font-bold uppercase tracking-[0.35em] text-accent">Temporada 2026</p>;
}
