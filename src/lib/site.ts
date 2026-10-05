/** URL pública del sitio, sin barra final (en Netlify: la URL del sitio o tu dominio). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** URL absoluta de una ruta del sitio (el sitio usa `trailingSlash`, así que las rutas terminan en "/"). */
export function absoluteUrl(path = "/") {
  return `${SITE_URL}${path}`;
}
