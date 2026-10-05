"use client";

import { useSyncExternalStore } from "react";
import { useCatalog } from "@/context/CatalogContext";
import { CAROUSEL_MAX, getProductById, getRecommendations } from "@/lib/products";
import { viewedStore } from "@/lib/viewedStore";
import { ProductCarousel } from "./ProductCarousel";
import { SectionHeading } from "./SectionHeading";

/**
 * Secciones de la home armadas con el historial local del cliente:
 * "Volvé a verlos" (lo que visitó) y, debajo, "Basado en lo que viste" (relacionados).
 * Sin historial no se muestra nada (y en el HTML del servidor tampoco, así no hay saltos de hidratación).
 */
export function PersonalizedSections() {
  const { products, categories } = useCatalog();
  const viewedIds = useSyncExternalStore(viewedStore.subscribe, viewedStore.getSnapshot, viewedStore.getServerSnapshot);

  // Solo lo que sigue publicado en la base.
  const viewed = viewedIds.flatMap((id) => {
    const p = getProductById(products, id);
    return p ? [p] : [];
  });
  if (viewed.length === 0) return null;

  const recommended = getRecommendations(products, categories, viewed.map((p) => p.id), CAROUSEL_MAX);
  // "Ver más" de los recomendados: la categoría de lo último que miró.
  const lastCategory = viewed[0].category;

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading eyebrow="Tus vistos" title="Volvé a verlos" />
          <button
            type="button"
            onClick={viewedStore.clear}
            className="mb-8 shrink-0 text-xs font-semibold uppercase tracking-widest text-muted transition hover:text-accent"
          >
            Borrar historial
          </button>
        </div>
        <ProductCarousel products={viewed} categories={categories} viewMoreHref="/catalogo" label="Volvé a verlos" />
      </section>

      {recommended.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
          <SectionHeading eyebrow="Para vos" title="Basado en lo que viste" />
          <ProductCarousel
            products={recommended}
            categories={categories}
            viewMoreHref={`/catalogo?categoria=${lastCategory}`}
            label="Basado en lo que viste"
          />
        </section>
      )}
    </>
  );
}
