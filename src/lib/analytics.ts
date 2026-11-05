import type { Order } from "./order";
import type { Product } from "@/types";

/**
 * Eventos de conversión para el pixel de OpenAI (oaiq) y para Google Tag Manager (dataLayer, formato GA4).
 * Si el pixel no cargó (dev server, bloqueador de anuncios) no pasa nada: nunca rompe la compra.
 */

const CURRENCY = "ARS";

type OaiqContent = { id: string; name: string; content_type: string; quantity: number; amount: number; currency: string };

declare global {
  interface Window {
    oaiq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function newEventId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function oaiq(event: string, data: Record<string, unknown>, options?: Record<string, unknown>) {
  try {
    if (typeof window.oaiq === "function") window.oaiq("measure", event, data, { event_id: newEventId(), ...options });
  } catch {
    // La medición nunca debe interrumpir al cliente.
  }
}

function gtm(event: string, ecommerce: Record<string, unknown>) {
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({ event, ecommerce });
  } catch {
    // Ídem.
  }
}

const content = (id: string, name: string, quantity: number, unitPrice: number): OaiqContent => ({
  id,
  name,
  content_type: "product",
  quantity,
  amount: unitPrice,
  currency: CURRENCY,
});

/** 1) Producto agregado al carrito (desde la ficha o desde favoritos). */
export function trackAddToCart(product: Product, size: string, color: string, quantity: number) {
  const amount = product.price * quantity;
  oaiq("items_added", { type: "contents", amount, currency: CURRENCY, contents: [content(product.id, product.name, quantity, product.price)] });
  gtm("add_to_cart", {
    currency: CURRENCY,
    value: amount,
    items: [{ item_id: product.id, item_name: product.name, item_category: product.category, item_variant: `${color} / ${size}`, price: product.price, quantity }],
  });
}

/** 2) Botón "Comprar por WhatsApp" del carrito (con el total ya calculado: promos y envío). */
export function trackWhatsAppCheckout(order: Order) {
  const contents = order.lines.map((l) => content(l.key.split("__")[0], l.name, l.quantity, l.price));
  oaiq("checkout_started", { type: "contents", amount: order.total, currency: CURRENCY, contents });
  gtm("begin_checkout", {
    currency: CURRENCY,
    value: order.total,
    items: order.lines.map((l) => ({ item_id: l.key.split("__")[0], item_name: l.name, item_variant: `${l.color} / ${l.size}`, price: l.price, quantity: l.quantity })),
  });
}

/** 3) Producto agregado a favoritos (evento personalizado: el pixel no tiene uno estándar). */
export function trackAddToFavorites(product: Product) {
  oaiq(
    "custom",
    { type: "custom", amount: product.price, currency: CURRENCY, contents: [content(product.id, product.name, 1, product.price)] },
    { custom_event_name: "add_to_wishlist" },
  );
  gtm("add_to_wishlist", {
    currency: CURRENCY,
    value: product.price,
    items: [{ item_id: product.id, item_name: product.name, item_category: product.category, price: product.price, quantity: 1 }],
  });
}
