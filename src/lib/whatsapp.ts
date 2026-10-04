import { PROMO } from "@/data/business";
import type { CartItem } from "@/types";
import { formatPrice } from "./format";
import { computePromo } from "./promo";

export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

export function buildOrderMessage(items: CartItem[], siteUrl = SITE_URL) {
  const promo = computePromo(items);
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
    ...(promo.discount > 0
      ? [
          `Subtotal: ${formatPrice(promo.subtotal)}`,
          `Promo ${PROMO.label} (${promo.freeUnits} gratis): -${formatPrice(promo.discount)}`,
        ]
      : []),
    `*Total: ${formatPrice(promo.total)}* (sin envío)`,
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
