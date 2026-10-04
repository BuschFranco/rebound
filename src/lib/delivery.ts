import { DELIVERY } from "@/data/business";

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) added++;
  }
  return d;
}

const fmt = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" });

/** Formatea "jue 8 de oct" a partir de una fecha. */
function label(d: Date) {
  const [weekday, rest] = fmt.format(d).replace(/\./g, "").split(", ");
  return `${weekday} ${rest ?? ""}`.trim();
}

/**
 * Ventana estimada de entrega en días hábiles (no contempla feriados).
 * Si se pide después del horario de corte o en fin de semana, cuenta desde el próximo día hábil.
 */
export function getDeliveryWindow(now = new Date()) {
  let start = new Date(now);
  if (isWeekend(start) || start.getHours() >= DELIVERY.cutoffHour) {
    start = addBusinessDays(start, 1);
  }
  const from = addBusinessDays(start, DELIVERY.minBusinessDays);
  const to = addBusinessDays(start, DELIVERY.maxBusinessDays);
  return { from: label(from), to: label(to) };
}
