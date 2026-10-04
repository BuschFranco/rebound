"use client";

import { useSyncExternalStore } from "react";
import { DELIVERY } from "@/data/business";
import { getDeliveryWindow } from "@/lib/delivery";
import { TruckIcon } from "./icons";

const noopSubscribe = () => () => {};

// La fecha depende del momento de la visita, así que se calcula en el navegador
// (el sitio es estático y se generó en otro momento).
const getSnapshot = () => {
  const { from, to } = getDeliveryWindow();
  return `${from}|${to}`;
};
const getServerSnapshot = () => null;

export function DeliveryEstimate({ className = "" }: { className?: string }) {
  const window = useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);
  const [from, to] = window?.split("|") ?? [];

  return (
    <p className={`flex items-start gap-2.5 text-sm ${className}`}>
      <TruckIcon className="mt-0.5 size-5 shrink-0 text-accent" />
      {window ? (
        <span>
          Pedí hoy y <strong className="text-ink">recibilo entre el {from} y el {to}</strong>
          <span className="block text-xs text-muted">En CABA y Provincia de Buenos Aires.</span>
        </span>
      ) : (
        <span>
          Entrega en <strong className="text-ink">{DELIVERY.label}</strong>
          <span className="block text-xs text-muted">En CABA y Provincia de Buenos Aires.</span>
        </span>
      )}
    </p>
  );
}
