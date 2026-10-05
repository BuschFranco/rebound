"use client";

import { useFavorites } from "@/context/FavoritesContext";
import { useCatalog } from "@/context/CatalogContext";
import { CAROUSEL_MAX } from "@/lib/products";
import { ProductCarousel } from "./ProductCarousel";
import { SectionHeading } from "./SectionHeading";

/**
 * "Tus favoritos" en la home (debajo de "En oferta"). Sin favoritos no se muestra
 * (ni en el HTML del servidor, así no hay saltos de hidratación). Si hay más de los que entran, "Ver todos" abre el panel.
 */
export function FavoritesSection() {
  const { products, open } = useFavorites();
  const { categories } = useCatalog();
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
      <SectionHeading eyebrow="Guardados" title="Tus favoritos" />
      <ProductCarousel
        products={products}
        categories={categories}
        label="Tus favoritos"
        onViewMore={products.length > CAROUSEL_MAX ? open : undefined}
        viewMoreLabel="Ver todos"
      />
    </section>
  );
}
