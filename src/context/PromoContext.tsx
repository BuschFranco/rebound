"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { isPromoRunning } from "@/lib/promo";
import type { Promotion } from "@/types";
import { useCatalog } from "./CatalogContext";

type PromoState = {
  /** La promo vigente ahora (null si no hay, no empezó o venció). */
  promo: Promotion | null;
  active: boolean;
  /** Ya se leyó el reloj del navegador: recién ahí se muestra la cuenta regresiva. */
  ready: boolean;
  msLeft: number;
};

const PromoContext = createContext<PromoState | null>(null);

const noopSubscribe = () => () => {};

/**
 * Promo de la base (tabla `promotions`) con fechas fijas, iguales para todos.
 * El HTML sale del servidor (cacheado), así que la vigencia exacta y la cuenta regresiva
 * se calculan con el reloj del navegador; antes de hidratar se asume la que mandó el servidor.
 */
export function PromoProvider({ children }: { children: ReactNode }) {
  const { promotion } = useCatalog();
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [now, setNow] = useState(() => Date.now());

  const ended = promotion !== null && ready && now >= promotion.endsAt;
  useEffect(() => {
    if (!promotion || ended) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [promotion, ended]);

  const value = useMemo<PromoState>(() => {
    const active = ready ? isPromoRunning(promotion, now) : promotion !== null;
    return {
      promo: active ? promotion : null,
      active,
      ready,
      msLeft: active && ready && promotion ? Math.max(0, promotion.endsAt - now) : 0,
    };
  }, [promotion, ready, now]);

  return <PromoContext.Provider value={value}>{children}</PromoContext.Provider>;
}

export function usePromo() {
  const ctx = useContext(PromoContext);
  if (!ctx) throw new Error("usePromo debe usarse dentro de <PromoProvider>");
  return ctx;
}
