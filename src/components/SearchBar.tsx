"use client";

import { SkeletonImage } from "./SkeletonImage";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useCatalog } from "@/context/CatalogContext";
import { formatPrice } from "@/lib/format";
import { getCategoryLabel, searchProducts } from "@/lib/products";
import { SearchIcon } from "./icons";

/** Cuántas coincidencias se muestran mientras se escribe. */
const MAX_SUGGESTIONS = 6;

const catalogUrl = (q: string) => (q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo");

/**
 * Buscador con resultados en vivo: a medida que se escribe aparecen los productos que coinciden
 * (mismo criterio que el catálogo). Enter abre el producto marcado o, si no hay ninguno, el catálogo filtrado.
 */
export function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { categories, products } = useCatalog();
  const id = useId();
  const listId = `${id}-results`;
  const rootRef = useRef<HTMLFormElement>(null);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const q = query.trim();
  const matches = q ? searchProducts(products, categories, q) : [];
  const suggestions = matches.slice(0, MAX_SUGGESTIONS);
  const showPanel = open && q.length > 0;

  // Al cambiar de página se cierra la lista y el texto sigue a la URL: vacío en una ficha,
  // la búsqueda en /catalogo?q=… (ajuste de estado durante el render, sin efecto).
  const url = `${pathname}?${searchParams}`;
  const [lastUrl, setLastUrl] = useState(url);
  if (url !== lastUrl) {
    setLastUrl(url);
    setQuery(searchParams.get("q") ?? "");
    setOpen(false);
    setActive(-1);
  }

  // Con las flechas, el producto marcado queda siempre a la vista.
  useEffect(() => {
    if (active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  // Click afuera: cerrar.
  useEffect(() => {
    if (!showPanel) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [showPanel]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setOpen(false);
    const picked = suggestions[active];
    router.push(picked ? `/producto/${picked.slug}` : catalogUrl(q));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!suggestions.length || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    e.preventDefault();
    setOpen(true);
    const step = e.key === "ArrowDown" ? 1 : -1;
    // -1 = ningún producto marcado (Enter busca en el catálogo).
    setActive((i) => ((i + 1 + step + suggestions.length + 1) % (suggestions.length + 1)) - 1);
  }

  return (
    <form ref={rootRef} role="search" onSubmit={onSubmit} className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        Buscar productos
      </label>
      <input
        id={id}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Buscar zapatillas, jerseys, shorts…"
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className="w-full rounded-full border border-line bg-surface py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
      />
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
          {suggestions.length > 0 ? (
            <>
              <ul id={listId} role="listbox" aria-label="Productos que coinciden" className="max-h-[60vh] overflow-y-auto py-1">
                {suggestions.map((p, i) => (
                  <li key={p.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                    <Link
                      href={`/producto/${p.slug}`}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex items-center gap-3 border-l-2 px-3 py-2 transition ${
                        i === active ? "border-accent bg-accent/10" : "border-transparent"
                      }`}
                    >
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-surface-2">
                        <SkeletonImage src={p.images[0]} alt="" fill sizes="48px" className="object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-accent">
                          {getCategoryLabel(categories, p.category)}
                        </span>
                        <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-ink">{formatPrice(p.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={catalogUrl(q)}
                onClick={() => setOpen(false)}
                className="block border-t border-line px-3 py-2.5 text-center text-xs font-bold uppercase tracking-widest text-ink underline decoration-accent decoration-2 underline-offset-4 transition hover:text-accent"
              >
                Ver todos los resultados ({matches.length})
              </Link>
            </>
          ) : (
            <p id={listId} role="status" className="px-4 py-4 text-sm text-muted">
              No encontramos productos para “{q}”.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
