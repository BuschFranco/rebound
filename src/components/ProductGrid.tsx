import { getCategoryLabel } from "@/lib/products";
import type { CategoryInfo, Product } from "@/types";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products, categories }: { products: Product[]; categories: CategoryInfo[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard
          key={p.id}
          product={p}
          categoryLabel={getCategoryLabel(categories, p.category)}
          priority={i < 4}
        />
      ))}
    </div>
  );
}
