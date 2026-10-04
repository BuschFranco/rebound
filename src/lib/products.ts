import { CATEGORIES, PRODUCTS } from "@/data/products";
import type { Category, Product } from "@/types";
import { discountPercent } from "./format";

export type SortOption = "relevancia" | "menor-precio" | "mayor-precio";

const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function getProducts() {
  return PRODUCTS;
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
