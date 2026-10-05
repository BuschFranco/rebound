import { cache } from "react";
import type { Catalog, CategoryInfo, Product, ProductColor, Promotion, ShippingZone, SizeGuideKind } from "@/types";
import type { Database } from "./database.types";
import { NEW_PRODUCT_DAYS } from "@/data/business";
import { createCatalogClient } from "./supabase";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type PromotionRow = Database["public"]["Tables"]["promotions"]["Row"];
type ZoneRow = Database["public"]["Tables"]["shipping_zones"]["Row"] & {
  shipping_zone_areas: Pick<Database["public"]["Tables"]["shipping_zone_areas"]["Row"], "provincia_id" | "departamento_id">[];
};

function toCategory(row: CategoryRow): CategoryInfo {
  return {
    slug: row.slug,
    label: row.label,
    image: row.image_url,
    sizeGuide: (["apparel", "shoes"].includes(row.size_guide) ? row.size_guide : "none") as SizeGuideKind,
    complements: row.complements,
  };
}

function toColors(value: ProductRow["colors"]): ProductColor[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((c) =>
    c && typeof c === "object" && !Array.isArray(c) && typeof c.name === "string" && typeof c.hex === "string"
      ? [{ name: c.name, hex: c.hex }]
      : [],
  );
}

const NEW_PRODUCT_MS = NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;

function toProduct(row: ProductRow, now: number): Product {
  const publishedAt = Date.parse(row.published_at);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category_slug,
    price: row.price,
    ...(row.compare_at_price ? { compareAtPrice: row.compare_at_price } : {}),
    images: row.images,
    sizes: row.sizes,
    colors: toColors(row.colors),
    highlights: row.highlights,
    publishedAt,
    isNew: now - publishedAt < NEW_PRODUCT_MS,
  };
}

function toPromotion(row: PromotionRow): Promotion {
  return {
    id: row.id,
    label: row.label,
    buy: row.buy,
    pay: row.pay,
    startsAt: Date.parse(row.starts_at),
    endsAt: Date.parse(row.ends_at),
  };
}

function toZone(row: ZoneRow): ShippingZone {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    freeFrom: row.free_from,
    eta: row.eta_label,
    areas: row.shipping_zone_areas.map((a) => ({ provinciaId: a.provincia_id, departamentoId: a.departamento_id })),
  };
}

async function fetchCatalog({ fresh }: { fresh: boolean }): Promise<Catalog> {
  const supabase = createCatalogClient({ fresh });
  const [categories, products, zones, promotions] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("products").select("*").order("sort_order").order("created_at"),
    supabase
      .from("shipping_zones")
      .select("*, shipping_zone_areas(provincia_id, departamento_id)")
      .order("sort_order"),
    // Promo vigente o la próxima a empezar (las vencidas no se traen).
    supabase
      .from("promotions")
      .select("*")
      .gt("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(1),
  ]);
  if (categories.error) throw new Error(`No se pudieron leer las categorías: ${categories.error.message}`);
  if (products.error) throw new Error(`No se pudieron leer los productos: ${products.error.message}`);
  if (zones.error) throw new Error(`No se pudieron leer las zonas de envío: ${zones.error.message}`);
  if (promotions.error) throw new Error(`No se pudo leer la promoción: ${promotions.error.message}`);

  return {
    categories: categories.data.map(toCategory),
    products: products.data.map((row) => toProduct(row, Date.now())),
    shippingZones: (zones.data as ZoneRow[]).map(toZone),
    promotion: promotions.data[0] ? toPromotion(promotions.data[0]) : null,
  };
}

/**
 * Catálogo completo (categorías, productos activos y zonas de envío) desde Supabase.
 * `cache` evita consultas repetidas dentro de un mismo render; entre requests lo cachea Next.js.
 */
export const getCatalog = cache(() => fetchCatalog({ fresh: false }));

/** Catálogo leído en el momento, sin caché: para la verificación final del carrito antes de comprar. */
export function getFreshCatalog() {
  return fetchCatalog({ fresh: true });
}
