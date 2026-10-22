"use client";

import { useLenis } from "lenis/react";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useCatalog } from "@/context/CatalogContext";
import { formatPrice } from "@/lib/format";
import { flyToCart } from "@/lib/fx";
import {
  availableColors,
  availableSizes,
  hasLastUnits,
  isLastSizeEverywhere,
  variantLimit,
  variantStock,
} from "@/lib/products";
import type { Product } from "@/types";
import { QuantityPromoHint } from "./QuantityPromoHint";
import { SizeGuide } from "./SizeGuide";

export function ProductPurchase({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { categories } = useCatalog();
  const sizeGuide = categories.find((c) => c.slug === product.category)?.sizeGuide ?? "none";
  const colorsInStock = availableColors(product);
  const soldOut = colorsInStock.length === 0;
  const [color, setColor] = useState(product.colors.length === 1 ? product.colors[0].name : "");
  // Talles con stock en el color elegido (sin color: en alguno).
  const inStock = availableSizes(product, color || undefined);
  const [pickedSize, setSize] = useState(inStock.length === 1 && product.sizes.length === 1 ? inStock[0] : "");
  // Si al cambiar de color el talle elegido se queda sin stock, se deselecciona.
  const size = inStock.includes(pickedSize) ? pickedSize : "";
  // La guía de talles puede recomendar uno agotado: en ese caso no se elige.
  const pickSize = (s: string) => {
    if (inStock.includes(s)) setSize(s);
  };
  const last = Boolean(size && color) && variantStock(product, color, size) === "last";
  const limit = size && color ? variantLimit(product, color, size) : null;
  const [pickedQuantity, setQuantity] = useState(1);
  const quantity = limit === null ? pickedQuantity : Math.min(pickedQuantity, Math.max(limit, 1));
  const [showErrors, setShowErrors] = useState(false);
  // Cambia en cada intento fallido para volver a disparar el temblor del aviso.
  const [errorAttempt, setErrorAttempt] = useState(0);

  const ready = Boolean(size && color);
  const [adding, setAdding] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lenis = useLenis();

  // Barra fija en el celular mientras el botón principal no está a la vista.
  const [buttonVisible, setButtonVisible] = useState(true);
  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setButtonVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const showStickyBar = !soldOut && !buttonVisible;
  // El botón flotante de WhatsApp sube para no quedar tapado por la barra.
  useEffect(() => {
    if (!showStickyBar) return;
    document.body.dataset.stickyCta = "";
    return () => {
      delete document.body.dataset.stickyCta;
    };
  }, [showStickyBar]);

  /** `from`: botón desde el que sale la pelota hacia el carrito. */
  async function handleAdd(from: Element | null) {
    if (soldOut || adding) return;
    if (!ready) {
      setShowErrors(true);
      setErrorAttempt((n) => n + 1);
      // Desde la barra fija: llevar a la persona a elegir talle y color.
      if (from !== buttonRef.current && rootRef.current) {
        // El header es fijo: se deja su alto (más un margen) arriba del selector.
        const offset = -((document.querySelector("header")?.offsetHeight ?? 0) + 16);
        if (lenis) lenis.scrollTo(rootRef.current, { offset });
        else window.scrollTo({ top: rootRef.current.getBoundingClientRect().top + window.scrollY + offset, behavior: "smooth" });
      }
      return;
    }
    setAdding(true);
    if (from) await flyToCart(from);
    addItem(product, size, color, quantity);
    setQuantity(1);
    setAdding(false);
  }

  return (
    <div ref={rootRef} className="space-y-6">
      {!soldOut && !(size && color) && hasLastUnits(product) && (
        <p className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-accent">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
          Quedan últimas unidades en algunos talles
        </p>
      )}
      <fieldset>
        <legend className="mb-3 text-xs font-bold uppercase tracking-widest">
          Color: <span className="font-normal normal-case tracking-normal text-muted">{color || "Elegí un color"}</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {product.colors.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setColor(c.name)}
              disabled={!colorsInStock.includes(c)}
              aria-pressed={color === c.name}
              aria-label={colorsInStock.includes(c) ? c.name : `${c.name} (agotado)`}
              title={colorsInStock.includes(c) ? c.name : `${c.name} · Agotado`}
              className={`size-9 rounded-full border-2 p-0.5 transition disabled:cursor-not-allowed disabled:opacity-30 ${
                color === c.name ? "border-accent" : "border-transparent hover:border-white/30"
              }`}
            >
              <span
                className="block size-full rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: c.hex }}
              />
            </button>
          ))}
        </div>
        {showErrors && !color && (
          <p key={errorAttempt} role="alert" className="mt-2 animate-shake text-sm font-semibold text-danger">
            ⚠ Seleccioná un color.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-3 flex w-full items-center justify-between gap-3 text-xs font-bold uppercase tracking-widest">
          <span>
            Talle: <span className="font-normal normal-case tracking-normal text-muted">{size || "Elegí un talle"}</span>
          </span>
          <SizeGuide kind={sizeGuide} onPick={pickSize} />
        </legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {product.sizes.map((s) => {
            const out = !inStock.includes(s);
            const lastOne =
              !out && (color ? variantStock(product, color, s) === "last" : isLastSizeEverywhere(product, s));
            return (
              <button
                key={s}
                type="button"
                onClick={() => pickSize(s)}
                disabled={out}
                aria-pressed={size === s}
                aria-label={out ? `${s} (agotado)` : s}
                title={out ? "Agotado" : undefined}
                className={`relative rounded-lg border px-2 py-2.5 text-sm font-semibold tabular-nums transition ${
                  out
                    ? "cursor-not-allowed border-line/60 bg-surface text-muted/60 line-through"
                    : size === s
                      ? "border-accent bg-accent text-black"
                      : "border-line bg-surface-2 hover:border-white/40"
                }`}
              >
                {s}
                {out && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-surface-2 px-1 text-[8px] font-bold uppercase tracking-wider text-muted no-underline">
                    Agotado
                  </span>
                )}
                {lastOne && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-accent px-1 text-[8px] font-bold uppercase tracking-wider text-black">
                    Último
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {showErrors && !size && (
          <p key={errorAttempt} role="alert" className="mt-2 animate-shake text-sm font-semibold text-danger">
            ⚠ Seleccioná un talle.
          </p>
        )}
        {last && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-accent">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
            ¡Último disponible!
          </p>
        )}
      </fieldset>

      <div className="flex gap-3">
        <div className="flex items-center rounded-full border border-line bg-surface-2">
          <button
            type="button"
            className="px-3 py-3 text-lg leading-none disabled:opacity-30"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            aria-label="Restar cantidad"
          >
            −
          </button>
          <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            className="px-3 py-3 text-lg leading-none disabled:opacity-30"
            onClick={() => setQuantity(quantity + 1)}
            disabled={limit !== null && quantity >= limit}
            aria-label="Sumar cantidad"
          >
            +
          </button>
        </div>
        <button
          ref={buttonRef}
          type="button"
          onClick={(e) => handleAdd(e.currentTarget)}
          disabled={soldOut}
          className={`flex-1 rounded-full px-6 py-3.5 text-sm font-bold uppercase tracking-widest transition ${
            soldOut
              ? "cursor-not-allowed bg-surface-2 text-muted"
              : ready
                ? "bg-accent text-black shadow-[0_0_30px_-5px_var(--accent)] hover:brightness-110"
                : "bg-accent/40 text-black"
          }`}
        >
          {soldOut ? "Sin stock" : "Agregar al carrito"}
        </button>
      </div>

      <QuantityPromoHint
        product={product}
        quantity={quantity}
        onSetQuantity={setQuantity}
      />

      {/* Barra fija de compra (solo celular) */}
      <div
        aria-hidden={!showStickyBar}
        inert={!showStickyBar}
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl transition-transform duration-300 lg:hidden ${
          showStickyBar ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-wide">{product.name}</p>
            <p className="text-xs text-muted">
              <span className="font-bold tabular-nums text-ink">{formatPrice(product.price)}</span>
              {ready ? ` · ${color} · Talle ${size}` : " · Elegí talle y color"}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => handleAdd(e.currentTarget)}
            className="shrink-0 rounded-full bg-accent px-5 py-3 text-xs font-bold uppercase tracking-widest text-black shadow-[0_0_24px_-6px_var(--accent)] transition hover:brightness-110"
          >
            {ready ? "Agregar" : "Elegir talle"}
          </button>
        </div>
      </div>
    </div>
  );
}
