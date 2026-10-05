"use client";

import type { ReactNode } from "react";
import { usePromo } from "@/context/PromoContext";

/** Muestra `children` solo mientras la promo está vigente para el visitante; si no, `fallback`. */
export function PromoGate({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { active } = usePromo();
  return <>{active ? children : fallback}</>;
}
