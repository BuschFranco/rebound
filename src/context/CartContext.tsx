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
import { computePromo, type PromoSummary } from "@/lib/promo";
import type { CartItem, Product } from "@/types";

type CartContextValue = {
  items: CartItem[];
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
  const items = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(
    (product: Product, size: string, color: string, quantity = 1) => {
      cartStore.add({
        key: `${product.id}__${size}__${color}`,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images[0],
        price: product.price,
        size,
        color,
        quantity,
      });
      setIsOpen(true);
    },
    [],
  );

  const value = useMemo<CartContextValue>(() => {
    const promo = computePromo(items);
    return {
      items,
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
  }, [items, isOpen, open, close, addItem]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
