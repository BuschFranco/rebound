"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

/**
 * Fila que se desliza horizontalmente con flechas a los costados.
 * Las flechas solo aparecen si el contenido no entra en el ancho y se ocultan en cada punta;
 * en celular también se puede deslizar con el dedo. `children` son los `<li>` de la fila.
 */
export function Carousel({
  label,
  children,
  arrowTop = "top-1/2",
}: {
  /** Nombre accesible de la fila (ej. "Drop nuevo"). */
  label: string;
  children: ReactNode;
  /** Altura de las flechas (clase de Tailwind), para centrarlas sobre las imágenes. */
  arrowTop?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () =>
      setEdges({
        // Margen de tolerancia por el redondeo del snap.
        atStart: el.scrollLeft <= 8,
        atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
      });
    // ResizeObserver avisa apenas empieza a observar y en cada cambio de tamaño (ej. al rotar el celular).
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  function scroll(dir: -1 | 1) {
    const el = listRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  const arrow = `absolute ${arrowTop} z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-background/90 text-ink shadow-xl backdrop-blur transition hover:border-accent hover:text-accent sm:size-11`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label={`Anteriores de ${label}`}
        className={`${arrow} left-0 sm:-left-3 lg:-left-5 ${edges.atStart ? "pointer-events-none opacity-0" : "opacity-100"}`}
        tabIndex={edges.atStart ? -1 : 0}
      >
        <Chevron dir="left" />
      </button>

      <ul
        ref={listRef}
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>

      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label={`Siguientes de ${label}`}
        className={`${arrow} right-0 sm:-right-3 lg:-right-5 ${edges.atEnd ? "pointer-events-none opacity-0" : "opacity-100"}`}
        tabIndex={edges.atEnd ? -1 : 0}
      >
        <Chevron dir="right" />
      </button>
    </div>
  );
}
