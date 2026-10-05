import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliveryEstimate } from "@/components/DeliveryEstimate";
import { Faq } from "@/components/Faq";
import { PriceTag } from "@/components/PriceTag";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductPurchase } from "@/components/ProductPurchase";
import { PromoCallout } from "@/components/PromoCallout";
import { SectionHeading } from "@/components/SectionHeading";
import { StoryBlock } from "@/components/StoryBlock";
import { TrustStrip } from "@/components/TrustStrip";
import { JsonLd } from "@/components/JsonLd";
import { BUSINESS, POLICIES } from "@/data/business";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { getCategoryLabel, getProductBySlug, getProducts, getRelated } from "@/lib/products";

export function generateStaticParams() {
  return getProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  return pageMetadata({
    title: product.name,
    description: `${product.description} Pedilo por WhatsApp y pagá al recibir.`,
    path: `/producto/${product.slug}/`,
    images: product.images.slice(0, 1),
  });
}

export default async function ProductPage({ params }: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const related = getRelated(product);
  const url = absoluteUrl(`/producto/${product.slug}/`);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      image: product.images,
      sku: product.id,
      category: getCategoryLabel(product.category),
      brand: { "@type": "Brand", name: BUSINESS.brand },
      color: product.colors.map((c) => c.name).join(", "),
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "ARS",
        price: product.price,
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: absoluteUrl("/") },
        {
          "@type": "ListItem",
          position: 2,
          name: getCategoryLabel(product.category),
          item: absoluteUrl(`/catalogo/?categoria=${product.category}`),
        },
        { "@type": "ListItem", position: 3, name: product.name, item: url },
      ],
    },
  ];

  return (
    <div className="bg-glow">
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <nav aria-label="Ruta" className="mb-6 text-xs font-semibold uppercase tracking-widest text-muted">
          <Link href="/" className="hover:text-ink">Inicio</Link>
          <span className="mx-2">/</span>
          <Link href={`/catalogo?categoria=${product.category}`} className="hover:text-ink">
            {getCategoryLabel(product.category)}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="grid gap-3">
            {product.images.map((src, i) => (
              <div
                key={src}
                className="relative aspect-square overflow-hidden rounded-2xl bg-surface ring-1 ring-line"
              >
                <Image
                  src={src}
                  alt={i === 0 ? product.name : `${product.name} – vista ${i + 1}`}
                  fill
                  loading={i === 0 ? "eager" : "lazy"}
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          <div className="lg:sticky lg:top-32 lg:self-start">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
                {getCategoryLabel(product.category)}
              </span>
              {product.isNew && (
                <span className="rounded bg-accent-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                  Nuevo
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-5xl uppercase italic leading-[0.95] sm:text-6xl">
              {product.name}
            </h1>
            <div className="mt-4">
              <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
            </div>
            <div className="mt-5">
              <PromoCallout price={product.price} />
            </div>

            {product.highlights && (
              <ul className="mt-6 space-y-2">
                {product.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2.5 text-sm text-ink">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
                      ✓
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-5 text-sm leading-relaxed text-muted">{product.description}</p>

            <div className="mt-8 space-y-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <ProductPurchase product={product} />
              <DeliveryEstimate />
              <TrustStrip />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Cambio gratis dentro de los {POLICIES.exchangeDays} días y
              devolución sin costo por fallas (garantía legal de {POLICIES.legalWarrantyMonths} meses).{" "}
              <Link href="/cambios-y-devoluciones" className="text-accent underline">
                Ver condiciones
              </Link>
            </p>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-24">
            <SectionHeading eyebrow="Completá el look" title="También te puede gustar" />
            <ProductGrid products={related} />
          </section>
        )}

        <div className="mt-24 grid gap-10 lg:grid-cols-2">
          <Faq />
          <StoryBlock className="lg:mt-[4.5rem] lg:self-start" />
        </div>
      </div>
    </div>
  );
}
