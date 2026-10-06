"use client";

import { useLenis } from "lenis/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { CloseIcon } from "./icons";
import { SkeletonImage } from "./SkeletonImage";

const ZOOM = 2.5;

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" className="size-6" aria-hidden>
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

/**
 * Galería de la ficha: al pasar el mouse se hace zoom donde está el cursor (solo con mouse)
 * y al hacer clic la foto se abre a pantalla completa, con flechas para pasar entre las fotos.
 */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const lenis = useLenis();

  const open = (i: number) => {
    setCurrent(i);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();
  const step = useCallback(
    (dir: 1 | -1) => setCurrent((i) => (i === null ? i : (i + dir + images.length) % images.length)),
    [images.length],
  );

  const isOpen = current !== null;

  // Con la foto abierta: frenar el scroll suave de fondo y pasar fotos con las flechas del teclado.
  useEffect(() => {
    if (!isOpen) return;
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      lenis?.start();
    };
  }, [isOpen, lenis, step]);

  const alt = (i: number) => (i === 0 ? name : `${name} – vista ${i + 1}`);

  return (
    <>
      <div className="grid gap-3">
        {images.map((src, i) => (
          <ZoomImage key={src} src={src} alt={alt(i)} priority={i === 0} onOpen={() => open(i)} />
        ))}
      </div>

      <dialog
        ref={dialogRef}
        aria-label={`Fotos de ${name}`}
        data-lenis-prevent
        onClose={() => setCurrent(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-ink backdrop:bg-black/80 open:animate-[dialog-in_250ms_cubic-bezier(0.22,1,0.36,1)]"
      >
        {current !== null && (
          <div className="relative flex h-full w-full items-center justify-center" onClick={(e) => e.target === e.currentTarget && close()}>
            <div className="relative h-[85dvh] w-[92vw] max-w-5xl">
              <Image
                key={images[current]}
                src={images[current]}
                alt={alt(current)}
                fill
                sizes="92vw"
                className="object-contain"
              />
            </div>

            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Cerrar"
            >
              <CloseIcon className="size-6" />
            </button>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  className="absolute left-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-accent hover:text-black sm:left-6"
                  aria-label="Foto anterior"
                >
                  <Chevron dir="left" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  className="absolute right-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-accent hover:text-black sm:right-6"
                  aria-label="Foto siguiente"
                >
                  <Chevron dir="right" />
                </button>
                <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold tabular-nums text-white">
                  {current + 1} / {images.length}
                </p>
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}

/** Foto con zoom que sigue al cursor. Con pantalla táctil no hay zoom: el toque abre la foto completa. */
function ZoomImage({ src, alt, priority, onOpen }: { src: string; alt: string; priority: boolean; onOpen: () => void }) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  function follow(e: MouseEvent<HTMLButtonElement>) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setZoom({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseMove={follow}
      onMouseLeave={() => setZoom(null)}
      aria-label={`Ver ${alt} en pantalla completa`}
      className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl bg-surface ring-1 ring-line"
    >
      <SkeletonImage
        src={src}
        alt={alt}
        fill
        loading={priority ? "eager" : "lazy"}
        // Más resolución que la que ocupa en pantalla, para que el zoom se vea nítido.
        sizes="(min-width: 1024px) 90vw, 100vw"
        className="object-cover ease-out"
        style={{
          transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "center",
          transform: zoom ? `scale(${ZOOM})` : "scale(1)",
          transitionDuration: zoom ? "150ms" : "400ms",
        }}
      />
    </button>
  );
}
