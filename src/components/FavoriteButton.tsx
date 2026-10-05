"use client";

import { useState } from "react";
import { useFavorites } from "@/context/FavoritesContext";
import { StarIcon } from "./icons";

/**
 * Estrella para marcar un producto como favorito.
 * `overlay`: círculo sobre la foto de la tarjeta · `inline`: al lado del nombre en la ficha.
 */
export function FavoriteButton({
  productId,
  productName,
  variant = "overlay",
  className = "",
}: {
  productId: string;
  productName: string;
  variant?: "overlay" | "inline";
  className?: string;
}) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(productId);
  const [pop, setPop] = useState(false);

  const styles =
    variant === "overlay"
      ? "size-9 bg-black/55 backdrop-blur-sm hover:bg-black/75"
      : "size-12 border border-line bg-surface hover:border-accent";

  return (
    <button
      type="button"
      onClick={() => {
        if (!active) setPop(true);
        toggle(productId);
      }}
      onAnimationEnd={() => setPop(false)}
      aria-pressed={active}
      aria-label={`${active ? "Quitar de" : "Agregar a"} favoritos: ${productName}`}
      title={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={`grid shrink-0 place-items-center rounded-full transition ${styles} ${
        active ? "text-accent" : "text-white hover:text-accent"
      } ${pop ? "animate-pop" : ""} ${className}`}
    >
      <StarIcon filled={active} className={variant === "overlay" ? "size-5" : "size-6"} />
    </button>
  );
}
