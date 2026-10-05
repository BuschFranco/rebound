"use client";

import { usePromo } from "@/context/PromoContext";

const pad = (n: number) => String(n).padStart(2, "0");

function format(ms: number) {
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Cuenta regresiva de la promo del visitante. No se muestra hasta conocer su reloj ni cuando venció. */
export function PromoCountdown({ label = "Termina en", className = "" }: { label?: string; className?: string }) {
  const { ready, active, msLeft } = usePromo();
  if (!ready || !active) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
      {label}
      <time role="timer" className="font-bold tabular-nums">
        {format(msLeft)}
      </time>
    </span>
  );
}
