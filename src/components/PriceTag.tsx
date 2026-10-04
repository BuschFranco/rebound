import { discountPercent, formatPrice } from "@/lib/format";

export function PriceTag({
  price,
  compareAtPrice,
  size = "sm",
}: {
  price: number;
  compareAtPrice?: number;
  size?: "sm" | "lg";
}) {
  const off = discountPercent(price, compareAtPrice);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`font-bold tabular-nums ${size === "lg" ? "text-3xl" : "text-base"}`}>
        {formatPrice(price)}
      </span>
      {off > 0 && (
        <>
          <span className={`text-muted line-through tabular-nums ${size === "lg" ? "text-base" : "text-xs"}`}>
            {formatPrice(compareAtPrice!)}
          </span>
          <span className={`font-bold text-accent ${size === "lg" ? "text-sm" : "text-xs"}`}>
            {off}% OFF
          </span>
        </>
      )}
    </div>
  );
}
