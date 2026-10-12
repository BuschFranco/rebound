# REBOUND — basketball store con compra por WhatsApp

Tienda de indumentaria y zapatillas de basket hecha con Next.js 16 (App Router, Tailwind CSS 4) y **Supabase** (PostgreSQL) como base de datos del catálogo. Estética oscura con acentos naranja/morado. El cliente arma su carrito (talle, color y cantidad) y al tocar **Comprar por WhatsApp** se abre un chat con el pedido ya escrito. El envío se coordina por chat y se paga al recibir.

**Tienda publicada:** https://reboundstore.netlify.app

## Cómo está armado hoy

| Pieza | Dónde | Notas |
| --- | --- | --- |
| Sitio (Next.js) | **Netlify** → https://reboundstore.netlify.app | Se publica solo con cada push a `main` (`netlify.toml`). |
| Base de datos y fotos | **Supabase en la nube** (proyecto `ryzwqsbbfqjzcyqykglp`) | Catálogo, promos, envíos, banners, pedidos y el bucket `catalog-images`. |
| Panel de administración | **Tu PC** (`admin/iniciar.bat`) | Escribe directo en la base de la nube y avisa al sitio publicado para que se actualice al instante. |
| Código | GitHub → `BuschFranco/rebound` | |

> ⚠️ **Hay una sola base para todo**: el sitio publicado, el sitio en tu PC (`npm run dev`) y el panel usan la misma base de Supabase. Lo que cambies o borres en el panel impacta en la tienda real; no hay un entorno de prueba aparte. Los pedidos de prueba que hagas en tu PC también quedan registrados.

## Puesta en marcha (en tu PC)

Requisitos: Node 22. Docker solo si querés usar la base local de respaldo (ver más abajo).

```bash
npm install
cp .env.local.example .env.local   # completá las variables (ver "Configuración")
npm run dev
```

