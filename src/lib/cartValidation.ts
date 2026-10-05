import type { CartItem, CartLine, Product } from "@/types";
import { getProductById } from "./products";

export type RemovedReason = "unavailable" | "size" | "color";

export type CartNotice =
  | { type: "removed"; key: string; name: string | null; reason: RemovedReason }
  | { type: "price"; key: string; name: string; from: number; to: number };

/**
 * Cruza lo guardado en el navegador con el catálogo vigente de la base:
 * - descarta lo que ya no existe (producto eliminado u oculto, talle o color discontinuado);
 * - toma siempre el precio actual y avisa si difiere del que vio el cliente.
 */
export function validateCart(items: CartItem[], products: Product[]) {
  const lines: CartLine[] = [];
  const notices: CartNotice[] = [];

  for (const item of items) {
    const product = getProductById(products, item.productId);
    const reason: RemovedReason | null = !product
      ? "unavailable"
      : !product.sizes.includes(item.size)
        ? "size"
        : !product.colors.some((c) => c.name === item.color)
          ? "color"
          : null;

    if (!product || reason) {
      notices.push({ type: "removed", key: item.key, name: product?.name ?? item.name ?? null, reason: reason! });
      continue;
    }

    lines.push({ ...item, product });
    if (item.seenPrice !== undefined && item.seenPrice !== product.price) {
      notices.push({ type: "price", key: item.key, name: product.name, from: item.seenPrice, to: product.price });
    }
  }

  return { lines, notices };
}
