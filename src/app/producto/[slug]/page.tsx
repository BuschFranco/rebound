import type { Metadata } from "next";
import { ProductGallery } from "@/components/ProductGallery";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliveryEstimate } from "@/components/DeliveryEstimate";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ShareButton } from "@/components/ShareButton";
import { Faq } from "@/components/Faq";
import { PriceTag } from "@/components/PriceTag";
import { ProductCarousel } from "@/components/ProductCarousel";
import { ProductPurchase } from "@/components/ProductPurchase";
import { PromoCallout } from "@/components/PromoCallout";
import { SectionHeading } from "@/components/SectionHeading";
import { StoryBlock } from "@/components/StoryBlock";
import { TrackProductView } from "@/components/TrackProductView";
import { TrustStrip } from "@/components/TrustStrip";
import { JsonLd } from "@/components/JsonLd";
import { BUSINESS, POLICIES } from "@/data/business";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { getCatalog } from "@/lib/catalog";
import { CAROUSEL_MAX, getCategoryLabel, getProductBySlug, getRelated } from "@/lib/products";

// Se prerenderizan los productos existentes al compilar; los que se carguen después en la base
// se generan en la primera visita (dynamicParams es true por defecto).
export async function generateStaticParams() {
  const { products } = await getCatalog();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { products } = await getCatalog();
  const product = getProductBySlug(products, slug);
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
  const { categories, products } = await getCatalog();
  const product = getProductBySlug(products, slug);
  if (!product) notFound();

  const related = getRelated(products, product, CAROUSEL_MAX);
  const categoryLabel = getCategoryLabel(categories, product.category);
  const url = absoluteUrl(`/producto/${product.slug}/`);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      image: product.images,
      sku: product.id,
      category: categoryLabel,
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
          name: categoryLabel,
          item: absoluteUrl(`/catalogo/?categoria=${product.category}`),
        },
        { "@type": "ListItem", position: 3, name: product.name, item: url },
      ],
    },
  ];

  return (
    <div className="bg-glow">
      <JsonLd data={jsonLd} />
      <TrackProductView productId={product.id} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <nav aria-label="Ruta" className="mb-6 text-xs font-semibold uppercase tracking-widest text-muted">
          <Link href="/" className="hover:text-ink">Inicio</Link>
          <span className="mx-2">/</span>
          <Link href={`/catalogo?categoria=${product.category}`} className="hover:text-ink">
            {categoryLabel}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <ProductGallery images={product.images} name={product.name} />

          <div className="lg:sticky lg:top-32 lg:self-start">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
                {categoryLabel}
              </span>
              {product.isNew && (
                <span className="rounded bg-accent-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                  Nuevo
                </span>
              )}
            </div>
            <div className="mt-3 flex items-start justify-between gap-4">
              <h1 className="font-display text-5xl uppercase italic leading-[0.95] sm:text-6xl">{product.name}</h1>
              <div className="mt-1 flex shrink-0 gap-2">
                <ShareButton name={product.name} path={`/producto/${product.slug}/`} />
                <FavoriteButton productId={product.id} productName={product.name} variant="inline" />
              </div>
            </div>
            <div className="mt-4">
              <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
            </div>
            <div className="mt-5">
              <PromoCallout product={product} />
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
            <ProductCarousel
              products={related}
              categories={categories}
              viewMoreHref={`/catalogo?categoria=${product.category}`}
              label="También te puede gustar"
            />
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
