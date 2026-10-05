import type { Category, CategoryInfo, Product } from "@/types";
import { discountPercent } from "./format";

/**
 * Funciones puras sobre el catálogo. No tienen datos propios: reciben la lista de productos
 * y categorías que viene de Supabase (en el servidor con getCatalog(), en el cliente con useCatalog()).
 */

/**
 * Cuántos productos muestra como máximo cada fila deslizable (carrusel) antes de "Ver más".
 * Vive acá y no en ProductCarousel porque las páginas del servidor no pueden importar valores de un componente cliente.
 */
export const CAROUSEL_MAX = 7;

export type SortOption = "relevancia" | "nuevos" | "menor-precio" | "mayor-precio";

const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function getProductById(products: Product[], id: string) {
  return products.find((p) => p.id === id);
}

export function getProductBySlug(products: Product[], slug: string) {
  return products.find((p) => p.slug === slug);
}

export function getOnSale(products: Product[]) {
  return products.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);
}

/** Productos ordenados por fecha de publicación, el más reciente primero. */
export function sortByNewest(products: Product[]) {
  return [...products].sort((a, b) => b.publishedAt - a.publishedAt);
}

/** "Drop nuevo": los últimos publicados (tengan o no la etiqueta "Nuevo", que dura NEW_PRODUCT_DAYS). */
export function getLatestProducts(products: Product[], limit = 4) {
  return sortByNewest(products).slice(0, limit);
}

export function getRelated(products: Product[], product: Product, limit = 4) {
  return products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, limit);
}

export function isCategory(categories: CategoryInfo[], value: string | undefined): value is Category {
  return categories.some((c) => c.slug === value);
}

export function getCategoryLabel(categories: CategoryInfo[], slug: Category) {
  return categories.find((c) => c.slug === slug)?.label ?? slug;
}

export function countByCategory(products: Product[]) {
  const counts: Record<string, number> = {};
  for (const p of products) counts[p.category] = (counts[p.category] ?? 0) + 1;
  return counts;
}

export function filterProducts({
  products,
  categories,
  query,
  category,
  sort = "relevancia",
}: {
  products: Product[];
  categories: CategoryInfo[];
  query?: string;
  category?: Category;
  sort?: SortOption;
}) {
  let result = products;

  if (category) result = result.filter((p) => p.category === category);

  if (query) {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    result = result.filter((p) => {
      const haystack = normalize(
        `${p.name} ${p.description} ${getCategoryLabel(categories, p.category)} ${p.colors
          .map((c) => c.name)
          .join(" ")}`,
      );
      return terms.every((t) => haystack.includes(t));
    });
  }

  if (sort === "nuevos") result = sortByNewest(result);
  if (sort === "menor-precio") result = [...result].sort((a, b) => a.price - b.price);
  if (sort === "mayor-precio") result = [...result].sort((a, b) => b.price - a.price);

  return result;
}

/**
 * Resultados del buscador en vivo: mismo criterio que el catálogo, ordenados por qué tan bien coincide
 * el nombre, así con "pe" aparece "Pelota" antes que "Campera" o una coincidencia en la descripción:
 * 0 = el nombre empieza con lo escrito · 1 = cada término empieza una palabra del nombre o la categoría ·
 * 2 = el nombre contiene los términos · 3 = coincide solo en la descripción o el color.
 */
