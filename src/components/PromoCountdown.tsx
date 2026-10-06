"use client";

import { usePromo } from "@/context/PromoContext";
import type { Promotion } from "@/types";

const pad = (n: number) => String(n).padStart(2, "0");

function split(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Texto para lectores de pantalla (el reloj cambia cada segundo; esto se lee una vez). */
function spoken({ days, hours, minutes }: ReturnType<typeof split>) {
  return `Quedan ${plural(days, "día", "días")}, ${plural(hours, "hora", "horas")} y ${plural(minutes, "minuto", "minutos")}`;
}

/**
 * Cuenta regresiva de la promo. No se muestra hasta conocer el reloj del navegador ni cuando venció.
 *
 * - `inline`: una línea con el tiempo resaltado (barra superior).
 * - `blocks`: reloj por bloques (días / hs / min / seg) para los lugares destacados.
 *   `tone="onColor"` sobre fondos violeta o fotos; `tone="onDark"` sobre las tarjetas oscuras.
 */
export function PromoCountdown({
  label = "Termina en",
  variant = "blocks",
  tone = "onColor",
  promo,
  className = "",
}: {
  label?: string;
  variant?: "inline" | "blocks";
  tone?: "onColor" | "onDark";
  /** Promo puntual; sin ella, cuenta hasta la vigente que termina primero. */
  promo?: Pick<Promotion, "id" | "endsAt">;
  className?: string;
}) {
  const { ready, now, endingSoonest, isRunning } = usePromo();
  const target = promo ?? endingSoonest;
  if (!ready || !target || !isRunning(target.id)) return null;
  const t = split(target.endsAt - now);
  // Último día: el reloj pasa a naranja para transmitir urgencia.
  const lastDay = t.days === 0;

  if (variant === "inline") {
    return (
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
        {label}
        <time
          role="timer"
          aria-label={spoken(t)}
          className={`rounded px-1.5 py-0.5 font-bold tabular-nums tracking-wider ${
            lastDay ? "bg-accent text-black" : "bg-black/35 text-white"
          }`}
        >
          {t.days}d {pad(t.hours)}:{pad(t.minutes)}:{pad(t.seconds)}
        </time>
      </span>
    );
  }

  const units = [
    ...(t.days > 0 ? [{ value: String(t.days), unit: t.days === 1 ? "día" : "días" }] : []),
    { value: pad(t.hours), unit: "hs" },
    { value: pad(t.minutes), unit: "min" },
    { value: pad(t.seconds), unit: "seg" },
  ];
  const box =
    tone === "onDark"
      ? lastDay
        ? "bg-accent text-black"
        : "border border-accent/40 bg-accent/10 text-accent"
      : lastDay
        ? "bg-accent text-black"
        : "bg-black/45 text-white ring-1 ring-white/15";

  return (
    <span className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{label}</span>
      <time role="timer" aria-label={spoken(t)} className="flex items-center gap-1.5">
        {units.map(({ value, unit }) => (
          <span
            key={unit}
            className={`grid min-w-11 place-items-center rounded-lg px-1.5 py-1.5 leading-none ${box}`}
          >
            <span className="text-lg font-bold tabular-nums sm:text-xl">{value}</span>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-wider opacity-80">{unit}</span>
          </span>
        ))}
      </time>
    </span>
  );
}
