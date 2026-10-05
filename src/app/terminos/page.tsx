import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { BUSINESS, CONSUMER_DEFENSE_URL, POLICIES, PROMO } from "@/data/business";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Términos y condiciones",
  description: "Condiciones de compra, precios, promociones, envíos y pagos de REBOUND.",
  path: "/terminos/",
});

export default function TermsPage() {
  return (
    <LegalPage title="Términos y condiciones" current="/terminos">
      <h2>1. Quiénes somos</h2>
      <p>
        Este sitio es operado por <strong>{BUSINESS.legalName}</strong> (&ldquo;{BUSINESS.brand}&rdquo;), con
        domicilio en {BUSINESS.address}. Contacto: {BUSINESS.email} y WhatsApp ({BUSINESS.hours}).
      </p>
      <p>
        Al usar el sitio y enviar un pedido aceptás estos términos. Se aplican junto con la Ley
        24.240 de Defensa del Consumidor, el Código Civil y Comercial de la Nación y demás normas
        vigentes. Nada de lo que dice este documento limita los derechos que esas normas te dan.
      </p>

      <h2>2. Cómo se hace una compra</h2>
      <ol>
        <li>Elegís los productos, el talle, el color y la cantidad, y los agregás al carrito.</li>
        <li>
          Al tocar &ldquo;Comprar por WhatsApp&rdquo; se abre un chat con el detalle del pedido. El
          envío de ese mensaje es una <strong>solicitud de compra</strong>.
        </li>
        <li>
          Te respondemos confirmando stock, el costo de envío a tu domicilio y la fecha estimada de
          entrega. <strong>La compra se perfecciona cuando vos confirmás</strong> con esa
          información.
        </li>
        <li>Te enviamos el comprobante fiscal correspondiente (factura) por WhatsApp o email.</li>
      </ol>

      <h2>3. Precios y promociones</h2>
      <ul>
        <li>
          Los precios están expresados en <strong>pesos argentinos (ARS)</strong> y son precios
          finales, con IVA incluido. El costo de envío no está incluido y se informa antes de
          confirmar la compra.
        </li>
        <li>
          Los descuentos de precio muestran tachado el precio de lista vigente antes de la rebaja y
          rigen mientras el producto permanezca publicado con ese precio.
        </li>
        {PROMO.enabled && (
          <li>
            <strong>Promoción {PROMO.label}:</strong> por cada {PROMO.buy} unidades incluidas en un
            mismo pedido, las {PROMO.buy - PROMO.pay} de menor precio no se cobran. Se combina entre
            todos los productos, talles, colores y categorías, y también con los productos en oferta.
            Vigencia: {POLICIES.promoValidity}; el plazo de {PROMO.durationDays} días corridos se registra en tu
            navegador y se muestra con una cuenta regresiva junto a la promoción. El descuento se calcula sobre
            los precios publicados y se muestra en el carrito y en el mensaje del pedido.
          </li>
        )}
        <li>
          Respetamos el precio publicado al momento en que enviaste tu pedido, aunque cambie
          después (Ley 24.240, art. 7).
        </li>
        <li>
          Las imágenes son ilustrativas. Los colores pueden variar levemente según la pantalla.
        </li>
      </ul>

      <h2>4. Pago</h2>
      <p>
        <strong>Solo se paga al recibir el pedido.</strong> No pedimos tarjetas, anticipos ni
        señas. Medios aceptados al momento de la entrega: {POLICIES.paymentMethods.join(" o ")}.
      </p>

      <h2>5. Envíos</h2>
      <p>
        Hacemos envíos únicamente a <strong>{POLICIES.shippingAreasShort}</strong>. Los detalles
        están en <Link href="/envios">Envíos y pagos</Link>.
      </p>

      <h2>6. Cambios, devoluciones y garantía</h2>
      <ul>
        <li>
          <strong>Cambio sin cargo dentro de los {POLICIES.exchangeDays} días</strong> desde que
          recibís el producto (talle, color o modelo).
        </li>
        <li>
          <strong>Devolución o cambio sin costo por fallas o daños</strong>, con garantía legal de{" "}
          {POLICIES.legalWarrantyMonths} meses (Ley 24.240, art. 11).
        </li>
        <li>
          <strong>Derecho de arrepentimiento:</strong> podés cancelar la compra dentro de los{" "}
          {POLICIES.revocationDays} días corridos desde la entrega, sin dar motivos y sin costo,
          desde el <Link href="/arrepentimiento">Botón de arrepentimiento</Link>.
        </li>
      </ul>
      <p>
        Todo el detalle está en{" "}
        <Link href="/cambios-y-devoluciones">Cambios, devoluciones y garantía</Link>.
      </p>

      <h2>7. Disponibilidad</h2>
      <p>
        Los productos publicados están sujetos a disponibilidad de stock. Si después de recibir tu
        pedido un producto no está disponible, te avisamos antes de confirmar y podés elegir otro
        producto o cancelar sin ningún costo. Como el pago es contra entrega, nunca vas a pagar por
        algo que no recibiste.
      </p>

      <h2>8. Datos personales</h2>
      <p>
        Usamos tus datos solo para gestionar tu pedido. Conocé cómo los tratamos en la{" "}
        <Link href="/privacidad">Política de privacidad</Link>.
      </p>

      <h2>9. Propiedad intelectual</h2>
      <p>
        La marca {BUSINESS.brand}, el logo, los textos y el diseño del sitio pertenecen a su
        titular. No pueden usarse sin autorización.
      </p>

      <h2>10. Reclamos</h2>
      <p>
        Ante cualquier problema escribinos por WhatsApp o a {BUSINESS.email}. También podés
        reclamar ante la autoridad de aplicación a través de la{" "}
        <a href={CONSUMER_DEFENSE_URL} target="_blank" rel="noopener noreferrer">
          Ventanilla Única Federal de Defensa del Consumidor
        </a>
        , o ante la oficina de Defensa del Consumidor de tu jurisdicción (en CABA, la Dirección
        General de Defensa y Protección al Consumidor; en la Provincia, la oficina municipal de tu
        localidad).
      </p>

      <h2>11. Ley aplicable y jurisdicción</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Para cualquier
        controversia vas a poder recurrir a los tribunales que correspondan a tu domicilio, como
        consumidor (Ley 24.240, art. 36, y Código Civil y Comercial, art. 2654).
      </p>

      <h2>12. Cambios en estos términos</h2>
      <p>
        Podemos actualizar estos términos. Los cambios no afectan a pedidos ya enviados: a cada
        compra se le aplican los términos vigentes al momento de hacerla.
      </p>
    </LegalPage>
  );
}
