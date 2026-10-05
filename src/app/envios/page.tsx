import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { BUSINESS, POLICIES } from "@/data/business";
import { getCatalog } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Envíos y pagos",
  description: "Envíos a CABA y Provincia de Buenos Aires en 24 a 72 h hábiles. Pagás al recibir.",
  path: "/envios/",
});

export default async function ShippingPage() {
  const { shippingZones } = await getCatalog();

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
        El costo depende de la zona. En el carrito elegís tu localidad (o tocás &ldquo;Usar mi
        ubicación&rdquo;) y te mostramos el envío y el total <strong>antes de que confirmes la
        compra</strong>. No hay cargos ocultos: el total que confirmás es el total que pagás al recibir.
      </p>
      <div className="not-prose my-6 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-widest text-ink">
            <tr>
              <th className="px-4 py-3 font-semibold">Zona</th>
              <th className="px-4 py-3 font-semibold">Envío</th>
              <th className="px-4 py-3 font-semibold">Plazo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shippingZones.map((z) => (
              <tr key={z.id}>
                <td className="px-4 py-3 font-semibold text-ink">{z.name}</td>
                <td className="px-4 py-3 tabular-nums">
                  {formatPrice(z.price)}
                  {z.freeFrom !== null && (
                    <span className="block text-xs text-whatsapp">Gratis desde {formatPrice(z.freeFrom)}</span>
                  )}
                </td>
                <td className="px-4 py-3">{z.eta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm">
        El envío gratis se calcula sobre el total de productos con las promociones aplicadas.
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
