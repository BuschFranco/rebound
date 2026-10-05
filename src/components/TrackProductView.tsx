"use client";

import { useEffect } from "react";
import { viewedStore } from "@/lib/viewedStore";

/** Registra en el historial local que el cliente vio este producto (no renderiza nada). */
export function TrackProductView({ productId }: { productId: string }) {
  useEffect(() => {
    viewedStore.add(productId);
  }, [productId]);
  return null;
}
