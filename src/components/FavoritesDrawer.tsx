"use client";

import { useLenis } from "lenis/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useCatalog } from "@/context/CatalogContext";
import { useFavorites } from "@/context/FavoritesContext";
import { availableSizes, getCategoryLabel } from "@/lib/products";
import type { Product } from "@/types";
import { CloseIcon, StarIcon } from "./icons";
import { PriceTag } from "./PriceTag";
import { SkeletonImage } from "./SkeletonImage";

/** Panel lateral con los favoritos (misma carcasa que el carrito); desde acá se puede agregar al carrito. */
export function FavoritesDrawer() {
  const { products, count, isOpen, close, clear } = useFavorites();
  const lenis = useLenis();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    lenis?.stop();
    return () => {
      document.removeEventListener("keydown", onKey);
      lenis?.start();
    };
  }, [isOpen, close, lenis]);

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`} inert={!isOpen}>
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Favoritos"
        data-lenis-prevent
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-3xl uppercase italic">
            Favoritos <span className="text-accent">({count})</span>
          </h2>
          <button
            type="button"
            onClick={close}
            className="grid size-9 place-items-center rounded-full hover:bg-surface-2"
            aria-label="Cerrar favoritos"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <StarIcon className="size-14 text-accent" />
            <p className="font-display text-4xl uppercase italic">Sin favoritos</p>
            <p className="max-w-xs text-muted">
              Todavía no guardaste ninguno. Tocá la <span className="text-accent">★</span> en cualquier producto para
              tenerlo a mano acá.
            </p>
            <Link
              href="/catalogo"
              onClick={close}
              className="rounded-full bg-accent px-6 py-3 text-xs font-bold uppercase tracking-widest text-black"
            >
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-5" data-lenis-prevent>
              {products.map((p) => (
                <FavoriteRow key={p.id} product={p} onNavigate={close} />
              ))}
            </ul>
            <div className="flex justify-end border-t border-line px-5 py-4">
              <button
                type="button"
                onClick={clear}
                className="text-xs font-semibold uppercase tracking-widest text-muted transition hover:text-accent"
              >
                Vaciar favoritos
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/** Fila de un favorito: elegir color y talle (si hay más de uno) y agregar al carrito. */
function FavoriteRow({ product: p, onNavigate }: { product: Product; onNavigate: () => void }) {
  const { remove } = useFavorites();
  const { addItem } = useCart();
  const { categories } = useCatalog();
  const inStock = availableSizes(p);
  const soldOut = inStock.length === 0;
  const [size, setSize] = useState(p.sizes.length === 1 && inStock.length === 1 ? inStock[0] : "");
  const [color, setColor] = useState(p.colors.length === 1 ? p.colors[0].name : "");
  const [error, setError] = useState("");
  // Cambia en cada intento fallido para volver a disparar el temblor del aviso.
  const [attempt, setAttempt] = useState(0);

  function add() {
    if (soldOut) return;
    const missing = !color ? "un color" : !size ? "un talle" : "";
    if (missing) {
      setError(`Elegí ${missing}.`);
      setAttempt((n) => n + 1);
      return;
    }
    setError("");
    onNavigate(); // cierra favoritos; el carrito se abre solo al agregar
    addItem(p, size, color);
  }

  const chip = (active: boolean) =>
    `rounded-md border px-2 py-1 text-xs font-semibold tabular-nums transition ${
      active ? "border-accent bg-accent text-black" : "border-line bg-surface-2 hover:border-white/40"
    }`;

  return (
    <li className="flex gap-4 py-4">
      <Link
        href={`/producto/${p.slug}`}
        onClick={onNavigate}
        className="relative aspect-square w-20 shrink-0 self-start overflow-hidden rounded-lg bg-surface-2"
      >
        <SkeletonImage src={p.images[0]} alt={p.name} fill sizes="80px" className="object-cover" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              {getCategoryLabel(categories, p.category)}
            </p>
            <Link
              href={`/producto/${p.slug}`}
              onClick={onNavigate}
              className="text-sm font-semibold uppercase leading-snug tracking-wide hover:text-accent"
            >
              {p.name}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => remove(p.id)}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-accent"
            aria-label={`Quitar ${p.name} de favoritos`}
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
        <PriceTag price={p.price} compareAtPrice={p.compareAtPrice} />

        {p.colors.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Color de ${p.name}`}>
            {p.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                aria-pressed={color === c.name}
                title={c.name}
                className={`size-6 rounded-full ring-offset-2 ring-offset-surface transition ${
                  color === c.name ? "ring-2 ring-accent" : "ring-1 ring-white/25 hover:ring-white/60"
                }`}
                style={{ backgroundColor: c.hex }}
              >
                <span className="sr-only">{c.name}</span>
              </button>
            ))}
            <span className="ml-1 text-xs text-muted">{color || "Color"}</span>
          </div>
        )}
        {p.sizes.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Talle de ${p.name}`}>
            {p.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                disabled={!inStock.includes(s)}
                aria-pressed={size === s}
                title={inStock.includes(s) ? undefined : "Agotado"}
                className={inStock.includes(s) ? chip(size === s) : "cursor-not-allowed rounded-md border border-line/60 px-2 py-1 text-xs font-semibold text-muted/60 line-through"}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={add}
          disabled={soldOut}
          className={`mt-1 self-start rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition ${
            soldOut ? "cursor-not-allowed bg-surface-2 text-muted" : "bg-accent text-black hover:brightness-110"
          }`}
        >
          {soldOut ? "Sin stock" : "Agregar al carrito"}
        </button>
        {error && (
          <p key={attempt} role="alert" className="animate-shake text-xs font-semibold text-danger">
            ⚠ {error}
          </p>
        )}
      </div>
    </li>
  );
}
