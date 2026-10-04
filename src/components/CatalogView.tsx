"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { PageHero } from "@/components/PageHero";
import { ProductGrid } from "@/components/ProductGrid";
import { CATEGORIES } from "@/data/products";
import { filterProducts, getCategoryLabel, isCategory, type SortOption } from "@/lib/products";

const SORTS: { value: SortOption; label: string }[] = [
  { value: "relevancia", label: "Relevancia" },
  { value: "menor-precio", label: "Menor precio" },
  { value: "mayor-precio", label: "Mayor precio" },
];

function buildHref(params: { q?: string; categoria?: string; orden?: string }) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "relevancia") search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `/catalogo?${qs}` : "/catalogo";
}

/** Filtra en el navegador: el sitio se exporta como estático (GitHub Pages), sin servidor. */
export function CatalogView() {
  const params = useSearchParams();
  const q = params.get("q")?.trim() || undefined;
  const rawCategory = params.get("categoria") ?? undefined;
  const category = isCategory(rawCategory) ? rawCategory : undefined;
  const rawSort = params.get("orden");
  const sort = SORTS.some((s) => s.value === rawSort) ? (rawSort as SortOption) : "relevancia";

  const products = filterProducts({ query: q, category, sort });
  const title = q ? `“${q}”` : category ? getCategoryLabel(category) : "Catálogo";
  const eyebrow = q ? "Resultados de búsqueda" : category ? "Categoría" : "Toda la colección";

  return (
    <>
      <PageHero eyebrow={eyebrow} title={title}>
        {products.length} {products.length === 1 ? "producto" : "productos"}
      </PageHero>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Categorías" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
            <FilterChip href={buildHref({ q, orden: sort })} active={!category}>
              Todo
            </FilterChip>
            {CATEGORIES.map((c) => (
              <FilterChip
                key={c.slug}
                href={buildHref({ q, categoria: c.slug, orden: sort })}
                active={category === c.slug}
              >
                {c.label}
              </FilterChip>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-widest">
            <span className="text-muted">Ordenar</span>
            {SORTS.map((s) => (
              <Link
                key={s.value}
                href={buildHref({ q, categoria: category, orden: s.value })}
                className={sort === s.value ? "text-accent" : "text-muted transition hover:text-ink"}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        {q && (
          <p className="mt-4 text-sm">
            <Link href={buildHref({ categoria: category, orden: sort })} className="text-xs font-bold uppercase tracking-widest text-accent hover:underline">
              × Limpiar búsqueda
            </Link>
          </p>
        )}

        <div className="mt-8">
          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <div className="py-20 text-center">
              <p className="font-display text-4xl uppercase italic">Airball</p>
              <p className="mt-2 text-muted">No encontramos productos para tu búsqueda.</p>
              <Link
                href="/catalogo"
                className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-xs font-bold uppercase tracking-widest text-black"
              >
                Ver todo el catálogo
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest transition ${
        active ? "border-accent bg-accent text-black" : "border-line bg-surface text-muted hover:border-white/40 hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
