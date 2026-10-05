"use client";

import { SkeletonImage } from "./SkeletonImage";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useCatalog, useOrderedCategories } from "@/context/CatalogContext";
import { countByCategory } from "@/lib/products";


const CLOSE_DELAY = 140;

export function CatalogMenu({ active }: { active: boolean }) {
  const { products } = useCatalog();
  const categories = useOrderedCategories();
  const counts = countByCategory(products);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const show = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  }, [cancelClose]);

  const hide = useCallback(() => {
    cancelClose();
    setOpen(false);
  }, [cancelClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, hide]);

  useEffect(() => cancelClose, [cancelClose]);

  return (
    <div
      onMouseEnter={show}
      onMouseLeave={scheduleClose}
      onFocus={show}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) scheduleClose();
      }}
    >
      <Link
        href="/catalogo"
        onClick={hide}
        aria-expanded={open}
        aria-controls={panelId}
        className={`relative flex items-center gap-1 py-2 text-xs font-semibold uppercase tracking-widest transition hover:text-ink ${
          active || open ? "text-ink" : "text-muted"
        } after:absolute after:bottom-0.5 after:left-0 after:h-0.5 after:bg-accent after:transition-all ${
          active || open ? "after:w-full" : "after:w-0"
        }`}
      >
        Catálogo
        <svg
          viewBox="0 0 12 12"
          className={`size-2.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </Link>

      {/* Panel: siempre montado para poder animar la entrada y la salida */}
      <div
        id={panelId}
        className={`absolute inset-x-0 top-full transition-[opacity,visibility] duration-300 ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className="border-b border-line bg-background shadow-2xl shadow-black/60">
          <div
            className={`mx-auto grid max-w-7xl gap-8 px-4 py-8 transition-[transform,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-6 lg:grid-cols-[220px_1fr] ${
              open ? "translate-y-0 blur-0" : "-translate-y-3 blur-[2px]"
            }`}
          >
            <div className="flex flex-col justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Catálogo</p>
                <p className="mt-2 font-display text-4xl uppercase italic leading-none">
                  Elegí tu <span className="pr-1 text-accent">juego</span>
                </p>
              </div>
              <ul className="space-y-1">
                {categories.map((c, i) => (
                  <li
                    key={c.slug}
                    className={`transition-all duration-500 ${
                      open ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                    }`}
                    style={{ transitionDelay: open ? `${60 + i * 35}ms` : "0ms" }}
                  >
                    <Link
                      href={`/catalogo?categoria=${c.slug}`}
                      onClick={hide}
                      className="group flex items-center justify-between rounded-lg px-2 py-1.5 text-sm font-semibold uppercase tracking-wider text-muted transition hover:bg-surface hover:text-ink"
                    >
                      {c.label}
                      <span className="text-xs tabular-nums text-muted transition group-hover:text-accent">
                        {counts[c.slug] ?? 0}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/catalogo"
                onClick={hide}
                className="text-xs font-bold uppercase tracking-widest text-accent hover:underline"
              >
                Ver todo el catálogo →
              </Link>
            </div>

            <ul className="hidden grid-cols-3 gap-3 lg:grid xl:grid-cols-6">
              {categories.map((c, i) => (
                <li
                  key={c.slug}
                  className={`transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  }`}
                  style={{ transitionDelay: open ? `${80 + i * 45}ms` : "0ms" }}
                >
                  <Link
                    href={`/catalogo?categoria=${c.slug}`}
                    onClick={hide}
                    className="group relative block aspect-[3/4] overflow-hidden rounded-xl bg-surface ring-1 ring-line transition hover:ring-2 hover:ring-accent"
                  >
                    <SkeletonImage
                      src={c.image}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 14vw, 25vw"
                      className="object-cover transition duration-500 group-hover:scale-110"
                    />
                    <span className="absolute inset-0 bg-black/45" />
                    <span className="absolute inset-x-3 bottom-3">
                      <span className="block font-display text-2xl uppercase italic leading-none">
                        {c.label}
                      </span>
                      <span className="mt-1 block text-[11px] font-semibold uppercase tracking-widest text-white/70">
                        {counts[c.slug] ?? 0} productos
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