- Sitio: http://localhost:3000. `npm run dev` avisa en amarillo si la base no responde.
- Base: [supabase.com](https://supabase.com) → tu proyecto → **Table Editor** (aunque lo normal es editar todo desde el panel).

### Base local con Docker (opcional, respaldo)

Para probar sin tocar la base real: poné en `.env.local` (y en `admin/.env`) `SUPABASE_URL=http://127.0.0.1:54321` con las claves locales que muestra `npx supabase status`, y levantá la base con `npm run db:start`. Studio local: http://127.0.0.1:54323. Para volver a la nube, restaurá la URL y las claves del proyecto.

### Comandos de la base local (Docker)

| Comando | Qué hace |
| --- | --- |
| `npm run db:start` | Levanta Supabase en Docker (la primera vez descarga las imágenes). |
| `npm run db:stop` | Apaga los contenedores (los datos se conservan). |
| `npm run db:reset` | Borra la base local y la vuelve a crear con `supabase/migrations` + `supabase/seed.sql`. |
| `npm run db:types` | Regenera `src/lib/database.types.ts` después de cambiar las tablas. |

### Panel de administración (`admin/`)

App de escritorio en Python (CustomTkinter) para manejar todo lo que está en la base sin entrar a Studio:

- **Productos:** alta, edición, **duplicar**, baja (u ocultarlos), **ver en el sitio**, **ajuste masivo de precios por %** (por categoría, con redondeo a 999 y vista previa; en ofertas mantiene el descuento; se puede **deshacer**), **talles agotados** (se ven tachados en la tienda y no se pueden pedir), precio, oferta (precio anterior con el % de descuento), fotos (subir desde la PC o pegar un link, ordenarlas: la primera es la principal), talles, colores, beneficios y fecha de publicación.
- **Categorías:** alta y baja (se bloquea si todavía tiene productos), portada, orden, guía de talles y "Completá el look".
- **Promociones:** crear y eliminar promos de tres tipos, con fechas de inicio y fin (hora de Argentina): **Llevá N, pagá M** (3x2), **descuento en la X unidad** (del mismo producto o en categorías elegidas, ej. 2da al 50%) y **envío gratis** (en productos elegidos, desde un monto o llevando X unidades). La etiqueta se arma sola. Avisa si dos descuentos se superponen. Cada promo tiene su **banner en la home** (línea superior, título, texto, botón e imagen).
- **Banners:** textos e imagen del banner de ofertas de la home. En los dos casos, un campo vacío usa el texto automático (se ve en gris en el campo) y se pueden usar variables: `{etiqueta}` y `{vigencia}` en promos, `{descuento}` y `{cantidad}` en ofertas (`src/lib/banners.ts`, tabla `site_banners`).
- **Envíos:** zonas con costo, envío gratis, demora y las provincias/partidos que cubren (elegidos por nombre, vía Georef).
- **Pedidos:** lo que se envió por WhatsApp en los últimos 7/30/90 días (pedidos, unidades, monto, productos y talles más pedidos). Se registra de forma anónima en la tabla `order_intents` a través de la función `log_order_intent` (el sitio solo puede insertar, no leer); no guarda nombre, teléfono ni dirección.

Cómo abrirlo:

1. Instalá [Python 3.10+](https://www.python.org/downloads/) (marcando "Add python.exe to PATH").
2. Doble clic en `admin/iniciar.bat`. La primera vez instala las dependencias y abre `admin/.env` para completar:
   - `SUPABASE_URL`: `http://127.0.0.1:54321` en local, o la URL del proyecto en la nube.
   - `SUPABASE_SECRET_KEY`: en local, `npx supabase status` → `SECRET_KEY`. En la nube, Project Settings → API Keys → Secret keys.
   - `SITE_URL` y `REVALIDATE_SECRET`: si se dejan vacíos, se toman del `.env.local` del sitio.
3. Volvé a abrir `iniciar.bat`.

> ⚠️ **La secret key da acceso total a la base.** Va solo en `admin/.env` (no se sube a git). **Nunca** la pongas en el sitio ni en Netlify.

- Las fotos se achican a 1600 px, se guardan en webp y se suben al bucket público `catalog-images` del Storage de Supabase. Al borrar un producto o cambiar una foto, se borran del bucket las que ya no usa nadie.
- Al guardar, el panel llama a `/api/revalidate/` y el sitio muestra el cambio en la siguiente visita. Si el sitio no responde, igual lo muestra en menos de 1 minuto.

### Cómo funciona el catálogo

- Tablas `categories` y `products` (ver `supabase/migrations/`). Para ocultar un producto sin borrarlo: `active = false`. La fecha de publicación (`published_at`) define si se muestra como "Nuevo".
- El sitio lee con la clave **publishable**: las políticas RLS solo permiten *leer* productos activos y categorías. Las altas y cambios se hacen desde el panel de administración (o Studio).
- `src/lib/catalog.ts` trae el catálogo en el servidor. Next.js lo cachea y lo vuelve a consultar **como máximo cada 60 s**; los componentes del navegador lo reciben por `CatalogContext`.
- Para ver un cambio al instante: `POST /api/revalidate/` con el header `x-revalidate-secret: <REVALIDATE_SECRET>`. En producción conviene automatizarlo con un *Database Webhook* de Supabase (ver Deploy).

### Promociones y reglas de categorías

- **Promociones** (tabla `promotions`, se manejan desde el panel): `kind` = `nxm` (`buy`/`pay`), `nth_discount` (`nth`, `percent`, `scope` = `same_product` o `categories` + `category_slugs`) o `free_shipping` (`shipping_rule` = `products` + `product_ids`, `min_amount` o `min_units`), con `label`, `starts_at` / `ends_at` (fechas fijas, iguales para todos) y `active`.
  - **Pueden convivir varias.** Las de envío gratis se suman a los descuentos; si hay varios descuentos vigentes **no se acumulan**: el carrito aplica el que más ahorra y lo dice.
  - El motor está en `src/lib/promo.ts` y lo usan el carrito y el servidor (`/api/cart/quote/` recalcula todo con la hora del servidor antes de abrir WhatsApp).
  - En el sitio: barra superior (1–2 promos + "+N"), hero y banner (la principal + chips con las demás), marquesina, chips en las tarjetas, un bloque por promo en la ficha, aviso de cantidad, carrito (descuento aplicado, próxima oportunidad y envío gratis), mensaje de WhatsApp, preguntas frecuentes y Términos (una cláusula por promo). Las programadas aparecen solas al empezar y desaparecen al terminar.
- **Productos en oferta:** precio anterior en `products.compare_at_price`.
- **"Nuevo":** se calcula solo con `products.published_at`: un producto es nuevo durante 45 días desde que se publica (`NEW_PRODUCT_DAYS` en `src/data/business.ts`). Aparece la etiqueta "Nuevo". La sección "Drop nuevo" de la home muestra siempre los 4 últimos publicados (y el catálogo tiene el orden "Más nuevos").
- **Categorías** (`categories`): además de nombre, imagen y orden, `size_guide` (`apparel` = guía por altura/peso, `shoes` = por largo de pie, `none` = sin guía) y `complements` (qué categorías sugerir en "Completá el look").

### Envíos por zona

- Tablas `shipping_zones` (nombre, precio, envío gratis desde, plazo) y `shipping_zone_areas` (qué partidos/comunas cubre cada zona, con los ids oficiales de [Georef](https://apis.datos.gob.ar/georef)). Una zona puede cubrir una provincia entera (`departamento_id` vacío) o un partido puntual; gana el partido.
- Los precios del seed son **de ejemplo**: ajustalos en Studio → `shipping_zones`. La página `/envios` muestra la tabla automáticamente.
- En el carrito, la primera sección **Dirección de entrega** tiene la localidad (sugerencias de Georef vía `/api/localidades/` o "Usar mi ubicación" vía `/api/ubicacion/`) y, opcionalmente, calle, número, piso/depto, CP, referencias y quién recibe. Con **Guardar** queda en el `localStorage` (`rebound-address-v1`), no en cookie: el servidor no la necesita. Si está cargada, va completa en el mensaje de WhatsApp; si no, queda para completar en el chat.

### Carrito sin registro

- Se guarda en el `localStorage` del navegador (`rebound-cart-v3`): producto, talle, color, cantidad y el precio que vio el cliente. Se sincroniza entre pestañas y se descarta si no se usa durante 30 días.
- Precio, nombre y disponibilidad salen siempre de la base. Si un precio cambió o un producto/talle/color ya no existe, el carrito lo avisa ("subió de $X a $Y", "sacamos X porque ya no está disponible") y se actualiza al cerrarlo.
- Al tocar **Comprar por WhatsApp**, `/api/cart/quote/` vuelve a leer productos y zonas de la base **sin caché**. Si algo cambió desde que se cargó la página, muestra el total actualizado y pide confirmar antes de abrir WhatsApp.

## Configuración (`.env.local`)

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número que recibe los pedidos, formato internacional sin `+` (ej. `5491112345678`). |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio; se usa para los links a cada producto dentro del mensaje. Si está vacía, se usa el dominio actual. |
| `SUPABASE_URL` | URL del proyecto de Supabase: `https://ryzwqsbbfqjzcyqykglp.supabase.co` (local con Docker: `http://127.0.0.1:54321`). |
| `SUPABASE_PUBLISHABLE_KEY` | Clave **publishable** del proyecto (Project Settings → API Keys). Es pública: solo permite leer gracias a RLS. |
| `REVALIDATE_SECRET` | Clave para `/api/revalidate/`. Larga y aleatoria; **la misma** en `.env.local`, en `admin/.env` y en Netlify. |

El panel tiene su propio archivo, `admin/.env` (no se sube a git): `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (la *secret key* del proyecto, acceso total: nunca en el sitio ni en Netlify), `SITE_URL=https://reboundstore.netlify.app` y el mismo `REVALIDATE_SECRET`.

## Dónde tocar

- **Productos y categorías:** en la base (Supabase Studio → Table Editor). Datos iniciales: `supabase/seed.sql`; estructura: `supabase/migrations/`
- **Texto del mensaje de WhatsApp:** `src/lib/whatsapp.ts`
- **Colores (tokens), gradiente de marca y tipografías (Anton + Inter):** `src/app/globals.css` y `src/app/layout.tsx`
- **Logo e isotipo:** `src/components/Logo.tsx` (usa `src/app/logo.png`) y el favicon `src/app/icon.png`
- **Imágenes del hero y banner:** `HERO_IMAGE` / `BANNER_IMAGE` en `src/data/site.ts`
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
| Precios finales en pesos con IVA incluido, vigencia de promociones | Ley 24.240 art. 7 · Ley 22.802 | ✅ (la promo tiene fechas fijas iguales para todos: tabla `promotions`) |
| IVA contenido discriminado en la factura | Ley 27.743 (Transparencia Fiscal) | ⚠️ Se cumple en el comprobante que emitís, no en la web |

Antes de lanzar también conviene: inscripción en ARCA (monotributo o RI) e Ingresos Brutos (ARBA/AGIP), registrar la marca en el INPI, inscribir la base de datos de clientes ante la AAIP, reemplazar las fotos de ejemplo por fotos propias y hacer revisar los textos legales por un abogado.

## Producción (Netlify + Supabase)

Ya está configurado. El plan gratis de Netlify permite sitios comerciales y corre Next.js con servidor (APIs del carrito, refresco del catálogo e imágenes). GitHub Pages no sirve: solo publica archivos fijos, sin servidor. El plan gratis de Vercel es solo para uso no comercial.

### Publicar cambios del código

Cada push a `main` publica una versión nueva en Netlify (tarda un par de minutos; se ve en *Deploys*). Si falta una variable, el número de WhatsApp es el de ejemplo o la URL apunta a localhost, **el build falla** con la lista de lo que hay que corregir y queda online la versión anterior (`src/lib/env.ts`).

### Variables en Netlify

*Site configuration → Environment variables*:

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL` | `https://ryzwqsbbfqjzcyqykglp.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | la *publishable key* del proyecto |
| `REVALIDATE_SECRET` | la misma que en `.env.local` y `admin/.env` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | el número que recibe los pedidos (sin `+`, espacios ni guiones) |
| `NEXT_PUBLIC_SITE_URL` | `https://reboundstore.netlify.app` (o tu dominio propio, si conectás uno) |

La *secret key* de Supabase y la contraseña de la base **no** van en Netlify. Después de cambiar una variable: *Deploys → Trigger deploy*.

### Cambios en la base (migraciones)

Las tablas se definen en `supabase/migrations/`. Si se agrega una migración nueva, hay que aplicarla en la nube (pide la contraseña de la base; la corrés vos):

```bash
npx supabase db push --db-url "postgresql://postgres:TU_CONTRASEÑA@db.ryzwqsbbfqjzcyqykglp.supabase.co:5432/postgres"
```

- Si no conecta (la conexión directa es solo IPv6), usá la cadena del **Session pooler** del botón *Connect* de Supabase.
- `--include-seed` vuelve a cargar los datos de ejemplo de `supabase/seed.sql`: **no** lo uses en una base con datos reales.
- Después de cambiar tablas: `npm run db:types` (regenera `src/lib/database.types.ts`; con la base local levantada).

### Cambios hechos desde Supabase Studio (opcional)

El panel ya avisa al sitio al guardar. Si editás directo en Studio, los cambios aparecen en hasta 1 minuto; para que sea al instante, en *Database → Webhooks* creá uno para `INSERT`, `UPDATE` y `DELETE` en `products`, `categories`, `promotions`, `site_banners`, `shipping_zones` y `shipping_zone_areas` que haga `POST` a `https://reboundstore.netlify.app/api/revalidate/` con el header `x-revalidate-secret`.
