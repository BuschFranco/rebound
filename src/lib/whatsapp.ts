import type { CartItem } from "@/types";
import { formatPrice } from "./format";

export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function buildOrderMessage(items: CartItem[], siteUrl = SITE_URL) {
  const lines = items.map((item, i) => {
    const subtotal = formatPrice(item.price * item.quantity);
    return [
      `${i + 1}. *${item.name}*`,
      `   Talle: ${item.size} | Color: ${item.color} | Cantidad: ${item.quantity}`,
      `   Subtotal: ${subtotal}`,
      `   ${siteUrl}/producto/${item.slug}`,
    ].join("\n");
  });

  return [
    "¡Hola! 👋 Quiero comprar estos productos:",
    "",
    lines.join("\n\n"),
    "",
    `*Total: ${formatPrice(cartTotal(items))}*` + " (sin envío)",
    "",
    "Nombre: ",
    "Localidad de entrega (CABA o Provincia de Bs. As.): ",
    "",
    "Quisiera coordinar el envío. Pago al recibir. ¡Gracias!",
  ].join("\n");
}

export function buildWhatsAppUrl(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
