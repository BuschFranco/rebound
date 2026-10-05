import { getCatalog } from "@/lib/catalog";
import { searchLocalidades } from "@/lib/georef";

/** GET /api/localidades/?q=moron → sugerencias de localidades de CABA y Provincia de Buenos Aires. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1 || q.length > 60) return Response.json({ localidades: [] });

  try {
    // Primero CABA y los partidos que tienen zona propia (conurbano): ahí está la mayoría de los pedidos.
    const { shippingZones } = await getCatalog();
    const priorityPartidos = new Set(
      shippingZones.flatMap((z) => z.areas.flatMap((a) => (a.departamentoId ? [a.departamentoId] : []))),
    );
    const localidades = await searchLocalidades(
      q,
      (l) => l.provinciaId === "02" || (l.departamentoId !== null && priorityPartidos.has(l.departamentoId)),
    );
    return Response.json(
      { localidades },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch {
    return Response.json({ error: "No pudimos buscar localidades en este momento." }, { status: 502 });
  }
}
