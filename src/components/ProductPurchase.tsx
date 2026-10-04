"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types";

export function ProductPurchase({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [size, setSize] = useState(product.sizes.length === 1 ? product.sizes[0] : "");
  const [color, setColor] = useState(product.colors.length === 1 ? product.colors[0].name : "");
  const [quantity, setQuantity] = useState(1);
  const [showErrors, setShowErrors] = useState(false);

  const ready = Boolean(size && color);

  function handleAdd() {
    if (!ready) {
      setShowErrors(true);
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
        {showErrors && !color && <p className="mt-2 text-sm font-medium text-accent">Seleccioná un color.</p>}
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-xs font-bold uppercase tracking-widest">
          Talle: <span className="font-normal normal-case tracking-normal text-muted">{size || "Elegí un talle"}</span>
        </legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {product.sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              aria-pressed={size === s}
              className={`rounded-lg border px-2 py-2.5 text-sm font-semibold tabular-nums transition ${
                size === s
                  ? "border-accent bg-accent text-black"
                  : "border-line bg-surface-2 hover:border-white/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {showErrors && !size && <p className="mt-2 text-sm font-medium text-accent">Seleccioná un talle.</p>}
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
          className={`flex-1 rounded-full px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-black transition ${
            ready ? "bg-accent shadow-[0_0_30px_-5px_var(--accent)] hover:brightness-110" : "bg-accent/40"
          }`}
        >
          Agregar al carrito
        </button>
      </div>
    </div>
  );
}
