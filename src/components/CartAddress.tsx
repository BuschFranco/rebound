"use client";

import { useId } from "react";
import { isEmptyAddress } from "@/lib/addressStore";
import type { OrderShipping } from "@/lib/order";
import type { SavedAddress } from "@/types";
import { ShippingLocationPicker } from "./ShippingLocationPicker";

const FIELD =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25";
const LABEL = "mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted";

/**
 * Primera sección del carrito: a dónde enviamos. Todo es opcional (se puede coordinar por WhatsApp).
 * `draft` es lo que se está editando (null = no se está editando); "Guardar" lo persiste en el navegador.
 */
export function CartAddress({
  saved,
  draft,
  onDraftChange,
  onSave,
  onClear,
  shipping,
}: {
  saved: SavedAddress;
  draft: SavedAddress | null;
  onDraftChange: (draft: SavedAddress | null) => void;
  onSave: (address: SavedAddress) => void;
  onClear: () => void;
  shipping: OrderShipping;
}) {
  const id = useId();
  const editing = draft !== null || isEmptyAddress(saved);
  const form = draft ?? saved;
  const set = (patch: Partial<SavedAddress>) => onDraftChange({ ...form, ...patch });

  // Ya guardada: solo una confirmación compacta con "Editar" (los datos van igual en el mensaje).
  if (!editing) {
    return (
      <section aria-labelledby={`${id}-title`} className="border-t border-line px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 id={`${id}-title`} className="text-xs font-bold uppercase tracking-widest">
              Dirección de entrega
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink">
              <span className="grid size-4 place-items-center rounded-full bg-whatsapp text-[10px] font-bold text-black">
                ✓
              </span>
              Ubicación guardada
              {saved.location && <span className="truncate text-xs text-muted">· {saved.location.nombre}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDraftChange(saved)}
            className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-accent transition hover:border-accent"
          >
            Editar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby={`${id}-title`} className="border-t border-line px-5 py-4">
      <h3 id={`${id}-title`} className="text-xs font-bold uppercase tracking-widest">
        Dirección de entrega
      </h3>
      <p className="mt-0.5 text-[11px] text-muted">
        <strong className="font-bold text-accent">Opcional:</strong> también podés coordinarla por WhatsApp.
      </p>

      <form
        className="mt-3 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <ShippingLocationPicker
          location={form.location}
          shipping={shipping}
          onChange={(location) => set({ location })}
        />

        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <div>
            <label htmlFor={`${id}-street`} className={LABEL}>Calle</label>
            <input id={`${id}-street`} value={form.street} onChange={(e) => set({ street: e.target.value })}
              autoComplete="address-line1" maxLength={80} placeholder="Av. Corrientes" className={FIELD} />
          </div>
          <div>
            <label htmlFor={`${id}-number`} className={LABEL}>Número</label>
            <input id={`${id}-number`} value={form.number} onChange={(e) => set({ number: e.target.value })}
              inputMode="numeric" maxLength={10} placeholder="6120" className={FIELD} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`${id}-floor`} className={LABEL}>Piso / Depto</label>
            <input id={`${id}-floor`} value={form.floor} onChange={(e) => set({ floor: e.target.value })}
              autoComplete="address-line2" maxLength={20} placeholder="3 B" className={FIELD} />
          </div>
          <div>
            <label htmlFor={`${id}-cp`} className={LABEL}>Código postal</label>
            <input id={`${id}-cp`} value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value })}
              autoComplete="postal-code" maxLength={10} placeholder="1414" className={FIELD} />
          </div>
        </div>
        <div>
          <label htmlFor={`${id}-notes`} className={LABEL}>Entre calles / referencias</label>
          <input id={`${id}-notes`} value={form.notes} onChange={(e) => set({ notes: e.target.value })}
            maxLength={140} placeholder="Entre Dorrego y Concepción Arenal, timbre 3B" className={FIELD} />
        </div>
        <div>
          <label htmlFor={`${id}-recipient`} className={LABEL}>Nombre de quien recibe</label>
          <input id={`${id}-recipient`} value={form.recipient} onChange={(e) => set({ recipient: e.target.value })}
            autoComplete="name" maxLength={60} placeholder="Nombre y apellido" className={FIELD} />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="submit"
            disabled={isEmptyAddress(form)}
            className="rounded-full bg-accent px-5 py-2 text-xs font-bold uppercase tracking-widest text-black transition hover:brightness-110 disabled:opacity-40"
          >
            Guardar
          </button>
          <div className="flex gap-3 text-xs">
            {draft !== null && !isEmptyAddress(saved) && (
              <button type="button" onClick={() => onDraftChange(null)} className="text-muted underline hover:text-ink">
                Cancelar
              </button>
            )}
            {!isEmptyAddress(saved) && (
              <button type="button" onClick={onClear} className="text-muted underline hover:text-accent">
                Borrar mis datos
              </button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
