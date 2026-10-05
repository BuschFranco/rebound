import Link from "next/link";
import { CAROUSEL_MAX, getCategoryLabel } from "@/lib/products";
import type { CategoryInfo, Product } from "@/types";
import { Carousel } from "./Carousel";
import { ProductCard } from "./ProductCard";

const VIEW_MORE =
  "whitespace-nowrap text-sm font-bold uppercase tracking-widest text-ink underline decoration-accent decoration-2 underline-offset-8 transition hover:text-accent";

/** Fila deslizable de productos: hasta CAROUSEL_MAX tarjetas y un "Ver más" al final (link o acción). */
export function ProductCarousel({
  products,
  categories,
  viewMoreHref,
  onViewMore,
  viewMoreLabel = "Ver más",
  label,
}: {
  products: Product[];
  categories: CategoryInfo[];
  viewMoreHref?: string;
  /** En lugar de un link, una acción (ej. abrir el panel de favoritos). Solo desde componentes cliente. */
  onViewMore?: () => void;
  viewMoreLabel?: string;
  /** Nombre accesible de la fila (ej. "Drop nuevo"). */
  label: string;
}) {
  return (
    <Carousel label={label} arrowTop="top-[38%]">
      {products.slice(0, CAROUSEL_MAX).map((p, i) => (
        <li key={p.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[23%]">
          <ProductCard product={p} categoryLabel={getCategoryLabel(categories, p.category)} priority={i < 4} />
        </li>
      ))}
      {/* "Ver más": solo texto subrayado, centrado en la altura de las tarjetas. */}
      {(viewMoreHref || onViewMore) && (
        <li className="flex shrink-0 snap-end items-center justify-center px-6 sm:px-10">
          {viewMoreHref ? (
            <Link href={viewMoreHref} className={VIEW_MORE}>
              {viewMoreLabel}
            </Link>
          ) : (
            <button type="button" onClick={onViewMore} className={VIEW_MORE}>
              {viewMoreLabel}
            </button>
          )}
        </li>
      )}
    </Carousel>
  );
}
