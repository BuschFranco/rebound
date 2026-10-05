import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { BUSINESS, POLICIES } from "@/data/business";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Envíos y pagos",
  description: "Envíos a CABA y Provincia de Buenos Aires en 24 a 72 h hábiles. Pagás al recibir.",
  path: "/envios/",
});

export default function ShippingPage() {
  return (
    <LegalPage title="Envíos y pagos" eyebrow="Entregas" current="/envios">
      <h2>Zonas de entrega</h2>
      <p>Por ahora hacemos envíos únicamente a:</p>
      <ul>
        {POLICIES.shippingAreas.map((a) => (
          <li key={a}>
            <strong>{a}</strong>
          </li>
        ))}
      </ul>
      <p>Si estás en otra provincia, escribinos: estamos trabajando para llegar a todo el país.</p>

      <h2>Costo y plazo de entrega</h2>
      <p>
        El costo de envío depende de tu localidad. Te lo informamos por WhatsApp, junto con la
        fecha estimada de entrega, <strong>antes de que confirmes la compra</strong>. No hay cargos
        ocultos: el total que confirmás es el total que pagás al recibir.
      </p>

      <h2>Pago al recibir</h2>
      <p>
        <strong>Solo pagás cuando recibís tu pedido.</strong> No pedimos tarjetas, anticipos ni
        señas. Medios de pago aceptados: {POLICIES.paymentMethods.join(" y ").toLowerCase()}.
      </p>
      <p>
        Al recibir el pedido te entregamos la factura correspondiente. Revisá los productos en el
        momento de la entrega; si algo no está bien, no tenés que pagarlo.
      </p>

      <h2>Si no estás en tu casa</h2>
      <p>
        Coordinamos un nuevo horario sin costo. Si no podemos entregar el pedido después de dos
        intentos coordinados, lo cancelamos sin ningún cargo para vos.
      </p>

      <h2>Atención</h2>
      <p>
        WhatsApp y {BUSINESS.email} · {BUSINESS.hours}.
      </p>
    </LegalPage>
  );
}
