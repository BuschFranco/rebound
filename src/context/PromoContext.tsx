"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { PROMO } from "@/data/business";
import { promoClock } from "@/lib/promoClock";

type PromoState = {
  /** Si la promo vale ahora. Antes de conocer el reloj del visitante (HTML estático) se asume activa. */
  active: boolean;
  /** Ya se leyó el reloj del navegador: recién ahí se puede mostrar la cuenta regresiva. */
  ready: boolean;
  msLeft: number;
};

const PromoContext = createContext<PromoState | null>(null);

const DURATION_MS = PROMO.durationDays * 24 * 60 * 60 * 1000;

export function PromoProvider({ children }: { children: ReactNode }) {
  const start = useSyncExternalStore(promoClock.subscribe, promoClock.getSnapshot, promoClock.getServerSnapshot);
  const [now, setNow] = useState(() => Date.now());

  const endsAt = start === null ? null : start + DURATION_MS;
  const running = PROMO.enabled && endsAt !== null && endsAt > now;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const value = useMemo<PromoState>(() => {
    const ready = endsAt !== null;
    const msLeft = ready ? Math.max(0, endsAt - now) : DURATION_MS;
    return { active: PROMO.enabled && (!ready || msLeft > 0), ready, msLeft };
  }, [endsAt, now]);

  return <PromoContext.Provider value={value}>{children}</PromoContext.Provider>;
}

export function usePromo() {
  const ctx = useContext(PromoContext);
  if (!ctx) throw new Error("usePromo debe usarse dentro de <PromoProvider>");
  return ctx;
}
