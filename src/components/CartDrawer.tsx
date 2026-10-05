"use client";

import Image from "next/image";
import Link from "next/link";
import { useLenis } from "lenis/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useCart } from "@/context/CartContext";
import { usePromo } from "@/context/PromoContext";
import { formatPrice } from "@/lib/format";
import { useCatalog } from "@/context/CatalogContext";
import type { CartNotice } from "@/lib/cartValidation";
import type { SavedAddress } from "@/types";
import { addressStore } from "@/lib/addressStore";
import { buildOrder, type Order } from "@/lib/order";
import { getCartSuggestions } from "@/lib/products";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { CartNotices } from "./CartNotices";
import { CartPromo } from "./CartPromo";
import { CartAddress } from "./CartAddress";
import { CashIcon, CloseIcon, TrashIcon, TruckIcon, WhatsAppIcon } from "./icons";

export function CartDrawer() {
  const { lines, notices, isOpen, close, count, promo, updateQty, removeItem, clear } = useCart();
  const { promo: promotion } = usePromo();
  const { products, categories, shippingZones } = useCatalog();
  const savedAddress = useSyncExternalStore(addressStore.subscribe, addressStore.getSnapshot, addressStore.getServerSnapshot);
  // Dirección que se está editando (null = no se edita). El envío se recalcula en vivo con el borrador.
  const [addressDraft, setAddressDraft] = useState<SavedAddress | null>(null);
  const address = addressDraft ?? savedAddress;
  const location = address.location;
  const suggestions = getCartSuggestions(products, categories, lines.map((l) => l.productId));
  const lenis = useLenis();
  const router = useRouter();
  const order = buildOrder({ lines, promotion, zones: shippingZones, location });
  // Pedido verificado contra la base que difiere de lo mostrado: se muestra y se pide confirmación.
  const [pending, setPending] = useState<{ order: Order; notices: CartNotice[] } | null>(null);
  const [checking, setChecking] = useState(false);

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

  function siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
  }

  /** Abre WhatsApp en una ventana ya abierta durante el clic (los navegadores bloquean abrirla después de esperar). */
  function sendTo(win: Window | null, finalOrder: Order) {
    const url = buildWhatsAppUrl(buildOrderMessage(finalOrder, address, siteUrl()));
    if (win) win.location.assign(url);
    else window.location.assign(url);
  }

  async function checkout() {
    if (pending) {
      const win = window.open("", "_blank");
      if (win) win.opener = null;
      sendTo(win, pending.order);
      setPending(null);
      return;
    }

    const win = window.open("", "_blank");
    if (win) win.opener = null;
    setChecking(true);
    try {
      // Verificación final: productos, precios y envío leídos de la base en este momento.
      const res = await fetch("/api/cart/quote/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // El precio "visto" es el que el cliente tiene en pantalla: así el servidor avisa qué cambió.
          items: lines.map(({ key, productId, size, color, quantity, product }) => ({
            key,
            productId,
            size,
            color,
            quantity,
            name: product.name,
            seenPrice: product.price,
          })),
          location,
        }),
      });
      if (!res.ok) throw new Error("quote");
      const quote = (await res.json()) as { order: Order; notices: CartNotice[] };
      const changed = quote.notices.length > 0 || quote.order.total !== order.total;
      if (changed) {
        win?.close();
        setPending(quote);
        router.refresh();
        return;
      }
      sendTo(win, quote.order);
    } catch {
      // Si la verificación falla (sin conexión con el servidor), no bloqueamos la compra:
      // se envía lo que se ve en pantalla y el precio final se confirma por WhatsApp.
      sendTo(win, order);
    } finally {
      setChecking(false);
    }
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
        data-lenis-prevent
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto overscroll-contain border-l border-line bg-surface shadow-2xl transition-transform duration-300 ${
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

        <CartNotices notices={notices} />

        {lines.length === 0 ? (
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
            <div className="min-h-56 flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
              <ul className="divide-y divide-line px-5">
                {lines.map((item) => (
                  <li key={item.key} className="flex gap-4 py-4">
                    <Link
                      href={`/producto/${item.product.slug}`}
                      onClick={close}
                      className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2"
                    >
                      <Image src={item.product.images[0]} alt={item.product.name} fill sizes="80px" className="object-cover" />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-semibold uppercase leading-snug tracking-wide">{item.product.name}</p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="text-muted hover:text-accent"
                          aria-label={`Quitar ${item.product.name}`}
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
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <CartAddress
                saved={savedAddress}
                draft={addressDraft}
                onDraftChange={setAddressDraft}
                onSave={(next) => {
                  addressStore.save(next);
                  setAddressDraft(null);
                }}
                onClear={() => {
                  addressStore.clear();
                  setAddressDraft(null);
                }}
                shipping={order.shipping}
              />

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
              <div className="space-y-1 text-sm">
                {promo.discount > 0 && (
                  <>
                    <div className="flex justify-between text-muted">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{formatPrice(promo.subtotal)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-accent">
                      <span>
                        Promo {order.promoLabel} ({promo.freeUnits} gratis)
                      </span>
                      <span className="tabular-nums">−{formatPrice(promo.discount)}</span>
                    </div>
                  </>
                )}
                {order.shipping.status === "ok" && (
                  <div className="flex justify-between text-muted">
                    <span>Envío</span>
                    <span className={`tabular-nums ${order.shipping.isFree ? "font-semibold text-whatsapp" : ""}`}>
                      {order.shipping.isFree ? "Gratis" : formatPrice(order.shipping.cost)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-muted">
                  Total{order.shipping.status === "ok" ? "" : " (sin envío)"}
                </span>
                <span className="font-display text-3xl tabular-nums">{formatPrice(order.total)}</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted">
                {order.shipping.status === "unset" && (
                  <li className="flex items-center gap-2">
                    <TruckIcon className="size-4 text-accent" /> Elegí tu localidad arriba para ver el costo de envío.
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <CashIcon className="size-4 text-accent-2" /> Pagás recién cuando lo recibís. Cambio gratis 30 días.
                </li>
              </ul>
              {pending && (
                <div className="rounded-xl border border-accent/40 bg-accent/10">
                  <CartNotices
                    notices={pending.notices}
                    title={`Los precios cambiaron recién. Total actualizado: ${formatPrice(pending.order.total)}`}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={checkout}
                disabled={checking}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-whatsapp py-4 text-sm font-bold uppercase tracking-widest text-black shadow-[0_0_30px_-8px_var(--whatsapp)] transition hover:brightness-110 disabled:opacity-70"
              >
                <WhatsAppIcon className="size-5" />
                {checking ? "Verificando precios…" : pending ? "Confirmar y enviar" : "Comprar por WhatsApp"}
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
