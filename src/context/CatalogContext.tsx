"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { sortCategoriesByViews } from "@/lib/products";
import { viewedStore } from "@/lib/viewedStore";
import type { Catalog } from "@/types";

const CatalogContext = createContext<Catalog | null>(null);

/**
 * El layout lee el catálogo de Supabase en el servidor y lo pasa acá, así los componentes
 * del navegador (carrito, menú, buscador) lo usan sin consultar la base desde el cliente.
 */
export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog debe usarse dentro de <CatalogProvider>");
  return ctx;
}

/**
 * Categorías con las más vistas por el cliente primero (historial local de productos vistos).
 * En el HTML del servidor y sin historial, se usa el orden de la base.
 */
export function useOrderedCategories() {
  const { categories, products } = useCatalog();
  const viewedIds = useSyncExternalStore(viewedStore.subscribe, viewedStore.getSnapshot, viewedStore.getServerSnapshot);
  return sortCategoriesByViews(categories, products, viewedIds);
}
