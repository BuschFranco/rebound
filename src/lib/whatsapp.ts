import { PROMO } from "@/data/business";
import type { CartLine } from "@/types";
import { formatPrice } from "./format";
import { computePromo } from "./promo";

export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

export function buildOrderMessage(cartLines: CartLine[], promoActive: boolean, siteUrl = SITE_URL) {
  const promo = computePromo(cartLines, promoActive);
  const lines = cartLines.map((line, i) => {
    const subtotal = formatPrice(line.product.price * line.quantity);
    return [
      `${i + 1}. *${line.product.name}*`,
      `   Talle: ${line.size} | Color: ${line.color} | Cantidad: ${line.quantity}`,
      `   Subtotal: ${subtotal}`,
      `   ${siteUrl}/producto/${line.product.slug}`,
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
