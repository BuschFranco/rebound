import Image from "next/image";
import Link from "next/link";
import { CashIcon, TruckIcon, WhatsAppIcon } from "@/components/icons";
import { ProductGrid } from "@/components/ProductGrid";
import { SectionHeading } from "@/components/SectionHeading";
import { BANNER_IMAGE, CATEGORIES, HERO_IMAGE } from "@/data/products";
import { POLICIES } from "@/data/business";
import { getMaxDiscount, getNewArrivals, getOnSale } from "@/lib/products";

const MARQUEE = [
  "Drop nuevo",
  "Pedí por WhatsApp",
  "Envíos en CABA y Provincia de Bs. As.",
  "Pagás al recibir",
  `Cambio gratis ${POLICIES.exchangeDays} días`,
  "Hecho para la cancha y la calle",
];

export default function Home() {
  const newArrivals = getNewArrivals().slice(0, 4);
  const onSale = getOnSale().slice(0, 4);
  const maxDiscount = getMaxDiscount();

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
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-accent">Temporada 2026</p>
          <h1 className="mt-4 max-w-3xl font-display text-[clamp(3.5rem,11vw,9rem)] uppercase italic leading-[0.85]">
            Jugá en
            <br />
            <span className="text-gradient pr-4">otro nivel</span>
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
              {[...MARQUEE, ...MARQUEE].map((text, i) => (
                <li
                  key={i}
                  className="flex items-center gap-8 pr-8 font-display text-2xl uppercase italic text-white/90"
                >
                  {text}
                  <span className="size-2.5 rounded-full bg-gradient-brand" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      {/* Categorías */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <SectionHeading eyebrow="Elegí tu juego" title="Categorías" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/catalogo?categoria=${c.slug}`}
              className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-surface ring-1 ring-line transition hover:ring-2 hover:ring-accent"
            >
              <Image
                src={c.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition duration-500 group-hover:scale-110"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <span className="absolute bottom-3 left-3 font-display text-2xl uppercase italic leading-none">
                {c.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Drop nuevo */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <SectionHeading eyebrow="Recién llegado" title="Drop nuevo" href="/catalogo" />
        <ProductGrid products={newArrivals} />
      </section>

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
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/80">
              Del {POLICIES.promoFrom} al {POLICIES.promoTo}
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
        <ProductGrid products={onSale} />
      </section>

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
    </>
  );
}
