"use client";

import { useFavorites } from "@/context/FavoritesContext";
import { StarIcon } from "./icons";

/** Estrella del encabezado (a la izquierda del carrito): abre el panel de favoritos. */
export function FavoritesButton() {
  const { count, open } = useFavorites();
  return (
    <button
      type="button"
      onClick={open}
      className="relative grid size-10 cursor-pointer place-items-center rounded-full transition hover:bg-surface"
      aria-label={`Abrir favoritos (${count} productos)`}
    >
      <StarIcon className="size-6" filled={count > 0} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold leading-5 text-black">
          {count}
        </span>
      )}
    </button>
  );
}
