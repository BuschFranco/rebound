"use client";

import { useRef, useState } from "react";
import type { SizeGuideKind } from "@/types";
import { CloseIcon } from "./icons";

const APPAREL = [
  { size: "S", maxHeight: 172, maxWeight: 68, chest: "92–98" },
  { size: "M", maxHeight: 178, maxWeight: 78, chest: "98–104" },
  { size: "L", maxHeight: 184, maxWeight: 88, chest: "104–110" },
  { size: "XL", maxHeight: 190, maxWeight: 100, chest: "110–116" },
  { size: "XXL", maxHeight: Infinity, maxWeight: Infinity, chest: "116–124" },
];

const SHOES = [
  { size: "39", cm: 25 },
  { size: "40", cm: 25.7 },
  { size: "41", cm: 26.5 },
  { size: "42", cm: 27.2 },
  { size: "43", cm: 28 },
  { size: "44", cm: 28.7 },
  { size: "45", cm: 29.5 },
];

function recommendApparel(height: number, weight: number) {
  const byHeight = APPAREL.findIndex((r) => height <= r.maxHeight);
  const byWeight = APPAREL.findIndex((r) => weight <= r.maxWeight);
  return APPAREL[Math.max(byHeight, byWeight)].size;
}

function recommendShoe(footCm: number) {
  // Se suma ~0,5 cm de holgura para el movimiento del pie al jugar.
  return (SHOES.find((r) => footCm + 0.5 <= r.cm) ?? SHOES[SHOES.length - 1]).size;
}

const FIELD =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25";

/** `kind` sale de la columna `size_guide` de la categoría en la base (ropa, calzado o ninguna). */
export function SizeGuide({
  kind,
  onPick,
}: {
  kind: SizeGuideKind;
  onPick: (size: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [foot, setFoot] = useState("");
  const isShoe = kind === "shoes";

  if (kind === "none") return null;

  const h = Number(height);
  const w = Number(weight);
  const f = Number(foot.replace(",", "."));
  const recommended = isShoe
    ? f >= 20 && f <= 35
      ? recommendShoe(f)
      : null
    : h >= 140 && h <= 230 && w >= 40 && w <= 180
      ? recommendApparel(h, w)
      : null;

  function choose(size: string) {
    onPick(size);
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs font-semibold normal-case tracking-normal text-accent underline underline-offset-2 hover:brightness-110"
      >
        📏 Guía de talles
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm open:animate-[dialog-in_250ms_cubic-bezier(0.22,1,0.36,1)]"
      >
        <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6" data-lenis-prevent>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Tu talle, sin adivinar</p>
              <h2 className="mt-1 font-display text-3xl uppercase italic">Guía de talles</h2>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="grid size-9 place-items-center rounded-full hover:bg-surface-2"
              aria-label="Cerrar guía de talles"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-line bg-surface-2/50 p-4">
            <p className="text-sm font-semibold">
              {isShoe ? "Medí tu pie de talón a punta (en cm)" : "Poné tu altura y tu peso"}
            </p>
            <div className={`mt-3 grid gap-3 ${isShoe ? "" : "grid-cols-2"}`}>
              {isShoe ? (
                <label className="space-y-1">
                  <span className="text-xs text-muted">Largo del pie (cm)</span>
                  <input inputMode="decimal" value={foot} onChange={(e) => setFoot(e.target.value)} placeholder="Ej.: 26,5" className={FIELD} />
                </label>
              ) : (
                <>
                  <label className="space-y-1">
                    <span className="text-xs text-muted">Altura (cm)</span>
                    <input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Ej.: 178" className={FIELD} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted">Peso (kg)</span>
                    <input inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Ej.: 75" className={FIELD} />
                  </label>
                </>
              )}
            </div>
            <div aria-live="polite" className="mt-4 min-h-12">
              {recommended ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-accent-2 px-4 py-3">
                  <p className="text-sm font-semibold text-white">
                    Te recomendamos talle <span className="font-display text-2xl italic">{recommended}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => choose(recommended)}
                    className="rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-black"
                  >
                    Elegir
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted">Completá los datos para ver tu talle recomendado.</p>
              )}
            </div>
          </div>

          <table className="mt-5 w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted">
              <tr>
                <th className="py-2 font-semibold">Talle</th>
                <th className="py-2 font-semibold">{isShoe ? "Largo de pie" : "Contorno de pecho"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isShoe
                ? SHOES.map((r) => (
                    <tr key={r.size} className={r.size === recommended ? "text-accent" : ""}>
                      <td className="py-2 font-semibold">{r.size}</td>
                      <td className="py-2 tabular-nums">{r.cm.toString().replace(".", ",")} cm</td>
                    </tr>
                  ))
                : APPAREL.map((r) => (
                    <tr key={r.size} className={r.size === recommended ? "text-accent" : ""}>
                      <td className="py-2 font-semibold">{r.size}</td>
                      <td className="py-2 tabular-nums">{r.chest} cm</td>
                    </tr>
                  ))}
            </tbody>
          </table>

          <p className="mt-4 text-xs leading-relaxed text-muted">
            {isShoe
              ? "Si estás entre dos talles, elegí el más grande. Medidas orientativas."
              : "¿Entre dos talles? Para un calce holgado, estilo basket, elegí el más grande. Medidas orientativas."}{" "}
            Y si no te queda, el cambio es gratis.
          </p>
        </div>
      </dialog>
    </>
  );
}
