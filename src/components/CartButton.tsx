"use client";

import { useCart } from "@/context/CartContext";
import { BagIcon } from "./icons";

export function CartButton() {
  const { count, open } = useCart();
  return (
    <button
      type="button"
      onClick={open}
      className="relative grid size-10 cursor-pointer place-items-center rounded-full transition hover:bg-surface"
      aria-label={`Abrir carrito (${count} productos)`}
    >
      <BagIcon className="size-6" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold leading-5 text-black">
          {count}
        </span>
      )}
    </button>
  );
}
