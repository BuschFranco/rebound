"use client";

import { useEffect, useId, useRef, useState } from "react";
import { POLICIES } from "@/data/business";
import { formatPrice } from "@/lib/format";
import type { OrderShipping } from "@/lib/order";
import { formatLocation } from "@/lib/shipping";
import type { ShippingLocation } from "@/types";
import { TruckIcon } from "./icons";

const FIELD =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25";

/**
 * Localidad de entrega dentro del carrito: buscador con sugerencias (Georef) o "Usar mi ubicación"
 * (el navegador pide permiso solo si el cliente toca el botón). Muestra zona y costo de envío.
 */
export function ShippingLocationPicker({
  location,
  shipping,
  onChange,
}: {
  location: ShippingLocation | null;
  shipping: OrderShipping;
  onChange: (location: ShippingLocation | null) => void;
}) {
  // Sin localidad se muestra siempre el buscador; con localidad, solo al tocar "Cambiar".
  const [editing, setEditing] = useState(false);
  const [searched, setSearched] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ShippingLocation[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "locating" | "error">("idle");
  const [error, setError] = useState("");
  const listId = useId();
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) return;
    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setStatus("searching");
      try {
        const res = await fetch(`/api/localidades/?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { localidades?: ShippingLocation[]; error?: string };
        if (id !== requestId.current) return;
        if (!res.ok) throw new Error(data.error);
        setResults(data.localidades ?? []);
        setSearched(q);
        setStatus("idle");
      } catch {
        if (id !== requestId.current) return;
        setStatus("error");
        setError("No pudimos buscar localidades. Probá de nuevo en un rato.");
      }
    }, 150);
    return () => window.clearTimeout(timer);
  }, [query]);

  function choose(next: ShippingLocation) {
    onChange(next);
    setEditing(false);
    setQuery("");
    setResults([]);
    setError("");
    setStatus("idle");
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Tu navegador no permite obtener la ubicación. Escribí tu localidad.");
      return;
    }
    setStatus("locating");
    setError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(`/api/ubicacion/?lat=${coords.latitude}&lon=${coords.longitude}`);
          const data = (await res.json()) as { location?: ShippingLocation; error?: string };
          if (!res.ok || !data.location) throw new Error(data.error);
          choose(data.location);
        } catch (e) {
          setStatus("error");
          setError(e instanceof Error && e.message ? e.message : "No pudimos ubicarte. Escribí tu localidad.");
        }
      },
      () => {
        setStatus("error");
        setError("No pudimos acceder a tu ubicación. Escribí tu localidad.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  }

  if (location && !editing) {
    return (
      <div className="rounded-xl border border-line bg-surface-2/60 px-4 py-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-start gap-2">
            <TruckIcon className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              Envío a <strong className="text-ink">{formatLocation(location)}</strong>
              {shipping.status === "ok" && (
                <span className="block text-xs text-muted">
                  {shipping.zoneName} · {shipping.eta}
                </span>
              )}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 text-xs font-semibold text-accent underline underline-offset-2"
          >
            Cambiar
          </button>
        </div>
        {shipping.status === "ok" && shipping.missingForFree > 0 && (
          <p className="mt-2 text-xs text-muted">
            Sumá <strong className="text-accent">{formatPrice(shipping.missingForFree)}</strong> más y el envío es
            gratis.
          </p>
        )}
        {shipping.status === "out-of-zone" && (
          <p className="mt-2 text-xs text-accent">
            Todavía no tenemos envíos a esa zona ({POLICIES.shippingAreasShort}). Podés mandarnos el pedido igual y lo
            vemos por WhatsApp.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface-2/60 p-3">
      <label htmlFor={`${listId}-input`} className="text-xs font-bold uppercase tracking-widest">
        ¿A dónde lo enviamos?
      </label>
      <div className="relative mt-2">
        <input
          id={`${listId}-input`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 1) setResults([]);
          }}
          placeholder="Escribí tu localidad o barrio"
          onKeyDown={(e) => {
            // Está dentro del formulario de dirección: Enter elige la primera sugerencia en vez de guardar.
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (results[0]) choose(results[0]);
          }}
          autoComplete="off"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          className={FIELD}
        />
        {results.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-line bg-surface shadow-2xl"
            data-lenis-prevent
          >
            {results.map((r) => (
              <li key={`${r.id}-${r.departamentoId}`} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => choose(r)}
                  className="block w-full px-3 py-2 text-left text-sm transition hover:bg-surface-2"
                >
                  {r.nombre}
                  <span className="block text-xs text-muted">
                    {r.partido} · {r.provinciaId === "02" ? "CABA" : r.provincia}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {query.trim().length >= 1 && searched === query.trim() && status === "idle" && results.length === 0 && (
        <p className="mt-2 text-xs text-muted">
          No encontramos esa localidad en CABA ni en Provincia de Buenos Aires.
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={status === "locating"}
          className="text-xs font-semibold text-accent underline underline-offset-2 disabled:opacity-60"
        >
          {status === "locating" ? "Buscando tu ubicación…" : "📍 Usar mi ubicación"}
        </button>
        {location && (
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted underline">
            Cancelar
          </button>
        )}
      </div>
      {status === "error" && <p className="mt-2 text-xs text-accent">{error}</p>}
    </div>
  );
}
