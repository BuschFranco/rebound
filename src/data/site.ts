/** Contenido visual fijo del sitio (no son productos: los productos viven en Supabase). */

const unsplash = (id: string, w: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const HERO_IMAGE = unsplash("photo-1749132387922-b60477db1ce1", 2000);
export const BANNER_IMAGE = unsplash("photo-1593935890446-2f13f143f363", 1600);
