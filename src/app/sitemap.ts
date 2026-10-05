import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/site";

const PAGES = [
  { path: "/", priority: 1 },
  { path: "/catalogo/", priority: 0.9 },
  { path: "/ofertas/", priority: 0.9 },
  { path: "/envios/", priority: 0.4 },
  { path: "/cambios-y-devoluciones/", priority: 0.4 },
  { path: "/terminos/", priority: 0.2 },
  { path: "/privacidad/", priority: 0.2 },
  { path: "/arrepentimiento/", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products } = await getCatalog();
  return [
    ...PAGES.map(({ path, priority }) => ({ url: absoluteUrl(path), priority })),
    ...products.map((p) => ({ url: absoluteUrl(`/producto/${p.slug}/`), priority: 0.8 })),
  ];
}
