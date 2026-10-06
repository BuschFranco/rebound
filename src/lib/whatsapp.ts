import { formatPrice } from "./format";
import type { SavedAddress } from "@/types";
import type { Order } from "./order";
import { formatLocation, formatStreetAddress } from "./shipping";

export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

/**
 * Mensaje del pedido a partir del pedido ya verificado contra la base (precios y envío vigentes)
 * y la dirección que el cliente cargó en el carrito (opcional: si falta, queda para completar en el chat).
 */
export function buildOrderMessage(order: Order, address: SavedAddress | null, siteUrl = SITE_URL) {
  const items = order.lines.map((line, i) =>
    [
      `${i + 1}. *${line.name}*`,
      `   Talle: ${line.size} | Color: ${line.color} | Cantidad: ${line.quantity}`,
      `   Subtotal: ${formatPrice(line.price * line.quantity)}`,
      `   ${siteUrl}/producto/${line.slug}`,
    ].join("\n"),
  );

  const { promo, shipping } = order;
  const shippingLines =
    shipping.status === "ok"
      ? [
          `Envío a ${formatLocation(shipping.location)}: ${shipping.isFree ? `GRATIS${order.freeShippingLabel ? ` (promo ${order.freeShippingLabel})` : ""}` : formatPrice(shipping.cost)} (${shipping.eta})`,
          `*Total: ${formatPrice(order.total)}*`,
        ]
      : shipping.status === "out-of-zone"
        ? [
            `*Total productos: ${formatPrice(order.total)}*`,
            `Localidad: ${formatLocation(shipping.location)} (fuera de las zonas de envío; ¿pueden enviar igual?)`,
          ]
        : [`*Total: ${formatPrice(order.total)}* (sin envío)`];

  const street = address ? formatStreetAddress(address) : "";
  // La localidad ya aparece en la línea de envío; solo se pide si todavía no se eligió.
  const deliveryLines = [
    street ? `📍 *Entrega:* ${street}` : "Dirección: ",
    shipping.status === "unset" ? "Localidad (CABA o Provincia de Bs. As.): " : "",
    address?.notes ? `Referencias: ${address.notes}` : "",
    `${address?.recipient ? "Recibe" : "Nombre"}: ${address?.recipient ?? ""}`,
  ].filter((l) => l !== "");

  return [
    "¡Hola! 👋 Quiero comprar estos productos:",
    "",
    items.join("\n\n"),
    "",
    ...(promo.discount > 0
      ? [
          `Subtotal: ${formatPrice(promo.subtotal)}`,
          `Promo ${order.discountLabel ?? ""} (${promo.discountedUnits} ${promo.discountedUnits === 1 ? "unidad" : "unidades"} con descuento): -${formatPrice(promo.discount)}`,
        ]
      : []),
    ...shippingLines,
    "",
    ...deliveryLines,
    "",
    "Pago al recibir. ¡Gracias!",
  ].join("\n");
}

export function buildWhatsAppUrl(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
