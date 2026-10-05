import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/supabase";

/**
 * POST /api/revalidate/ → marca el catálogo como desactualizado para que la próxima visita
 * lo vuelva a leer de Supabase (sin esperar el minuto de caché).
 * Pensado para un Database Webhook de Supabase sobre las tablas `products` y `categories`,
 * enviando el header `x-revalidate-secret` con el valor de REVALIDATE_SECRET.
 */
export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET;
  const received = request.headers.get("x-revalidate-secret") ?? "";

  if (!expected || !safeEqual(received, expected)) {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  // { expire: 0 }: la próxima visita ya trae el catálogo nuevo (con "max" serviría una vez el viejo).
  // Es lo que recomienda Next cuando el aviso llega de afuera (panel de administración o webhook).
  revalidateTag(CATALOG_TAG, { expire: 0 });
  return Response.json({ ok: true, revalidated: CATALOG_TAG });
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
