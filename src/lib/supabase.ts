import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** Etiqueta de caché del catálogo: `revalidateTag(CATALOG_TAG, "max")` lo refresca a demanda. */
export const CATALOG_TAG = "catalog";

/** Cada cuántos segundos se vuelve a consultar el catálogo como máximo, aunque nadie lo invalide. */
export const CATALOG_REVALIDATE_SECONDS = 60;

/**
 * Cliente de Supabase para el servidor con la clave pública (publishable): solo puede leer lo que
 * permiten las políticas RLS (productos activos y categorías). No se usa en el navegador.
 * Las respuestas se cachean en Next.js y se revalidan cada minuto o al llamar a /api/revalidate.
 * Con `fresh: true` se consulta en el momento, sin caché (verificación final del carrito).
 */
export function createCatalogClient({ fresh = false }: { fresh?: boolean } = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan SUPABASE_URL y/o SUPABASE_PUBLISHABLE_KEY. Copiá .env.local.example a .env.local (ver README).",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fresh
          ? fetch(input, { ...init, cache: "no-store" })
          : fetch(input, {
              ...init,
              next: { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] },
            }),
    },
  });
}
