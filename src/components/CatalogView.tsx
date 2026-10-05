"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { PageHero } from "@/components/PageHero";
import { ProductGrid } from "@/components/ProductGrid";
import { useCatalog, useOrderedCategories } from "@/context/CatalogContext";
import { countByCategory, filterProducts, getCategoryLabel, isCategory, type SortOption } from "@/lib/products";

const SORTS: { value: SortOption; label: string }[] = [
  { value: "relevancia", label: "Relevancia" },
  { value: "nuevos", label: "Más nuevos" },
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

/** Filtra en el navegador sobre el catálogo que el layout trajo de Supabase (respuesta instantánea al cambiar filtros). */
export function CatalogView() {
  const { categories, products: allProducts } = useCatalog();
  const orderedCategories = useOrderedCategories();
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q")?.trim() || undefined;
  const rawCategory = params.get("categoria") ?? undefined;
  const category = isCategory(categories, rawCategory) ? rawCategory : undefined;
  const rawSort = params.get("orden");
  const sort = SORTS.some((s) => s.value === rawSort) ? (rawSort as SortOption) : "relevancia";

  const products = filterProducts({ products: allProducts, categories, query: q, category, sort });
  // Cantidad por categoría dentro de la búsqueda actual (los chips muestran cuántos hay en cada una).
  const matching = filterProducts({ products: allProducts, categories, query: q });
  const counts = countByCategory(matching);
  const title = q ? `“${q}”` : category ? getCategoryLabel(categories, category) : "Catálogo";
  const eyebrow = q ? "Resultados de búsqueda" : category ? "Categoría" : "Toda la colección";

  return (
    <>
      <PageHero eyebrow={eyebrow} title={title}>
        {products.length} {products.length === 1 ? "producto" : "productos"}
      </PageHero>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="space-y-5 border-b border-line pb-6">
          <nav
            aria-label="Categorías"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
          >
            <FilterChip href={buildHref({ q, orden: sort })} active={!category} count={matching.length}>
              Todo
            </FilterChip>
            {orderedCategories.map((c) => (
              <FilterChip
                key={c.slug}
                href={buildHref({ q, categoria: c.slug, orden: sort })}
                active={category === c.slug}
                count={counts[c.slug] ?? 0}
              >
                {c.label}
              </FilterChip>
            ))}
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              <span className="font-semibold text-ink">{products.length}</span>{" "}
              {products.length === 1 ? "producto" : "productos"}
            </p>
            <label className="flex items-center gap-3 text-sm">
              <span className="text-muted">Ordenar por</span>
              <span className="relative">
                <select
                  value={sort}
                  onChange={(e) =>
                    router.push(buildHref({ q, categoria: category, orden: e.target.value }), { scroll: false })
                  }
                  className="appearance-none rounded-full border border-line bg-surface py-2 pl-4 pr-10 font-semibold text-ink outline-none transition hover:border-white/40 focus:border-accent focus:ring-2 focus:ring-accent/25"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-surface">
                      {s.label}
                    </option>
                  ))}
                </select>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-accent"
                  aria-hidden
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </label>
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
            <ProductGrid products={products} categories={categories} />
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
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-accent bg-accent text-black"
          : "border-line bg-surface text-ink/85 hover:border-accent/60 hover:text-ink"
      }`}
    >
      {children}
      <span
        className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-black/15 text-black/80" : "bg-surface-2 text-muted"}`}
      >
        {count}
      </span>
    </Link>
  );
}
