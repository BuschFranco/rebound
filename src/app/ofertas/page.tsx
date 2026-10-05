import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { PromoGate } from "@/components/PromoGate";
import { PromoCountdown } from "@/components/PromoCountdown";
import { formatPromoValidity } from "@/lib/promo";
import { ProductGrid } from "@/components/ProductGrid";
import { discountPercent } from "@/lib/format";
import { getCatalog } from "@/lib/catalog";
import { getOnSale } from "@/lib/products";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Ofertas",
  description: "Zapatillas y ropa de basket con descuento y promo 3x2. Pedí por WhatsApp y pagá al recibir.",
  path: "/ofertas/",
});

export default async function OffersPage() {
  const { categories, products: catalog, promotion } = await getCatalog();
  const products = [...getOnSale(catalog)].sort(
    (a, b) =>
      discountPercent(b.price, b.compareAtPrice) - discountPercent(a.price, a.compareAtPrice),
  );

  return (
    <>
      <PageHero
        eyebrow={
          promotion ? (
            <PromoGate fallback="Ofertas de temporada">
              Promo {promotion.label} · {formatPromoValidity(promotion)}
            </PromoGate>
          ) : (
            "Ofertas de temporada"
          )
        }
        title="Ofertas"
        variant="gradient"
      >
        <PromoCountdown label="La promo termina en" className="mb-2 mr-3 rounded-full bg-black/30 px-3 py-1 text-xs uppercase tracking-widest" />
        {products.length} productos con descuento. Pedilos por WhatsApp y pagá al recibir. Precios
        finales con IVA incluido.
      </PageHero>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <ProductGrid products={products} categories={categories} />
      </div>
    </>
  );
}
