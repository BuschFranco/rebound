import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BANNER_IMAGE } from "@/data/site";

/** Hosts que Next optimiza (ver next.config.ts). Una imagen de otro sitio se muestra tal cual. */
function canOptimize(src: string) {
  if (src.startsWith("/")) return true;
  try {
    const { hostname, port } = new URL(src);
    return hostname === "images.unsplash.com" || hostname.endsWith(".supabase.co") || (hostname === "127.0.0.1" && port === "54321");
  } catch {
    return false;
  }
}

/**
 * Tarjeta de banner clickeable entera: foto de fondo con un tinte de color, oscurecida a la izquierda para leer
 * el texto. Al pasar el mouse por cualquier parte, la foto hace zoom y el botón se activa como si se lo tocara.
 */
export function BannerCard({
  href,
  cta,
  image = BANNER_IMAGE,
  tint,
  align,
  children,
}: {
  href: string;
  cta: string;
  /** Imagen de fondo (la del panel o la predeterminada). */
  image?: string;
  tint: string;
  align: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative isolate block flex-1 cursor-pointer overflow-hidden rounded-2xl outline-none ring-accent focus-visible:ring-2"
    >
      <Image
        src={image}
        unoptimized={!canOptimize(image)}
        alt=""
        fill
        sizes="(min-width: 1024px) 640px, 100vw"
        className="-z-20 object-cover transition duration-700 ease-out group-hover:scale-105"
      />
      <div className={`absolute inset-0 -z-10 mix-blend-multiply ${tint}`} />
      <div className={`absolute inset-0 -z-10 bg-gradient-to-r ${align} to-transparent`} />
      <div className="px-6 py-8 sm:px-10 sm:py-10">
        {children}
        {/* Solo visual: el link es toda la tarjeta (no puede haber un link dentro de otro). */}
        <span className="mt-5 inline-block rounded-full bg-white px-7 py-3 text-sm font-bold uppercase tracking-widest text-black transition group-hover:bg-accent group-focus-visible:bg-accent">
          {cta}
        </span>
      </div>
    </Link>
  );
}
