"use client";

import { useState } from "react";

function ShareIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
    </svg>
  );
}

/**
 * Compartir el producto: en el celular abre el menú nativo (WhatsApp, Instagram…);
 * en la compu copia el link y, si no se puede, abre WhatsApp con el link.
 */
export function ShareButton({ name, path }: { name: string; path: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    const text = `Mirá ${name} en REBOUND`;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text, url });
      } catch {
        // El cliente cerró el menú de compartir: no hace falta avisar nada.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}`, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={share}
        aria-label={`Compartir ${name}`}
        title="Compartir"
        className="grid size-12 shrink-0 place-items-center rounded-full border border-line bg-surface text-white transition hover:border-accent hover:text-accent"
      >
        <ShareIcon className="size-5" />
      </button>
      <span
        role="status"
        className={`pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-black transition-opacity ${
          copied ? "opacity-100" : "opacity-0"
        }`}
      >
        ¡Link copiado!
      </span>
    </div>
  );
}
