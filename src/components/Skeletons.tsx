/** Bone loaders con la misma forma que el contenido real, para que la página no salte al cargar. */

import type { CSSProperties } from "react";

function Bone({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={`skeleton rounded ${className}`} style={style} />;
}

/** Mismo tamaño que ProductCard: foto cuadrada, categoría, nombre, precio y colores. */
export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl p-[1px]">
      <div className="rounded-[11px] bg-surface p-2.5">
        <Bone className="aspect-square rounded-lg" />
        <div className="space-y-2.5 px-1 pb-1 pt-3">
          <Bone className="h-2.5 w-1/3" />
          <Bone className="h-3.5 w-4/5" />
          <Bone className="h-4 w-2/5" />
          <div className="flex gap-1.5 pt-0.5">
            <Bone className="size-3.5 rounded-full" />
            <Bone className="size-3.5 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Cargando productos"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
    >
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Encabezado de página (PageHero) mientras carga. */
export function PageHeroSkeleton() {
  return (
    <section className="border-b border-line bg-glow">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-14 sm:px-6 sm:py-20">
        <Bone className="h-3 w-40" />
        <Bone className="h-14 w-72 sm:h-20 sm:w-96" />
        <Bone className="h-3.5 w-24" />
      </div>
    </section>
  );
}

/** Filtros del catálogo mientras carga. */
export function FiltersSkeleton() {
  return (
    <div className="space-y-5 border-b border-line pb-6">
      <div className="flex gap-2 overflow-hidden">
        {[72, 110, 90, 110, 80, 104, 116].map((w, i) => (
          <Bone key={i} className="h-9 shrink-0 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Bone className="h-4 w-24" />
        <Bone className="h-9 w-48 rounded-full" />
      </div>
    </div>
  );
}

/** Ficha de producto mientras carga: galería a la izquierda, datos y compra a la derecha. */
export function ProductPageSkeleton() {
  return (
    <div role="status" aria-label="Cargando producto" className="bg-glow">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Bone className="mb-6 h-3 w-64" />
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <Bone className="aspect-square rounded-2xl" />
          <div className="space-y-5">
            <Bone className="h-3 w-24" />
            <Bone className="h-12 w-4/5 sm:h-14" />
            <Bone className="h-7 w-36" />
            <Bone className="h-24 rounded-2xl" />
            <div className="space-y-2.5">
              <Bone className="h-4 w-3/4" />
              <Bone className="h-4 w-2/3" />
              <Bone className="h-4 w-3/5" />
            </div>
            <div className="space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <Bone className="h-3 w-20" />
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Bone key={i} className="h-11 w-12 rounded-lg" />
                ))}
              </div>
              <Bone className="h-12 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Catálogo completo mientras carga (encabezado, filtros y grilla). */
export function CatalogSkeleton() {
  return (
    <>
      <PageHeroSkeleton />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <FiltersSkeleton />
        <div className="mt-8">
          <ProductGridSkeleton />
        </div>
      </div>
    </>
  );
}
