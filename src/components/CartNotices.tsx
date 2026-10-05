import type { CartNotice } from "@/lib/cartValidation";
import { formatPrice } from "@/lib/format";

const REMOVED_TEXT = {
  unavailable: "ya no está disponible",
  size: "ya no tiene el talle que elegiste",
  color: "ya no tiene el color que elegiste",
} as const;

/** Cambios desde la última visita: precios que se movieron y productos que se sacaron del carrito. */
export function CartNotices({ notices, title = "Actualizamos tu carrito" }: { notices: CartNotice[]; title?: string }) {
  if (notices.length === 0) return null;
  return (
    <div role="status" className="border-b border-line bg-accent/10 px-5 py-3 text-sm">
      <p className="font-semibold text-ink">⚠️ {title}</p>
      <ul className="mt-1 space-y-0.5 text-xs text-muted">
        {notices.map((n) =>
          n.type === "price" ? (
            <li key={`p-${n.key}`}>
              <strong className="text-ink">{n.name}</strong> {n.to > n.from ? "subió" : "bajó"} de{" "}
              <span className="line-through">{formatPrice(n.from)}</span> a{" "}
              <strong className={n.to > n.from ? "text-accent" : "text-whatsapp"}>{formatPrice(n.to)}</strong>.
            </li>
          ) : (
            <li key={`r-${n.key}`}>
              Sacamos <strong className="text-ink">{n.name ?? "un producto"}</strong> porque {REMOVED_TEXT[n.reason]}.
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
