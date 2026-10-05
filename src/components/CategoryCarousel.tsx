"use client";

import { SkeletonImage } from "./SkeletonImage";
import Link from "next/link";
import { useOrderedCategories } from "@/context/CatalogContext";
import { Carousel } from "./Carousel";

/**
 * Categorías de la home en una fila deslizable (en escritorio entran 6; si hay más, aparecen las flechas).
 * Van primero las categorías con más productos vistos por el cliente (historial local);
 * en el HTML del servidor y sin historial, se usa el orden de la base.
 */
export function CategoryCarousel() {
  const ordered = useOrderedCategories();

  return (
    <Carousel label="Categorías">
      {ordered.map((c) => (
        <li
          key={c.slug}
          className="w-[42%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-5rem)/6)]"
        >
          <Link
            href={`/catalogo?categoria=${c.slug}`}
            className="group relative block aspect-[3/4] overflow-hidden rounded-xl bg-surface ring-1 ring-inset ring-line transition hover:ring-2 hover:ring-accent"
          >
            <SkeletonImage
              src={c.image}
              alt=""
              fill
              sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition duration-500 group-hover:scale-110"
            />
            <span className="absolute inset-0 bg-black/45" />
            <span className="absolute bottom-3 left-3 font-display text-2xl uppercase italic leading-none">
              {c.label}
            </span>
          </Link>
        </li>
      ))}
    </Carousel>
  );
}
