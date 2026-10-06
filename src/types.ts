/** Slug de una categoría (viene de la tabla `categories` de Supabase). */
export type Category = string;

export type SizeGuideKind = "apparel" | "shoes" | "none";

export type CategoryInfo = {
  slug: Category;
  label: string;
  image: string;
  /** Qué guía de talles muestra la ficha. */
  sizeGuide: SizeGuideKind;
  /** Categorías que se sugieren en "Completá el look". */
  complements: Category[];
};

/** Textos e imagen de un banner de la home (editables en el panel). null = texto automático. */
export type BannerCopy = {
  eyebrow: string | null;
  title: string | null;
  text: string | null;
  cta: string | null;
  imageUrl: string | null;
};

/** Datos comunes de toda promoción (tabla `promotions`): fechas fijas, iguales para todos. Fechas en ms. */
type PromotionBase = {
  id: string;
  /** Banner de la home cuando es la promo principal. */
  banner: BannerCopy;
  /** Texto corto que se muestra en el sitio ("3x2", "2da al 50%", "Envío gratis desde $100.000"). */
  label: string;
  startsAt: number;
  endsAt: number;
};

/** Llevá N, pagá M en toda la tienda (las más baratas de cada grupo salen gratis). */
export type NxmPromotion = PromotionBase & { kind: "nxm"; buy: number; pay: number };

/** % de descuento en la N-ésima unidad: del mismo producto o dentro de categorías elegidas. */
export type NthDiscountPromotion = PromotionBase & {
  kind: "nth_discount";
  nth: number;
  percent: number;
  scope: "same_product" | "categories";
  categorySlugs: Category[];
};

/** Envío gratis: en productos elegidos, desde un monto o llevando X unidades. */
export type FreeShippingPromotion = PromotionBase & {
  kind: "free_shipping";
} & (
    | { rule: "products"; productIds: string[] }
    | { rule: "min_amount"; minAmount: number }
    | { rule: "min_units"; minUnits: number }
  );

export type DiscountPromotion = NxmPromotion | NthDiscountPromotion;
export type Promotion = DiscountPromotion | FreeShippingPromotion;

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
  /** Talles sin stock: se muestran tachados y no se pueden pedir. */
  soldOutSizes: string[];
  colors: ProductColor[];
  /** Fecha de publicación (ms). */
  publishedAt: number;
  /** Publicado hace menos de NEW_PRODUCT_DAYS días (se calcula, no se carga a mano). */
  isNew: boolean;
  /** 3 beneficios cortos que responden las dudas típicas antes de comprar. */
  highlights?: string[];
};

/** Lo único que se guarda del carrito: nombre, precio e imagen salen siempre del catálogo vigente. */
export type CartItem = {
  key: string;
  productId: string;
  size: string;
  color: string;
  quantity: number;
  /** Nombre al momento de agregarlo: solo para avisar "X ya no está disponible". Nunca se usa para cobrar. */
  name?: string;
  /** Precio que vio el cliente (para avisarle si cambió). El precio a cobrar sale siempre del catálogo. */
  seenPrice?: number;
};

export type CartLine = CartItem & { product: Product };

/** Zona de envío con tarifa propia (tablas `shipping_zones` + `shipping_zone_areas`). */
export type ShippingZone = {
  id: string;
  name: string;
  price: number;
  /** Envío gratis desde este subtotal; null = nunca gratis. */
  freeFrom: number | null;
  eta: string;
  /** Áreas de Georef que cubre: provincia entera (departamentoId null) o un partido/comuna. */
  areas: { provinciaId: string; departamentoId: string | null }[];
};

/** Localidad elegida por el cliente (de Georef). */
export type ShippingLocation = {
  id: string;
  nombre: string;
  /** Partido (PBA) o comuna (CABA). */
  partido: string;
  provincia: string;
  provinciaId: string;
  departamentoId: string | null;
};

/** Dirección de entrega que el cliente guarda en su navegador (todo opcional). */
export type SavedAddress = {
  location: ShippingLocation | null;
  street: string;
  number: string;
  /** Piso / depto. */
  floor: string;
  postalCode: string;
  /** Entre calles, timbre, referencias. */
  notes: string;
  /** Nombre de quien recibe. */
  recipient: string;
};

/** Catálogo completo que se lee de la base. */
export type Catalog = {
  categories: CategoryInfo[];
  products: Product[];
  shippingZones: ShippingZone[];
  /** Promociones activas vigentes o próximas a empezar (pueden convivir varias). */
  promotions: Promotion[];
  /** Banner de ofertas de la home (tabla `site_banners`). */
  offersBanner: BannerCopy;
  /** Cuándo se leyó de la base (ms). Con esto el HTML del servidor decide si la promo ya estaba vigente. */
  fetchedAt: number;
};
