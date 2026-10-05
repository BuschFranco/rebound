/** URL pública del sitio (en GitHub Pages incluye el /<repo>). Sin barra final. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** URL absoluta de una ruta del sitio (el sitio usa `trailingSlash`, así que las rutas terminan en "/"). */
export function absoluteUrl(path = "/") {
  return `${SITE_URL}${path}`;
}
