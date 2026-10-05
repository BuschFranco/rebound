"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { favoritesStore } from "@/lib/favoritesStore";
import { getProductById } from "@/lib/products";
import type { Product } from "@/types";
import { useCatalog } from "./CatalogContext";

type FavoritesContextValue = {
  ids: string[];
  /** Favoritos que siguen publicados, en el orden en que se marcaron (el último primero). */
  products: Product[];
  count: number;
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { products: catalog } = useCatalog();
  const ids = useSyncExternalStore(favoritesStore.subscribe, favoritesStore.getSnapshot, favoritesStore.getServerSnapshot);
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<FavoritesContextValue>(() => {
    const products = ids.flatMap((id) => {
      const p = getProductById(catalog, id);
      return p ? [p] : [];
    });
    const set = new Set(ids);
    return {
      ids,
      products,
      count: products.length,
      isFavorite: (id) => set.has(id),
      toggle: favoritesStore.toggle,
      remove: favoritesStore.remove,
      clear: favoritesStore.clear,
      isOpen,
      open,
      close,
    };
  }, [ids, catalog, isOpen, open, close]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de <FavoritesProvider>");
  return ctx;
}
