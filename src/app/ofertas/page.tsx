import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { POLICIES } from "@/data/business";
import { ProductGrid } from "@/components/ProductGrid";
import { discountPercent } from "@/lib/format";
import { getOnSale } from "@/lib/products";

export const metadata: Metadata = { title: "Ofertas" };

export default function OffersPage() {
  const products = [...getOnSale()].sort(
    (a, b) =>
      discountPercent(b.price, b.compareAtPrice) - discountPercent(a.price, a.compareAtPrice),
  );

  return (
    <>
      <PageHero
        eyebrow={`Del ${POLICIES.promoFrom} al ${POLICIES.promoTo}`}
        title="Ofertas"
        variant="gradient"
      >
        {products.length} productos con descuento. Pedilos por WhatsApp y pagá al recibir. Precios
        finales con IVA incluido.
      </PageHero>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <ProductGrid products={products} />
      </div>
    </>
  );
}
