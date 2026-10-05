import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { BUSINESS } from "@/data/business";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Política de privacidad",
  description: "Cómo tratamos tus datos personales según la Ley 25.326 de Protección de Datos Personales.",
  path: "/privacidad/",
});

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" current="/privacidad">
      <p>
        En {BUSINESS.brand} cuidamos tus datos personales de acuerdo con la{" "}
        <strong>Ley 25.326 de Protección de los Datos Personales</strong> y sus normas
        reglamentarias. Esta política explica qué datos usamos, para qué y cuáles son tus derechos.
      </p>

      <h2>1. Responsable de los datos</h2>
      <p>
        {BUSINESS.legalName} ({BUSINESS.brand}), con domicilio en {BUSINESS.address}. Email:{" "}
        {BUSINESS.email}.
      </p>

      <h2>2. Qué datos recopilamos</h2>
      <ul>
        <li>
          <strong>Datos que nos das por WhatsApp o email</strong> para gestionar el pedido: nombre,
          teléfono, dirección de entrega y, si lo pedís, los datos para emitir la factura (DNI o
          CUIT).
        </li>
        <li>
          <strong>El contenido de tu pedido</strong>: productos, talles, colores, cantidades y
          montos.
        </li>
      </ul>
      <p>
        El sitio <strong>no tiene registro de usuarios</strong> ni formularios que guarden datos en
        nuestros servidores, y no usamos cookies de publicidad ni de seguimiento.
      </p>

      <h2>3. Almacenamiento local del carrito</h2>
      <p>
        Para que no pierdas tu carrito al recargar la página, el sitio guarda en el almacenamiento
        local de tu navegador (localStorage) los productos elegidos y, si tocás &ldquo;Guardar&rdquo;,
        la dirección de entrega y el nombre de quien recibe, además de la lista de productos que miraste
        (para mostrarte &ldquo;Volvé a verlos&rdquo; y recomendaciones en la página de inicio). Esa información queda solo en tu
        dispositivo y no nos llega a nosotros, salvo que la incluyas en el mensaje de WhatsApp que
        decidís enviar. El carrito se borra solo si no se usa durante 30 días, y la dirección la podés
        eliminar cuando quieras con &ldquo;Borrar mis datos&rdquo; en el carrito, el historial con
        &ldquo;Borrar historial&rdquo; en la página de inicio, o borrando los datos del
        sitio en tu navegador.
      </p>

      <h3>Ubicación</h3>
      <p>
        Solo si tocás <strong>&ldquo;Usar mi ubicación&rdquo;</strong>, el navegador te pide permiso para
        compartirla. Las coordenadas, redondeadas a unos 100 metros, se envían una única vez al servicio
        público Georef (datos.gob.ar) para saber tu partido o comuna y calcular el envío; no se guardan
        en nuestros servidores. Lo mismo ocurre con el texto que escribís en el buscador de localidades.
      </p>

      <h2>4. Para qué usamos tus datos</h2>
      <ul>
        <li>Confirmar el pedido, coordinar la entrega y cobrarlo al recibirlo.</li>
        <li>Emitir el comprobante fiscal que exige la ley.</li>
        <li>Gestionar cambios, devoluciones, garantías y reclamos.</li>
      </ul>
      <p>
        No usamos tus datos para otros fines ni te enviamos publicidad sin tu consentimiento
        expreso.
      </p>

      <h2>5. Con quién los compartimos</h2>
      <p>
        No vendemos ni cedemos tus datos. Solo los compartimos, en la medida necesaria, con:
      </p>
      <ul>
        <li>La empresa o persona que hace la entrega (nombre, teléfono y dirección).</li>
        <li>Organismos públicos cuando una ley lo exija (por ejemplo, ARCA a efectos fiscales).</li>
      </ul>
      <p>
        La conversación del pedido ocurre en WhatsApp, un servicio de Meta Platforms con su propia
        política de privacidad.
      </p>

      <h2>6. Cuánto tiempo los guardamos</h2>
      <p>
        Mientras sea necesario para el pedido, la garantía y los reclamos, y durante los plazos que
        exigen las normas fiscales y contables. Después los eliminamos.
      </p>

      <h2>7. Tus derechos</h2>
      <p>
        Podés pedir <strong>acceder, rectificar, actualizar o suprimir</strong> tus datos
        escribiendo a {BUSINESS.email} o por WhatsApp. Respondemos el pedido de acceso dentro de
        los 10 días corridos y el de rectificación o supresión dentro de los 5 días hábiles (Ley
        25.326, arts. 14 y 16).
      </p>
      <p className="callout">
        El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los
        mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un
        interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº
        25.326. La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control
        de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que
        interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas
        vigentes en materia de protección de datos personales.
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Tomamos medidas razonables para proteger tus datos contra pérdida, acceso no autorizado o
        uso indebido, y solo acceden a ellos las personas que los necesitan para gestionar tu
        pedido.
      </p>

      <h2>9. Cambios en esta política</h2>
      <p>
        Si cambiamos esta política, publicamos la nueva versión en esta página con su fecha de
        actualización.
      </p>
    </LegalPage>
  );
}
