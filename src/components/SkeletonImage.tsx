"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";

/**
 * `next/image` con bone loader: mientras la foto carga se ve un bloque que pulsa en su lugar
 * y la foto aparece con un fundido. Pensado para imágenes `fill` (el contenedor debe ser `relative`).
 */
export function SkeletonImage({ alt, className = "", onLoad, onError, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);

  // Si la foto ya estaba en caché, puede terminar de cargar antes de hidratar y no disparar onLoad.
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <>
      {!loaded && <span aria-hidden className="skeleton absolute inset-0" />}
      <Image
        {...props}
        alt={alt}
        ref={ref}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          setLoaded(true); // sin foto, dejar de pulsar (queda el fondo del contenedor)
          onError?.(e);
        }}
        data-loaded={loaded}
        className={`transition duration-500 data-[loaded=false]:opacity-0 ${className}`}
      />
    </>
  );
}
