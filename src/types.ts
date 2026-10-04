export type Category =
  | "camisetas"
  | "shorts"
  | "zapatillas"
  | "buzos"
  | "camperas"
  | "accesorios";

export type ProductColor = {
  name: string;
  hex: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: Category;
  price: number;
  compareAtPrice?: number;
  images: string[];
  sizes: string[];
  colors: ProductColor[];
  isNew?: boolean;
  /** 3 beneficios cortos que responden las dudas típicas antes de comprar. */
  highlights?: string[];
};

export type CartItem = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
};
