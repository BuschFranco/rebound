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

/** Promoción por cantidad NxM con fechas fijas (tabla `promotions`). Fechas en ms. */
export type Promotion = {
  id: string;
  label: string;
  buy: number;
  pay: number;
  startsAt: number;
  endsAt: number;
};

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
  /** Promoción activa vigente o próxima a empezar; null si no hay. */
  promotion: Promotion | null;
};
