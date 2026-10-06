"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useCatalog } from "@/context/CatalogContext";
import { availableSizes } from "@/lib/products";
import type { Product } from "@/types";
import { QuantityPromoHint } from "./QuantityPromoHint";
import { SizeGuide } from "./SizeGuide";

export function ProductPurchase({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { categories } = useCatalog();
  const sizeGuide = categories.find((c) => c.slug === product.category)?.sizeGuide ?? "none";
  const inStock = availableSizes(product);
  const soldOut = inStock.length === 0;
  const [size, setSize] = useState(inStock.length === 1 && product.sizes.length === 1 ? inStock[0] : "");
  // La guía de talles puede recomendar uno agotado: en ese caso no se elige.
  const pickSize = (s: string) => {
    if (inStock.includes(s)) setSize(s);
  };
  const [color, setColor] = useState(product.colors.length === 1 ? product.colors[0].name : "");
  const [quantity, setQuantity] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  // Cambia en cada intento fallido para volver a disparar el temblor del aviso.
  const [errorAttempt, setErrorAttempt] = useState(0);

  const ready = Boolean(size && color);

  function handleAdd() {
    if (soldOut) return;
    if (!ready) {
      setShowErrors(true);
      setErrorAttempt((n) => n + 1);
      return;
    }
    addItem(product, size, color, quantity);
    setQuantity(1);
  }

  return (
    <div className="space-y-6">
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
              aria-pressed={color === c.name}
              aria-label={c.name}
              title={c.name}
              className={`size-9 rounded-full border-2 p-0.5 transition ${
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
            const out = product.soldOutSizes.includes(s);
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
              </button>
            );
          })}
        </div>
        {showErrors && !size && (
          <p key={errorAttempt} role="alert" className="mt-2 animate-shake text-sm font-semibold text-danger">
            ⚠ Seleccioná un talle.
          </p>
        )}
      </fieldset>

      <div className="flex gap-3">
        <div className="flex items-center rounded-full border border-line bg-surface-2">
          <button
            type="button"
            className="px-3 py-3 text-lg leading-none disabled:opacity-30"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
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
            className="px-3 py-3 text-lg leading-none"
            onClick={() => setQuantity((q) => q + 1)}
            aria-label="Sumar cantidad"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={handleAdd}
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
    </div>
  );
}
