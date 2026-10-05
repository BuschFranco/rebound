"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cartStore } from "@/lib/cartStore";
import { getProductById } from "@/lib/products";
import { usePromo } from "./PromoContext";
import { computePromo, type PromoSummary } from "@/lib/promo";
import type { CartLine, Product } from "@/types";

type CartContextValue = {
  /** Ítems del carrito con el producto y precio vigentes del catálogo. */
  lines: CartLine[];
  count: number;
  /** Total a pagar, con la promo aplicada. */
  total: number;
  promo: PromoSummary;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  addItem: (product: Product, size: string, color: string, quantity?: number) => void;
  updateQty: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const stored = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );
  const { active: promoActive } = usePromo();
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(
    (product: Product, size: string, color: string, quantity = 1) => {
      cartStore.add({
        key: `${product.id}__${size}__${color}`,
        productId: product.id,
        size,
        color,
        quantity,
      });
      setIsOpen(true);
    },
    [],
  );

  const value = useMemo<CartContextValue>(() => {
    const lines = stored.flatMap((item) => {
      const product = getProductById(item.productId);
      return product ? [{ ...item, product }] : [];
    });
    const promo = computePromo(lines, promoActive);
    return {
      lines,
      count: promo.units,
      total: promo.total,
      promo,
      isOpen,
      open,
      close,
      addItem,
      updateQty: cartStore.updateQty,
      removeItem: cartStore.remove,
      clear: cartStore.clear,
    };
  }, [stored, promoActive, isOpen, open, close, addItem]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
