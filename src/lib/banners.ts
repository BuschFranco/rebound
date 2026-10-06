/**
 * Textos de los banners de la home. Lo que se carga en el panel reemplaza al texto automático;
 * si un campo queda vacío, se usa el automático. En los textos se pueden usar variables:
 *   promos:  {etiqueta} (ej. "3x2") y {vigencia} (ej. "del 1 al 31 de octubre de 2026")
 *   ofertas: {descuento} (el mayor % de descuento) y {cantidad} (productos rebajados)
 */
import { BANNER_IMAGE } from "@/data/site";
import type { BannerCopy } from "@/types";

export const OFFERS_BANNER_DEFAULTS = {
  eyebrow: "Ofertas de temporada",
  title: "Hasta {descuento}% off",
  text: "{cantidad} productos rebajados, con el precio anterior tachado. Pedilos por WhatsApp y pagá al recibir.",
  cta: "Ver ofertas",
} as const;

export const PROMO_BANNER_EYEBROW = "Promo · {vigencia}";

/** Reemplaza {variable} por su valor (las que no existen quedan como están). */
export function fillVars(text: string, vars: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/** Texto final de cada campo: el del panel si hay, si no el automático, con las variables reemplazadas. */
export function resolveBanner(
  copy: BannerCopy,
  defaults: { eyebrow: string; title: string; text: string; cta: string },
  vars: Record<string, string | number>,
) {
  return {
    eyebrow: fillVars(copy.eyebrow ?? defaults.eyebrow, vars),
    title: fillVars(copy.title ?? defaults.title, vars),
    text: fillVars(copy.text ?? defaults.text, vars),
    cta: fillVars(copy.cta ?? defaults.cta, vars),
    image: copy.imageUrl ?? BANNER_IMAGE,
  };
}
