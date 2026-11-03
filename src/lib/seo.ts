import type { Metadata } from "next";
import { BUSINESS } from "@/data/business";
import ogImage from "@/app/og-image.png";
import { absoluteUrl } from "./site";

/** Imagen al compartir un link (WhatsApp, redes): el logo sobre el fondo de la marca, 1200×630. */
const DEFAULT_SHARE_IMAGE = { url: ogImage.src, width: ogImage.width, height: ogImage.height, alt: "REBOUND · Basketball Store" };

export const SITE_DESCRIPTION =
  "Indumentaria y zapatillas de basket de las mejores marcas, para la cancha y la calle. Pedí por WhatsApp y pagá al recibir en CABA y Provincia de Buenos Aires.";

/** Metadata de una página con canonical, Open Graph y Twitter coherentes. */
export function pageMetadata({
  title,
  description,
  path,
  images = [DEFAULT_SHARE_IMAGE],
  type = "website",
  index = true,
}: {
  title?: string;
  description: string;
  path: string;
  /** Fotos del producto (URL) o la imagen de la marca por defecto. */
  images?: (string | typeof DEFAULT_SHARE_IMAGE)[];
  type?: "website" | "article";
  index?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = title ? `${title} · ${BUSINESS.brand}` : undefined;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: url },
    robots: index ? undefined : { index: false, follow: true },
    openGraph: {
      type,
      url,
      siteName: BUSINESS.brand,
      locale: "es_AR",
      title: fullTitle ?? `${BUSINESS.brand} · Basketball Store`,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle ?? `${BUSINESS.brand} · Basketball Store`,
      description,
      images,
    },
  };
}
