"use client";

import Image from "next/image";
import Link from "next/link";
import { useLenis } from "lenis/react";
import { useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { PROMO } from "@/data/business";
import { formatPrice } from "@/lib/format";
import { getCartSuggestions } from "@/lib/products";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { CartPromo } from "./CartPromo";
import { CashIcon, CloseIcon, TrashIcon, TruckIcon, WhatsAppIcon } from "./icons";

export function CartDrawer() {
  const { items, isOpen, close, total, count, promo, updateQty, removeItem, clear } = useCart();
  const suggestions = getCartSuggestions(items.map((i) => i.productId));
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

  function checkout() {
    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
    ).replace(/\/$/, "");
    window.open(buildWhatsAppUrl(buildOrderMessage(items, siteUrl)), "_blank", "noopener,noreferrer");
  }

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`} inert={!isOpen}>
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-3xl uppercase italic">
            Tu carrito <span className="text-accent">({count})</span>
          </h2>
          <button
            type="button"
            onClick={close}
            className="grid size-9 place-items-center rounded-full hover:bg-surface-2"
            aria-label="Cerrar carrito"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="font-display text-4xl uppercase italic">Sin jugadas</p>
            <p className="text-muted">Tu carrito está vacío.</p>
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
            <CartPromo promo={promo} />
            <div className="flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
              <ul className="divide-y divide-line px-5">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-4 py-4">
                    <Link
                      href={`/producto/${item.slug}`}
                      onClick={close}
                      className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2"
                    >
                      <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-semibold uppercase leading-snug tracking-wide">{item.name}</p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="text-muted hover:text-accent"
                          aria-label={`Quitar ${item.name}`}
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        Talle {item.size} · {item.color}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center rounded-full border border-line bg-surface-2 text-sm">
                          <button
                            type="button"
                            className="px-2.5 py-1"
                            onClick={() => updateQty(item.key, item.quantity - 1)}
                            aria-label="Restar"
                          >
                            −
                          </button>
                          <span className="w-6 text-center tabular-nums">{item.quantity}</span>
                          <button
                            type="button"
                            className="px-2.5 py-1"
                            onClick={() => updateQty(item.key, item.quantity + 1)}
                            aria-label="Sumar"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {suggestions.length > 0 && (
                <div className="border-t border-line px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest">Completá el look</p>
                  <ul className="mt-3 grid grid-cols-3 gap-2">
                    {suggestions.map((p) => (
                      <li key={p.id}>
                        <Link href={`/producto/${p.slug}`} onClick={close} className="group block">
                          <span className="relative block aspect-square overflow-hidden rounded-lg bg-surface-2 ring-1 ring-line transition group-hover:ring-accent">
                            <Image src={p.images[0]} alt="" fill sizes="120px" className="object-cover transition duration-500 group-hover:scale-105" />
                          </span>
                          <span className="mt-1.5 line-clamp-2 block text-[11px] font-semibold uppercase leading-tight">
                            {p.name}
                          </span>
                          <span className="text-xs font-bold tabular-nums text-accent">{formatPrice(p.price)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-line px-5 py-5">
              {promo.discount > 0 && (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-muted">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatPrice(promo.subtotal)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-accent">
                    <span>
                      Promo {PROMO.label} ({promo.freeUnits} gratis)
                    </span>
                    <span className="tabular-nums">−{formatPrice(promo.discount)}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-muted">Total</span>
                <span className="font-display text-3xl tabular-nums">{formatPrice(total)}</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted">
                <li className="flex items-center gap-2">
                  <TruckIcon className="size-4 text-accent" /> Envíos en CABA y Provincia de Bs. As. El costo se informa antes de confirmar.
                </li>
                <li className="flex items-center gap-2">
                  <CashIcon className="size-4 text-accent-2" /> Pagás recién cuando lo recibís. Cambio gratis 30 días.
                </li>
              </ul>
              <button
                type="button"
                onClick={checkout}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-whatsapp py-4 text-sm font-bold uppercase tracking-widest text-black shadow-[0_0_30px_-8px_var(--whatsapp)] transition hover:brightness-110"
              >
                <WhatsAppIcon className="size-5" />
                Comprar por WhatsApp
              </button>
              <p className="text-center text-[11px] leading-relaxed text-muted">
                Al enviar el pedido aceptás los{" "}
                <Link href="/terminos" onClick={close} className="underline hover:text-ink">
                  Términos y condiciones
                </Link>{" "}
                y la{" "}
                <Link href="/privacidad" onClick={close} className="underline hover:text-ink">
                  Política de privacidad
                </Link>
                .
              </p>
              <button
                type="button"
                onClick={clear}
                className="w-full text-center text-xs text-muted underline hover:text-ink"
              >
                Vaciar carrito
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
