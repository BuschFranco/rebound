// Antes de `npm run dev`: avisa si Supabase no responde (por ejemplo, Docker apagado),
// en vez de dejar que el sitio falle con un error genérico de fetch. No bloquea el arranque.
import { existsSync, readFileSync } from "node:fs";

function readEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^["']|["']$/g, "")]),
  );
}

const env = { ...readEnv(".env.local"), ...process.env };
const url = env.SUPABASE_URL;
const key = env.SUPABASE_PUBLISHABLE_KEY;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;

if (!url || !key) {
  console.warn(yellow("⚠ Faltan SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY en .env.local (ver .env.local.example)."));
  process.exit(0);
}

try {
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/categories?select=slug&limit=1`, {
    headers: { apikey: key },
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
} catch (error) {
  const local = /127\.0\.0\.1|localhost/.test(url);
  console.warn(
    yellow(
      `\n⚠ No responde la base de datos (${url}): ${error.message ?? error}\n` +
        (local
          ? "  Abrí Docker Desktop y levantá la base con:  npm run db:start\n"
          : "  Revisá la conexión y que el proyecto de Supabase esté activo.\n") +
        "  El sitio arranca igual, pero el catálogo va a fallar hasta que la base responda.\n",
    ),
  );
}
