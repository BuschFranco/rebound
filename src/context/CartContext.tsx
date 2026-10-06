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
import { validateCart, type CartNotice } from "@/lib/cartValidation";
import { useCatalog } from "./CatalogContext";
import { usePromo } from "./PromoContext";
import { computeDiscounts, type PromoSummary } from "@/lib/promo";
import type { CartLine, Product } from "@/types";

type CartContextValue = {
  /** Ítems del carrito con el producto y precio vigentes del catálogo. */
  lines: CartLine[];
  /** Cambios desde la última vez que el cliente vio el carrito (precio distinto, producto que ya no está). */
  notices: CartNotice[];
  count: number;
  /** Total a pagar, con la promo aplicada (sin envío). */
  total: number;
  promo: PromoSummary;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  addItem: (product: Product, size: string, color: string, quantity?: number) => void;
  updateQty: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  /** Marca los avisos como vistos: actualiza precios "vistos" y saca lo que ya no existe. */
  acknowledgeNotices: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const stored = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );
  const { products } = useCatalog();
  const { promos } = usePromo();
  const [isOpen, setIsOpen] = useState(false);

  const { lines, notices } = useMemo(() => validateCart(stored, products), [stored, products]);

  const acknowledgeNotices = useCallback(() => {
    if (notices.length > 0) cartStore.acknowledge(lines);
  }, [notices.length, lines]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    acknowledgeNotices();
  }, [acknowledgeNotices]);

  const addItem = useCallback(
    (product: Product, size: string, color: string, quantity = 1) => {
      cartStore.add({
        key: `${product.id}__${size}__${color}`,
        productId: product.id,
        size,
        color,
        quantity,
        name: product.name,
        seenPrice: product.price,
      });
      setIsOpen(true);
    },
    [],
  );

  const value = useMemo<CartContextValue>(() => {
    const promo = computeDiscounts(lines, promos);
    return {
      lines,
      notices,
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
      acknowledgeNotices,
    };
  }, [lines, notices, promos, isOpen, open, close, addItem, acknowledgeNotices]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
