import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

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

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...PAGES.map(({ path, priority }) => ({ url: absoluteUrl(path), priority })),
    ...getProducts().map((p) => ({ url: absoluteUrl(`/producto/${p.slug}/`), priority: 0.8 })),
  ];
}
