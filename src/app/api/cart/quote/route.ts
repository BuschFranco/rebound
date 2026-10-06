import { after } from "next/server";
import { getFreshCatalog } from "@/lib/catalog";
import { sanitizeCartItems } from "@/lib/cartStore";
import { validateCart } from "@/lib/cartValidation";
import { buildOrder } from "@/lib/order";
import { runningPromos } from "@/lib/promo";
import { createCatalogClient } from "@/lib/supabase";
import type { ShippingLocation } from "@/types";

/**
 * POST /api/cart/quote/ → verificación final antes de abrir WhatsApp.
 * Lee productos y zonas de Supabase en el momento (sin caché), descarta lo que ya no existe,
 * toma los precios vigentes y calcula promo + envío. Body: { items, location }.
 * La vigencia de la promo la decide el servidor con la hora actual (no se confía en el cliente).
 * Además registra el pedido de forma anónima (sin datos personales) para las estadísticas del panel.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const { items, location } = (body ?? {}) as { items?: unknown; location?: unknown };

  const catalog = await getFreshCatalog();
  const { lines, notices } = validateCart(sanitizeCartItems(items).slice(0, 50), catalog.products);
  const order = buildOrder({
    lines,
    promotions: runningPromos(catalog.promotions),
    zones: catalog.shippingZones,
    location: parseLocation(location),
  });

  // Después de responder, para no demorar la apertura de WhatsApp. Si falla, el pedido sigue igual.
  if (order.lines.length > 0) after(() => logOrderIntent(order));

  return Response.json({ order, notices }, { headers: { "Cache-Control": "no-store" } });
}

/** Guarda el pedido verificado sin datos personales: productos, montos, zona y partido. */
async function logOrderIntent(order: ReturnType<typeof buildOrder>) {
  const items = order.lines.map((l) => ({
    product_id: l.key.split("__")[0],
    name: l.name,
    size: l.size,
    color: l.color,
    quantity: l.quantity,
    price: l.price,
  }));
  const shipping = order.shipping;
  const { error } = await createCatalogClient({ fresh: true }).rpc("log_order_intent", {
    p_items: items,
    p_total: order.total,
    p_promo_label: [order.discountLabel, order.freeShippingLabel].filter(Boolean).join(" + ") || undefined,
    p_zone_name: shipping.status === "ok" ? shipping.zoneName : undefined,
    p_partido: shipping.status === "unset" ? undefined : shipping.location.partido || shipping.location.provincia,
  });
  if (error) console.error("No se pudo registrar el pedido:", error.message);
}

function parseLocation(value: unknown): ShippingLocation | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const str = (x: unknown, max = 120) => (typeof x === "string" ? x.slice(0, max) : "");
  if (!/^[0-9]{2}$/.test(str(v.provinciaId))) return null;
  const departamentoId = str(v.departamentoId);
  return {
    id: str(v.id, 40),
    nombre: str(v.nombre),
    partido: str(v.partido),
    provincia: str(v.provincia),
    provinciaId: str(v.provinciaId),
    departamentoId: /^[0-9]{5}$/.test(departamentoId) ? departamentoId : null,
  };
}
