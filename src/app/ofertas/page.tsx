import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { PromoGate } from "@/components/PromoGate";
import { formatPromoValidity, promoHeadline } from "@/lib/promo";
import { ProductGrid } from "@/components/ProductGrid";
import { discountPercent } from "@/lib/format";
import { getCatalog } from "@/lib/catalog";
import { getOnSale } from "@/lib/products";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Ofertas",
  description: "Zapatillas y ropa de basket con precios rebajados. Pedí por WhatsApp y pagá al recibir.",
  path: "/ofertas/",
});

export default async function OffersPage() {
  const { categories, products: catalog, promotions } = await getCatalog();
  const products = [...getOnSale(catalog)].sort(
    (a, b) =>
      discountPercent(b.price, b.compareAtPrice) - discountPercent(a.price, a.compareAtPrice),
  );

  return (
    <>
      <PageHero eyebrow="Precios de liquidación" title="Ofertas" variant="gradient">
        {products.length} {products.length === 1 ? "producto rebajado" : "productos rebajados"}, con el precio anterior
        tachado. Pedilos por WhatsApp y pagá al recibir. Precios finales con IVA incluido.
        {/* Las promos son aparte; acá solo se aclara que se combinan (cada una mientras esté vigente). */}
        {promotions.map((p) => (
          <PromoGate key={p.id} promoId={p.id}>
            <span className="mt-2 block font-semibold text-white">
              Además se combinan con {promoHeadline(p, categories)}, válida {formatPromoValidity(p)}.
            </span>
          </PromoGate>
        ))}
      </PageHero>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <ProductGrid products={products} categories={categories} />
      </div>
    </>
  );
}
