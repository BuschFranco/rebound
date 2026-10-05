import { CATEGORIES, PRODUCTS } from "@/data/products";
import type { Category, Product } from "@/types";
import { discountPercent } from "./format";

export type SortOption = "relevancia" | "menor-precio" | "mayor-precio";

const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function getProducts() {
  return PRODUCTS;
}

export function getProductById(id: string) {
  return PRODUCTS.find((p) => p.id === id);
}

export function getProductBySlug(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getOnSale() {
  return PRODUCTS.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);
}

export function getNewArrivals() {
  return PRODUCTS.filter((p) => p.isNew);
}

export function getRelated(product: Product, limit = 4) {
  return PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id,
  ).slice(0, limit);
}

export function isCategory(value: string | undefined): value is Category {
  return CATEGORIES.some((c) => c.slug === value);
}

export function getCategoryLabel(slug: Category) {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function filterProducts({
  query,
  category,
  sort = "relevancia",
  products = PRODUCTS,
}: {
  query?: string;
  category?: Category;
  sort?: SortOption;
  products?: Product[];
}) {
  let result = products;

  if (category) result = result.filter((p) => p.category === category);

  if (query) {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    result = result.filter((p) => {
      const haystack = normalize(
        `${p.name} ${p.description} ${getCategoryLabel(p.category)} ${p.colors
          .map((c) => c.name)
          .join(" ")}`,
      );
      return terms.every((t) => haystack.includes(t));
    });
  }

  if (sort === "menor-precio") result = [...result].sort((a, b) => a.price - b.price);
  if (sort === "mayor-precio") result = [...result].sort((a, b) => b.price - a.price);

  return result;
}

export function getMaxDiscount() {
  return Math.max(0, ...getOnSale().map((p) => discountPercent(p.price, p.compareAtPrice)));
}

/** Qué categoría suele sumarse a cada una (para sugerir en el carrito). */
const COMPLEMENTS: Record<Category, Category[]> = {
  camisetas: ["shorts", "zapatillas", "accesorios"],
  shorts: ["camisetas", "accesorios", "zapatillas"],
  zapatillas: ["accesorios", "shorts", "camisetas"],
  buzos: ["shorts", "camperas", "accesorios"],
  camperas: ["buzos", "camisetas", "accesorios"],
  accesorios: ["camisetas", "shorts", "zapatillas"],
};

/** Sugerencias para "Completá el look": productos de categorías complementarias que no están en el carrito. */
export function getCartSuggestions(productIds: string[], limit = 3) {
  const inCart = new Set(productIds);
  const cartProducts = PRODUCTS.filter((p) => inCart.has(p.id));
  const cartCategories = new Set(cartProducts.map((p) => p.category));
  const complements = [...new Set(cartProducts.flatMap((p) => COMPLEMENTS[p.category]))];
  // Primero lo que todavía no tiene; después el resto de las complementarias.
  const wanted = [
    ...complements.filter((c) => !cartCategories.has(c)),
    ...complements.filter((c) => cartCategories.has(c)),
  ];
  const ranked = [
    ...wanted.flatMap((c) => PRODUCTS.filter((p) => p.category === c)),
    ...PRODUCTS.filter((p) => p.isNew),
    ...PRODUCTS,
  ];
  const seen = new Set<string>();
  const result: Product[] = [];
  for (const p of ranked) {
    if (inCart.has(p.id) || seen.has(p.id)) continue;
    // Una sugerencia por categoría para que se vea variado.
    if (result.some((r) => r.category === p.category) && result.length < wanted.length) continue;
    seen.add(p.id);
    result.push(p);
    if (result.length === limit) break;
  }
  return result;
}
