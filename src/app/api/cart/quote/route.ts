import { getFreshCatalog } from "@/lib/catalog";
import { sanitizeCartItems } from "@/lib/cartStore";
import { validateCart } from "@/lib/cartValidation";
import { buildOrder } from "@/lib/order";
import { isPromoRunning } from "@/lib/promo";
import type { ShippingLocation } from "@/types";

/**
 * POST /api/cart/quote/ → verificación final antes de abrir WhatsApp.
 * Lee productos y zonas de Supabase en el momento (sin caché), descarta lo que ya no existe,
 * toma los precios vigentes y calcula promo + envío. Body: { items, location }.
 * La vigencia de la promo la decide el servidor con la hora actual (no se confía en el cliente).
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
    promotion: isPromoRunning(catalog.promotion) ? catalog.promotion : null,
    zones: catalog.shippingZones,
    location: parseLocation(location),
  });

  return Response.json({ order, notices }, { headers: { "Cache-Control": "no-store" } });
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
