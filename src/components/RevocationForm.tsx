"use client";

import { useState, type FormEvent } from "react";
import { BUSINESS } from "@/data/business";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./icons";

const FIELD =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25";

export function RevocationForm() {
  const [sent, setSent] = useState(false);

  function buildMessage(form: HTMLFormElement) {
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) ?? "").trim();
    return [
      "*SOLICITUD DE ARREPENTIMIENTO (revocación de compra)*",
      "",
      `Nombre y apellido: ${get("name")}`,
      `Contacto: ${get("contact")}`,
      `Fecha de entrega: ${get("date")}`,
      `Productos: ${get("products")}`,
      get("reason") ? `Comentario: ${get("reason")}` : "",
      "",
      "Solicito revocar la aceptación de la compra conforme al art. 34 de la Ley 24.240 y la Res. SCI 424/2020. Quedo a la espera del código de identificación de la solicitud.",
    ]
      .filter((l, i, arr) => l !== "" || arr[i - 1] !== "")
      .join("\n");
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    window.open(buildWhatsAppUrl(buildMessage(e.currentTarget)), "_blank", "noopener,noreferrer");
    setSent(true);
  }

  function sendByEmail(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form;
    if (!form || !form.reportValidity()) return;
    const subject = encodeURIComponent("Solicitud de arrepentimiento");
    const body = encodeURIComponent(buildMessage(form).replace(/\*/g, ""));
    window.location.href = `mailto:${BUSINESS.email}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="not-prose space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-ink">Nombre y apellido *</span>
          <input name="name" required autoComplete="name" className={FIELD} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-ink">Teléfono o email *</span>
          <input name="contact" required autoComplete="tel" className={FIELD} />
        </label>
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-ink">Fecha de entrega *</span>
        <input name="date" type="date" required className={FIELD} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-ink">Productos que querés devolver *</span>
        <textarea
          name="products"
          required
          rows={2}
          placeholder="Ej.: Short Mesh Pro talle L negro"
          className={FIELD}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-ink">Comentario (opcional)</span>
        <textarea name="reason" rows={2} className={FIELD} />
      </label>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <button
          type="submit"
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-black transition hover:brightness-110"
        >
          <WhatsAppIcon className="size-5" />
          Enviar por WhatsApp
        </button>
        <button
          type="button"
          onClick={sendByEmail}
          className="flex-1 rounded-full border border-line px-6 py-3.5 text-sm font-bold uppercase tracking-widest transition hover:border-white/40"
        >
          Enviar por email
        </button>
      </div>

      {sent && (
        <p role="status" className="rounded-lg bg-surface-2 px-4 py-3 text-sm text-ink">
          ¡Listo! Enviá el mensaje que se abrió. Dentro de las 24 horas te respondemos por el mismo
          medio con el <strong>código de identificación</strong> de tu solicitud.
        </p>
      )}
    </form>
  );
}