export function searchProducts(products: Product[], categories: CategoryInfo[], query: string) {
  const q = normalize(query);
  const terms = q.split(/\s+/).filter(Boolean);
  const rank = (p: Product) => {
    const name = normalize(p.name);
    if (name.startsWith(q)) return 0;
    const words = normalize(`${p.name} ${getCategoryLabel(categories, p.category)}`).split(/\s+/);
    if (terms.every((t) => words.some((w) => w.startsWith(t)))) return 1;
    if (terms.every((t) => name.includes(t))) return 2;
    return 3;
  };
  return filterProducts({ products, categories, query })
    .map((p, i) => ({ p, i, rank: rank(p) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.p);
}

export function getMaxDiscount(products: Product[]) {
  return Math.max(0, ...getOnSale(products).map((p) => discountPercent(p.price, p.compareAtPrice)));
}

/**
 * Sugerencias para "Completá el look": productos de las categorías complementarias
 * (columna `complements` de cada categoría en la base) que no están en el carrito.
 * Si una categoría no tiene complementarias cargadas, se sugieren novedades y el resto del catálogo.
 */
export function getCartSuggestions(
  products: Product[],
  categories: CategoryInfo[],
  productIds: string[],
  limit = 3,
) {
  const complementsOf = new Map(categories.map((c) => [c.slug, c.complements]));
  const inCart = new Set(productIds);
  const cartProducts = products.filter((p) => inCart.has(p.id));
  const cartCategories = new Set(cartProducts.map((p) => p.category));
  const complements = [...new Set(cartProducts.flatMap((p) => complementsOf.get(p.category) ?? []))];
  // Primero lo que todavía no tiene; después el resto de las complementarias.
  const wanted = [
    ...complements.filter((c) => !cartCategories.has(c)),
    ...complements.filter((c) => cartCategories.has(c)),
  ];
  const ranked = [
    ...wanted.flatMap((c) => products.filter((p) => p.category === c)),
    ...products.filter((p) => p.isNew),
    ...products,
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

/**
 * "Basado en lo que viste": productos no vistos de las mismas categorías que lo visitado
 * (y, con menos peso, de sus categorías complementarias). Lo visto más recientemente pesa más.
 */
export function getRecommendations(products: Product[], categories: CategoryInfo[], viewedIds: string[], limit = 4) {
  const viewed = new Set(viewedIds);
  const byId = new Map(products.map((p) => [p.id, p]));
  const complementsOf = new Map(categories.map((c) => [c.slug, c.complements]));
  const score = new Map<string, number>();

  viewedIds.forEach((id, i) => {
    const seen = byId.get(id);
    if (!seen) return;
    const weight = 1 / (i + 1);
    const complements = new Set(complementsOf.get(seen.category) ?? []);
    for (const p of products) {
      if (viewed.has(p.id)) continue;
      const points = p.category === seen.category ? 3 : complements.has(p.category) ? 1 : 0;
      if (points) score.set(p.id, (score.get(p.id) ?? 0) + points * weight);
    }
  });

  const ranked = products
    .map((p, order) => ({ p, order, s: (score.get(p.id) ?? 0) + (p.isNew ? 0.05 : 0) }))
    .filter((x) => score.has(x.p.id))
    .sort((a, b) => b.s - a.s || a.order - b.order)
    .map((x) => x.p);

  // Variedad: como mucho la mitad de la sección de una misma categoría (si alcanzan los candidatos).
  const maxPerCategory = Math.max(1, Math.ceil(limit / 2));
  const perCategory = new Map<string, number>();
  const picked: Product[] = [];
  for (const p of ranked) {
    if ((perCategory.get(p.category) ?? 0) >= maxPerCategory) continue;
    perCategory.set(p.category, (perCategory.get(p.category) ?? 0) + 1);
    picked.push(p);
    if (picked.length === limit) return picked;
  }
  return [...picked, ...ranked.filter((p) => !picked.includes(p))].slice(0, limit);
}

/**
 * Categorías ordenadas por interés del cliente: primero las que tienen más productos vistos
 * (historial local). Ante empate, o sin historial, se respeta el orden de la base (`sort_order`).
 */
export function sortCategoriesByViews(categories: CategoryInfo[], products: Product[], viewedIds: string[]) {
  const views = new Map<string, number>();
  for (const id of viewedIds) {
    const p = getProductById(products, id);
    if (p) views.set(p.category, (views.get(p.category) ?? 0) + 1);
  }
  if (views.size === 0) return categories;
  return categories
    .map((c, order) => ({ c, order, n: views.get(c.slug) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.order - b.order)
    .map((x) => x.c);
}
