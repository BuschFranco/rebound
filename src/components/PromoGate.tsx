"use client";

import type { ReactNode } from "react";
import { usePromo } from "@/context/PromoContext";

/**
 * Muestra `children` solo mientras la promo está vigente para el visitante; si no, `fallback`.
 * Con `promoId`, depende de esa promo puntual; sin él, de que haya alguna vigente.
 */
export function PromoGate({
  children,
  fallback = null,
  promoId,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  promoId?: string;
}) {
  const { active, isRunning } = usePromo();
  const show = promoId ? isRunning(promoId) : active;
  return <>{show ? children : fallback}</>;
}
