import { reverseGeocode } from "@/lib/georef";

/**
 * GET /api/ubicacion/?lat=-34.6&lon=-58.38 → partido/comuna de esas coordenadas.
 * Las coordenadas solo se reenvían a Georef; no se guardan.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({ error: "Coordenadas inválidas." }, { status: 400 });
  }

  try {
    // 3 decimales (~100 m) alcanzan para saber el partido y no hace falta más precisión.
    const location = await reverseGeocode(Number(lat.toFixed(3)), Number(lon.toFixed(3)));
    if (!location) return Response.json({ error: "No encontramos esa ubicación en Argentina." }, { status: 404 });
    return Response.json({ location }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "No pudimos ubicarte en este momento." }, { status: 502 });
  }
}
