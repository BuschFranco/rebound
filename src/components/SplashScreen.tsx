"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import logo from "@/app/logo.png";

/** Mínimo en pantalla, para que no aparezca y desaparezca de golpe. */
const MIN_VISIBLE = 650;
const FADE_MS = 450;

/**
 * Pantalla de carga en cada carga completa de la página (al entrar o recargar; no al navegar dentro del
 * sitio, porque vive en el layout): pelota naranja que rebota, logo y una línea que se llena.
 * Sale en el HTML del servidor (se ve desde el primer instante) y se desvanece cuando la página
 * terminó de cargar. Sin JavaScript se va sola por CSS (ver .splash en globals.css).
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "leaving" | "gone">("visible");

  useEffect(() => {
    let timer: number | undefined;
    const leave = () => {
      const wait = Math.max(0, MIN_VISIBLE - performance.now());
      timer = window.setTimeout(() => {
        setPhase("leaving");
        timer = window.setTimeout(() => setPhase("gone"), FADE_MS);
      }, wait);
    };
    if (document.readyState === "complete") leave();
    else window.addEventListener("load", leave, { once: true });
    return () => {
      window.removeEventListener("load", leave);
      window.clearTimeout(timer);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className={`splash fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-[450ms] ${
        phase === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center">
        {/* Pelota (color plano) que rebota sobre su sombra */}
        <div className="relative h-28 w-20">
          <svg viewBox="0 0 32 32" className="splash-ball absolute left-1/2 top-0 size-14" aria-hidden>
            <circle cx="16" cy="16" r="15" fill="var(--accent)" />
            <g fill="none" stroke="#0b0a0f" strokeWidth="1.6" strokeLinecap="round">
              <path d="M1.5 16h29" />
              <path d="M16 1v30" />
              <path d="M5.4 5.4a14 14 0 0 1 0 21.2" />
              <path d="M26.6 5.4a14 14 0 0 0 0 21.2" />
            </g>
          </svg>
          <span className="splash-shadow absolute bottom-0 left-1/2 h-1.5 w-12 rounded-full bg-white/20 blur-[1px]" />
        </div>
        <Image src={logo} alt="" priority sizes="180px" className="mt-6 h-10 w-auto" />
        <span className="mt-6 block h-0.5 w-40 overflow-hidden rounded-full bg-line">
          <span className="splash-bar block h-full rounded-full bg-accent" />
        </span>
      </div>
    </div>
  );
}
