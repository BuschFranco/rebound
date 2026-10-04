# REBOUND — basketball store con compra por WhatsApp

Tienda de indumentaria y zapatillas de basket hecha con Next.js 16 (App Router, Tailwind CSS 4). Estética oscura con acentos naranja/morado. El cliente arma su carrito (talle, color y cantidad) y al tocar **Comprar por WhatsApp** se abre un chat con el pedido ya escrito. El envío se coordina por chat y se paga al recibir.

## Puesta en marcha

```bash
npm install
cp .env.local.example .env.local   # y completá tu número
npm run dev
```

## Configuración (`.env.local`)

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número que recibe los pedidos, formato internacional sin `+` (ej. `5491112345678`). |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio; se usa para los links a cada producto dentro del mensaje. Si está vacía, se usa el dominio actual. |

## Dónde tocar

- **Productos y categorías:** `src/data/products.ts`
- **Texto del mensaje de WhatsApp:** `src/lib/whatsapp.ts`
- **Colores (tokens), gradiente de marca y tipografías (Anton + Inter):** `src/app/globals.css` y `src/app/layout.tsx`
- **Logo e isotipo:** `src/components/Logo.tsx` y `src/app/icon.svg`
- **Imágenes del hero y banner:** `HERO_IMAGE` / `BANNER_IMAGE` en `src/data/products.ts`
- **Carrito (persistido en `localStorage`):** `src/lib/cartStore.ts` + `src/context/CartContext.tsx`

## Páginas

- `/` — Home (hero, marquesina, categorías, drop nuevo, banner, ofertas)
- `/catalogo` — Catálogo (camisetas, shorts, zapatillas, buzos, camperas, accesorios) con filtros `?categoria=`, búsqueda `?q=` y orden `?orden=`
- `/ofertas` — Productos con descuento
- `/producto/[slug]` — Detalle con selector de talle y color

## Legales (Argentina)

Páginas incluidas: `/terminos`, `/privacidad`, `/cambios-y-devoluciones`, `/envios` y `/arrepentimiento`. Los datos del negocio y las políticas (días de cambio, zonas de envío, vigencia de promos) se editan en un solo lugar: `src/data/business.ts`.

| Requisito | Norma | Estado |
| --- | --- | --- |
| Botón de arrepentimiento visible desde el inicio, sin registro, código en 24 h | Res. SCI 424/2020 · Ley 24.240 art. 34 | ✅ Footer + `/arrepentimiento` (el código lo enviás vos por el mismo medio) |
| Link "Defensa de las y los Consumidores. Para reclamos ingrese aquí" | Res. SCI 274/2021 | ✅ Footer |
| Garantía legal de 6 meses por fallas (productos nuevos) | Ley 24.240 art. 11 | ✅ + cambio gratis 30 días como beneficio extra |
| Identificación del proveedor (razón social, CUIT, domicilio, contacto) | Ley 24.240 · Res. 21/2004 | ⚠️ Completar en `business.ts` |
| QR de Data Fiscal (Formulario 960/D) | ARCA | ⚠️ Generarlo en ARCA y cargar link + imagen en `business.ts` |
| Política de privacidad y leyenda de la AAIP | Ley 25.326 · Disp. 10/2008 | ✅ `/privacidad` |
| Precios finales en pesos con IVA incluido, vigencia de promociones | Ley 24.240 art. 7 · Ley 22.802 | ✅ (actualizá `promoFrom` / `promoTo`) |
| IVA contenido discriminado en la factura | Ley 27.743 (Transparencia Fiscal) | ⚠️ Se cumple en el comprobante que emitís, no en la web |

Antes de lanzar también conviene: inscripción en ARCA (monotributo o RI) e Ingresos Brutos (ARBA/AGIP), registrar la marca en el INPI, inscribir la base de datos de clientes ante la AAIP, reemplazar las fotos de ejemplo por fotos propias y hacer revisar los textos legales por un abogado.

## Deploy (GitHub Pages)

Cada push a `main` compila el sitio como estático (`output: "export"`) y lo publica con GitHub Actions (`.github/workflows/deploy.yml`) en `https://<usuario>.github.io/rebound/`.

- El número de WhatsApp se toma de la variable del repo **`WHATSAPP_NUMBER`** (Settings → Secrets and variables → Actions → Variables).
- El catálogo filtra en el navegador y las imágenes se redimensionan vía Unsplash (`src/lib/imageLoader.ts`), porque GitHub Pages no tiene servidor.
- Para probar el build estático en local: `NEXT_PUBLIC_BASE_PATH=/rebound npm run build` y servir la carpeta `out/` bajo `/rebound/`.
