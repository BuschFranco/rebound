"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { isDiscount, promoAppliesTo, runningPromos } from "@/lib/promo";
import type { Product, Promotion } from "@/types";
import { useCatalog } from "./CatalogContext";

type PromoState = {
  /** Promos vigentes ahora (pueden ser varias). Vacío si no hay ninguna. */
  promos: Promotion[];
  /** La que se destaca (hero, banner): el primer descuento vigente o, si no hay, la primera promo. */
  primary: Promotion | null;
  /** Hay al menos una promo vigente. */
  active: boolean;
  /** Ya se leyó el reloj del navegador: recién ahí se muestran las cuentas regresivas. */
  ready: boolean;
  /** Hora de referencia (reloj del navegador, o la del catálogo antes de hidratar). */
  now: number;
  /** Promo vigente que termina primero (para el contador general). */
  endingSoonest: Promotion | null;
  isRunning: (id: string) => boolean;
  /** Promos vigentes que le aplican a un producto. */
  appliesTo: (product: Product) => Promotion[];
};

const PromoContext = createContext<PromoState | null>(null);

const noopSubscribe = () => () => {};
// setTimeout no acepta esperas de más de ~24,8 días: se vuelve a programar al vencer.
const MAX_TIMEOUT = 2_147_000_000;

/**
 * Promos de la base (tabla `promotions`) con fechas fijas, iguales para todos. Pueden convivir varias.
 * Sin promos vigentes no se muestra nada de promos en el sitio; las programadas aparecen solas cuando
 * empiezan (y desaparecen solas cuando terminan), aunque la página esté abierta.
 *
 * Antes de hidratar se usa la hora en que se leyó el catálogo (`fetchedAt`), así el HTML no muestra
 * una promo que todavía no empezó; después manda el reloj del navegador.
 */
export function PromoProvider({ children }: { children: ReactNode }) {
  const { promotions, fetchedAt } = useCatalog();
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [clock, setClock] = useState(() => Date.now());
  const now = ready ? clock : fetchedAt;

  const running = useMemo(() => runningPromos(promotions, now), [promotions, now]);

  useEffect(() => {
    if (!ready || promotions.length === 0) return;
    // Con alguna vigente, la cuenta regresiva avanza cada segundo; si no, un solo aviso en el próximo cambio
    // (cuando empiece o termine alguna), sin redibujar la página cada segundo.
    const upcoming = promotions.flatMap((p) => [p.startsAt, p.endsAt]).filter((t) => t > clock);
    if (upcoming.length === 0) return;
    const wait = running.length > 0 ? 1000 : Math.min(Math.min(...upcoming) - Date.now() + 50, MAX_TIMEOUT);
    const id = window.setTimeout(() => setClock(Date.now()), Math.max(50, wait));
    return () => window.clearTimeout(id);
  }, [ready, promotions, running.length, clock]);

  const value = useMemo<PromoState>(() => {
    const ids = new Set(running.map((p) => p.id));
    return {
      promos: running,
      primary: running.find(isDiscount) ?? running[0] ?? null,
      active: running.length > 0,
      ready,
      now,
      endingSoonest: running.reduce<Promotion | null>((min, p) => (!min || p.endsAt < min.endsAt ? p : min), null),
      isRunning: (id) => ids.has(id),
      appliesTo: (product) => running.filter((p) => promoAppliesTo(p, product)),
    };
  }, [running, ready, now]);

  return <PromoContext.Provider value={value}>{children}</PromoContext.Provider>;
}

export function usePromo() {
  const ctx = useContext(PromoContext);
  if (!ctx) throw new Error("usePromo debe usarse dentro de <PromoProvider>");
  return ctx;
}
