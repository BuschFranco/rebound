import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { BUSINESS, POLICIES } from "@/data/business";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cambios, devoluciones y garantía",
  description: "Cambio gratis dentro de los 30 días y garantía legal de 6 meses por fallas en productos nuevos.",
  path: "/cambios-y-devoluciones/",
});

export default function ReturnsPage() {
  return (
    <LegalPage title="Cambios y devoluciones" eyebrow="Garantía" current="/cambios-y-devoluciones">
      <p className="callout">
        <strong>Cambio gratis dentro de los {POLICIES.exchangeDays} días</strong> ·{" "}
        <strong>devolución o cambio sin costo por fallas o daños</strong> ·{" "}
        <strong>garantía legal de {POLICIES.legalWarrantyMonths} meses</strong> ·{" "}
        <strong>{POLICIES.revocationDays} días para arrepentirte</strong>
      </p>

      <h2>1. Cambio sin cargo ({POLICIES.exchangeDays} días)</h2>
      <p>
        Si el talle no te quedó bien o preferís otro color o modelo, podés cambiarlo{" "}
        <strong>gratis</strong> dentro de los {POLICIES.exchangeDays} días corridos desde que lo
        recibiste.
      </p>
      <ul>
        <li>El producto tiene que estar sin uso, con sus etiquetas y en su empaque original.</li>
        <li>
          Coordinamos el retiro y la entrega del nuevo producto sin costo en{" "}
          {POLICIES.shippingAreasShort}.
        </li>
        <li>
          Si el nuevo producto tiene otro precio, se paga o se devuelve la diferencia al momento
          del cambio.
        </li>
        <li>
          Por razones de higiene, las medias no tienen cambio por talle una vez abiertas (sí por
          falla).
        </li>
      </ul>

      <h2>2. Productos con fallas o daños</h2>
      <p>
        Si un producto llega dañado, con una falla de fabricación o distinto de lo que pediste, lo{" "}
        <strong>cambiamos o te devolvemos el dinero, a tu elección y sin ningún costo</strong>
        (incluidos los gastos de retiro y envío).
      </p>
      <p>
        Todos nuestros productos tienen la <strong>garantía legal de{" "}
        {POLICIES.legalWarrantyMonths} meses</strong> desde la entrega que establece el artículo 11
        de la Ley 24.240 de Defensa del Consumidor, por defectos o vicios de cualquier tipo. Dentro
        de ese plazo podés pedir la reparación, el cambio por otro igual o la devolución del dinero
        (art. 17). La garantía no cubre el desgaste normal por uso ni los daños por uso indebido.
      </p>

      <h2>3. Derecho de arrepentimiento ({POLICIES.revocationDays} días)</h2>
      <p>
        Como la compra es a distancia, tenés derecho a <strong>revocar la compra</strong> dentro de
        los {POLICIES.revocationDays} días corridos desde que recibiste el producto,{" "}
        <strong>sin dar explicaciones y sin ningún costo</strong> (Ley 24.240 art. 34 y Código
        Civil y Comercial arts. 1110 a 1116). Nosotros nos hacemos cargo del retiro y te
        devolvemos el total pagado, con el mismo medio con el que pagaste.
      </p>
      <p>
        Podés hacerlo desde el <Link href="/arrepentimiento">Botón de arrepentimiento</Link>, sin
        registrarte. Dentro de las 24 horas te enviamos el código de identificación de tu
        solicitud.
      </p>

      <h2>4. Cómo pedir un cambio o devolución</h2>
      <ol>
        <li>
          Escribinos por WhatsApp o a {BUSINESS.email} con tu nombre, la fecha de entrega y el
          producto. Si es por falla, sumá una foto.
        </li>
        <li>Coordinamos el día de retiro en tu domicilio.</li>
        <li>
          Revisamos el producto y te entregamos el cambio o te reintegramos el dinero dentro de los
          10 días hábiles.
        </li>
      </ol>
    </LegalPage>
  );
}
