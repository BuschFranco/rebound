import type { ShippingLocation } from "@/types";

/**
 * Georef: API oficial de normalización geográfica de Argentina (gratuita, sin clave).
 * https://apis.datos.gob.ar/georef
 */
const GEOREF = "https://apis.datos.gob.ar/georef/api";

/** Provincias donde hacemos envíos: CABA (02) y Buenos Aires (06). */
export const SHIPPING_PROVINCES = ["02", "06"] as const;

type Ref = { id?: string | null; nombre?: string | null };
type GeorefLocalidad = { id: string; nombre: string; provincia: Ref; departamento: Ref };
type GeorefUbicacion = { provincia: Ref; departamento: Ref; municipio: Ref };

async function georef<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${GEOREF}/${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
  if (!res.ok) throw new Error(`Georef respondió ${res.status}`);
  return res.json() as Promise<T>;
}

const LOCALIDAD_FIELDS = "id,nombre,provincia.id,provincia.nombre,departamento.id,departamento.nombre";

const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

type IndexedLocalidad = ShippingLocation & { key: string; partidoKey: string };

/** Pasa de Georef a nuestro formato y saca duplicados (Georef repite localidad y localidad censal). */
function toLocations(localidades: GeorefLocalidad[]): ShippingLocation[] {
  const seen = new Set<string>();
  const results: ShippingLocation[] = [];
  for (const l of localidades) {
    const key = `${l.nombre}|${l.departamento.id}`;
    if (seen.has(key) || !l.provincia.id) continue;
    seen.add(key);
    results.push({
      id: l.id,
      nombre: l.nombre,
      partido: l.departamento.nombre ?? "",
      provincia: l.provincia.nombre ?? "",
      provinciaId: l.provincia.id,
      departamentoId: l.departamento.id ?? null,
    });
  }
  return results;
}

/**
 * Todas las localidades de CABA y Provincia de Buenos Aires (~900), descargadas una vez y cacheadas
 * un día. Georef busca por palabras completas ("mor" no encuentra "Morón"), así que para sugerir
 * mientras se escribe filtramos esta lista nosotros.
 */
async function getLocalidadesIndex(): Promise<IndexedLocalidad[]> {
  const data = await georef<{ localidades: GeorefLocalidad[] }>("localidades", {
    provincia: SHIPPING_PROVINCES.join(","),
    max: "5000",
    campos: LOCALIDAD_FIELDS,
  });
  return toLocations(data.localidades).map((l) => ({ ...l, key: normalize(l.nombre), partidoKey: normalize(l.partido) }));
}

/** Qué tan bien coincide: empieza igual > empieza alguna palabra > partido > contiene. `null` = no coincide. */
function rank(l: IndexedLocalidad, q: string): number | null {
  if (l.key.startsWith(q)) return 0;
  if (l.key.split(" ").some((w) => w.startsWith(q)) || l.key.includes(` ${q}`)) return 1;
  if (l.partidoKey.startsWith(q)) return 2;
  if (l.key.includes(q)) return 3;
  return null;
}

/**
 * Sugerencias de localidades de CABA y Provincia de Buenos Aires mientras se escribe
 * (desde la primera letra, sin importar tildes ni mayúsculas). Si no hay coincidencias,
 * prueba la búsqueda con tolerancia a errores de Georef ("palerno" → Palermo).
 * `priority` decide qué localidades aparecen primero ante igual coincidencia (ej. CABA y conurbano).
 */
export async function searchLocalidades(
  query: string,
  priority: (l: ShippingLocation) => boolean = () => false,
): Promise<ShippingLocation[]> {
  const q = normalize(query);
  if (!q) return [];

  const index = await getLocalidadesIndex();
  const matches = index
    .flatMap((l) => {
      const r = rank(l, q);
      return r === null ? [] : [{ l, r, p: priority(l) ? 0 : 1 }];
    })
    .sort(
      (a, b) =>
        a.r - b.r || a.p - b.p || a.l.nombre.length - b.l.nombre.length || a.l.nombre.localeCompare(b.l.nombre, "es"),
    )
    .slice(0, 8)
    .map(({ l }) => ({
      id: l.id,
      nombre: l.nombre,
      partido: l.partido,
      provincia: l.provincia,
      provinciaId: l.provinciaId,
      departamentoId: l.departamentoId,
    }));
  if (matches.length > 0 || q.length < 4) return matches;

  const fuzzy = await georef<{ localidades: GeorefLocalidad[] }>("localidades", {
    nombre: query,
    provincia: SHIPPING_PROVINCES.join(","),
    max: "12",
    campos: LOCALIDAD_FIELDS,
  });
  return toLocations(fuzzy.localidades).slice(0, 8);
}

/** Partido/comuna a partir de coordenadas. `null` si el punto no está en Argentina. */
export async function reverseGeocode(lat: number, lon: number): Promise<ShippingLocation | null> {
  const { ubicacion } = await georef<{ ubicacion: GeorefUbicacion }>("ubicacion", {
    lat: String(lat),
    lon: String(lon),
  });
  if (!ubicacion?.provincia?.id) return null;
  const partido = ubicacion.departamento?.nombre ?? "";
  return {
    id: `geo-${ubicacion.departamento?.id ?? ubicacion.provincia.id}`,
    nombre: ubicacion.municipio?.nombre || partido || (ubicacion.provincia.nombre ?? ""),
    partido,
    provincia: ubicacion.provincia.nombre ?? "",
    provinciaId: ubicacion.provincia.id,
    departamentoId: ubicacion.departamento?.id ?? null,
  };
}
