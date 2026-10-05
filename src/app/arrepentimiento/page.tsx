import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { RevocationForm } from "@/components/RevocationForm";
import { POLICIES } from "@/data/business";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Botón de arrepentimiento",
  description: "Cancelá tu compra dentro de los 10 días de recibida, sin costo y sin registrarte.",
  path: "/arrepentimiento/",
});

export default function RevocationPage() {
  return (
    <LegalPage title="Botón de arrepentimiento" eyebrow="Cancelar una compra" current="/arrepentimiento">
      <p>
        Tenés <strong>{POLICIES.revocationDays} días corridos desde que recibiste tu pedido</strong>{" "}
        para cancelar la compra, sin dar motivos y <strong>sin ningún costo</strong> (Ley 24.240
        art. 34 y Res. SCI 424/2020). No necesitás registrarte ni hacer ningún otro trámite.
      </p>
      <ul>
        <li>Nosotros retiramos el producto en tu domicilio sin cargo.</li>
        <li>Te devolvemos el total que pagaste, con el mismo medio de pago.</li>
        <li>
          Dentro de las 24 horas te enviamos, por el mismo medio, el{" "}
          <strong>código de identificación</strong> de tu solicitud.
        </li>
      </ul>

      <RevocationForm />

      <p className="mt-6 text-sm">
        ¿Querés cambiar el talle o el color en lugar de cancelar? Mirá{" "}
        <Link href="/cambios-y-devoluciones">Cambios y devoluciones</Link>.
      </p>
    </LegalPage>
  );
}
