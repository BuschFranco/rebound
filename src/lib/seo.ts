import type { Metadata } from "next";
import { BUSINESS } from "@/data/business";
import { HERO_IMAGE } from "@/data/site";
import { absoluteUrl } from "./site";

export const SITE_DESCRIPTION =
  "Indumentaria y zapatillas de basket. Hecho para la cancha y la calle. Pedí por WhatsApp y pagá al recibir en CABA y Provincia de Buenos Aires.";

/** Metadata de una página con canonical, Open Graph y Twitter coherentes. */
export function pageMetadata({
  title,
  description,
  path,
  images = [HERO_IMAGE],
  type = "website",
  index = true,
}: {
  title?: string;
  description: string;
  path: string;
  images?: string[];
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
