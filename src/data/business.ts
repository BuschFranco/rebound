/**
 * Datos legales y comerciales de la tienda.
 * ⚠️ Completá todos los campos marcados con "COMPLETAR" antes de publicar el sitio:
 * la Ley 24.240 y la Res. 21/2004 exigen identificar al proveedor (razón social, CUIT, domicilio y contacto).
 */
export const BUSINESS = {
  brand: "REBOUND",
  legalName: "Franco Busch",
  cuit: "COMPLETAR XX-XXXXXXXX-X",
  taxCondition: "COMPLETAR Monotributo / Responsable inscripto",
  address: "Av. Corrientes 6120, Ciudad Autónoma de Buenos Aires",
  email: "francobusch130@gmail.com",
  /** Horario de atención por WhatsApp y email. */
  hours: "Lunes a viernes de 10 a 18 h",
  /**
   * Formulario 960/D "Data Fiscal" de ARCA (ex AFIP). Lo generás en ARCA → "Formulario 960/D - Data Fiscal"
   * y te da un link + imagen QR. Pegá ambos acá para que se muestren en el footer.
   */
  dataFiscalUrl: "",
  dataFiscalQrImage: "",
} as const;

export const POLICIES = {
  /** Días para cambio sin cargo (talle, color o modelo). */
  exchangeDays: 30,
  /** Garantía legal por fallas: 6 meses para productos nuevos (Ley 24.240, art. 11). */
  legalWarrantyMonths: 6,
  /** Derecho de arrepentimiento en ventas a distancia (Ley 24.240 art. 34, CCyC art. 1110). */
  revocationDays: 10,
  shippingAreas: ["Ciudad Autónoma de Buenos Aires (CABA)", "Provincia de Buenos Aires"],
  shippingAreasShort: "CABA y Provincia de Buenos Aires",
  paymentMethods: ["Efectivo", "Transferencia bancaria"],
  /** Vigencia de las promociones (Ley 22.802 de Lealtad Comercial / Ley 24.240 art. 7): se cuenta desde el primer ingreso de cada visitante (ver PROMO.durationDays). */
  promoValidity: "14 días desde tu primer ingreso al sitio",
  /** Fecha de última actualización de los textos legales. */
  lastUpdated: "5 de octubre de 2026",
} as const;

/**
 * Promo por cantidad: cada `buy` unidades, pagás `pay` (la de menor precio sale gratis).
 * Se combina entre productos, talles, colores y categorías. Poné `enabled: false` para desactivarla.
 * Dura `durationDays` días desde el primer ingreso de cada visitante (se guarda en su navegador);
 * pasado ese plazo la promo se apaga para él (ver src/context/PromoContext.tsx).
 */
export const PROMO = {
  enabled: true,
  buy: 3,
  pay: 2,
  label: "3x2",
  durationDays: 14,
} as const;

/**
 * Plazo estimado de entrega en CABA y Provincia de Buenos Aires, en días hábiles.
 * Los pedidos confirmados antes de `cutoffHour` cuentan desde ese mismo día.
 */
export const DELIVERY = {
  minBusinessDays: 1,
  maxBusinessDays: 3,
  cutoffHour: 14,
  label: "24 a 72 h hábiles",
} as const;

/** Bloque "Detrás de la marca". Reemplazalo por la historia real del equipo. */
export const STORY = {
  title: "Hecho por gente que juega",
  text: "REBOUND nació en las canchas del conurbano: queríamos ropa de basket que aguante el partido del sábado y quede bien en la calle, sin pagar precios de importado. Elegimos cada tela y cada molde, y respondemos cada pedido nosotros mismos. Si algo no está bien, escribinos y lo resolvemos.",
  signature: "El equipo de REBOUND",
} as const;

/** Link obligatorio a la Ventanilla Única Federal de reclamos (Res. SCI 274/2021). */
export const CONSUMER_DEFENSE_URL =
  "https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario";
