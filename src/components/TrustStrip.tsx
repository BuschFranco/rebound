import { DELIVERY, POLICIES } from "@/data/business";
import { CashIcon, TruckIcon } from "./icons";

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M7 7h11l-3-3M17 17H6l3 3" />
    </svg>
  );
}

const ITEMS = [
  { icon: CashIcon, title: "Pagás al recibir", text: "Sin tarjeta ni anticipo", color: "text-accent-2" },
  { icon: SwapIcon, title: `Cambio gratis`, text: `${POLICIES.exchangeDays} días`, color: "text-accent" },
  { icon: TruckIcon, title: "Entrega", text: DELIVERY.label, color: "text-whatsapp" },
];

/** Garantías clave, pegadas al botón de compra para despejar dudas en el momento de decidir. */
export function TrustStrip() {
  return (
    <ul className="grid grid-cols-3 gap-2 text-center">
      {ITEMS.map(({ icon: Icon, title, text, color }) => (
        <li key={title} className="rounded-xl bg-surface-2 px-2 py-3">
          <Icon className={`mx-auto size-5 ${color}`} />
          <p className="mt-1.5 text-[11px] font-bold uppercase leading-tight tracking-wide text-ink">
            {title}
          </p>
          <p className="text-[11px] leading-tight text-muted">{text}</p>
        </li>
      ))}
    </ul>
  );
}
