"use client";

import Image from "next/image";
import Link from "next/link";
import { getCategoryLabel } from "@/lib/products";
import { discountPercent, formatPrice } from "@/lib/format";
import { PROMO } from "@/data/business";
import { usePromo } from "@/context/PromoContext";
import { promoUnitPrice } from "@/lib/promo";
import type { Product } from "@/types";
import { PriceTag } from "./PriceTag";

const SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { active } = usePromo();
  const off = discountPercent(product.price, product.compareAtPrice);
  const [main, hover] = product.images;

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group block rounded-xl p-[1px] transition hover:bg-gradient-brand"
    >
      <div className="h-full rounded-[11px] bg-surface p-2.5">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-2">
          <Image
            src={main}
            alt={product.name}
            fill
            loading={priority ? "eager" : "lazy"}
            sizes={SIZES}
            className={`object-cover transition duration-500 group-hover:scale-105 ${
              hover ? "group-hover:opacity-0" : ""
            }`}
          />
          {hover && (
            <Image
              src={hover}
              alt=""
              fill
              sizes={SIZES}
              className="object-cover opacity-0 transition duration-500 group-hover:opacity-100"
            />
          )}
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {off > 0 && (
              <span className="rounded bg-accent px-2 py-0.5 text-[11px] font-bold text-black">
                -{off}%
              </span>
            )}
            {product.isNew && (
              <span className="rounded bg-accent-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                Nuevo
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1.5 px-1 pb-1 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            {getCategoryLabel(product.category)}
          </p>
          <h3 className="text-sm font-semibold uppercase leading-snug tracking-wide">{product.name}</h3>
          <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} />
          {active && (
            <p className="text-[11px] font-semibold text-accent">
              {formatPrice(promoUnitPrice(product.price))} c/u llevando {PROMO.buy}
            </p>
          )}
          <div className="flex gap-1.5 pt-0.5">
            {product.colors.map((c) => (
              <span
                key={c.name}
                title={c.name}
                className="size-3 rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
