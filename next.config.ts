import type { NextConfig } from "next";
import { checkProductionEnv } from "./src/lib/env";

const isDev = process.env.NODE_ENV === "development";

// En producción, cortar el build si faltan variables críticas (WhatsApp, URL del sitio, Supabase…).
checkProductionEnv();

const nextConfig: NextConfig = {
  // Las URLs del sitio terminan en "/" (canonical, sitemap y links de WhatsApp ya las usan así).
  trailingSlash: true,
  images: {
    remotePatterns: [
      // Fotos de ejemplo actuales.
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      // Fotos subidas al Storage de Supabase (nube).
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Storage de Supabase local (Docker), solo en desarrollo.
      ...(isDev
        ? [{ protocol: "http" as const, hostname: "127.0.0.1", port: "54321", pathname: "/storage/v1/object/public/**" }]
        : []),
    ],
    // Next 16 bloquea optimizar imágenes de IPs locales; el Storage de Docker está en 127.0.0.1.
    dangerouslyAllowLocalIP: isDev,
  },
};

export default nextConfig;
