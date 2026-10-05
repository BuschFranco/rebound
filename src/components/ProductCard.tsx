"use client";

import Image from "next/image";
import Link from "next/link";
import { discountPercent, formatPrice } from "@/lib/format";
import { usePromo } from "@/context/PromoContext";
import { promoUnitPrice } from "@/lib/promo";
import type { Product } from "@/types";
import { FavoriteButton } from "./FavoriteButton";
import { PriceTag } from "./PriceTag";
import { SkeletonImage } from "./SkeletonImage";

const SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

export function ProductCard({
  product,
  categoryLabel,
  priority = false,
}: {
  product: Product;
  categoryLabel: string;
  priority?: boolean;
}) {
  const { promo: promotion } = usePromo();
  const off = discountPercent(product.price, product.compareAtPrice);
  const [main, hover] = product.images;

  return (
    <div className="relative h-full">
      <Link
        href={`/producto/${product.slug}`}
        className="group block h-full rounded-xl p-[1px] transition hover:bg-accent"
      >
        <div className="h-full rounded-[11px] bg-surface p-2.5">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-2">
            <SkeletonImage
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
              {categoryLabel}
            </p>
            <h3 className="text-sm font-semibold uppercase leading-snug tracking-wide">{product.name}</h3>
            <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} />
            {promotion && (
              <p className="text-[11px] font-semibold text-accent">
                {formatPrice(promoUnitPrice(product.price, promotion))} c/u llevando {promotion.buy}
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
      {/* Fuera del link (un botón no puede ir dentro de un <a>), sobre la esquina de la foto. */}
      <FavoriteButton productId={product.id} productName={product.name} className="absolute right-5 top-5" />
    </div>
  );
}
