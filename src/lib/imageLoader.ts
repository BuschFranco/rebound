import type { ImageLoaderProps } from "next/image";

/**
 * El sitio se publica como estático (GitHub Pages), así que no hay optimizador de imágenes de Next.
 * Las fotos vienen de Unsplash, que redimensiona por URL: pedimos el ancho exacto que necesita cada imagen.
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps) {
  // Imágenes locales (import estático): el loader custom no agrega el basePath de GitHub Pages.
  if (src.startsWith("/")) return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${src}`;
  if (!src.startsWith("https://images.unsplash.com/")) return src;
  const url = new URL(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? 75));
  url.searchParams.set("auto", "format");
  return url.toString();
}
