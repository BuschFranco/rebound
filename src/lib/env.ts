/**
 * Revisa las variables de entorno críticas antes de publicar (se llama desde next.config.ts).
 *
 * Sin estas variables el sitio se publica igual pero roto en silencio: sin número de WhatsApp los
 * pedidos abren "compartir con…" en vez de tu chat, y sin la URL del sitio el sitemap, los canonical
 * y los links del mensaje apuntan a localhost. Mejor que el build falle con un mensaje claro.
 */
export function checkProductionEnv(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "production") return;

  const problems: string[] = [];
  const value = (key: string) => env[key]?.trim() ?? "";

  for (const key of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_WHATSAPP_NUMBER", "NEXT_PUBLIC_SITE_URL", "REVALIDATE_SECRET"]) {
    if (!value(key)) problems.push(`${key}: falta`);
  }

  const phone = value("NEXT_PUBLIC_WHATSAPP_NUMBER").replace(/\D/g, "");
  if (phone && (phone.length < 10 || phone.length > 15)) {
    problems.push("NEXT_PUBLIC_WHATSAPP_NUMBER: tiene que ser el número internacional sin + (ej. 5491112345678)");
  }
  // En el deploy real (Netlify) se exige todo lo de producción; en un build local se aceptan valores de prueba.
  const deploying = env.NETLIFY === "true";
  if (deploying && phone === "5491100000000") {
    problems.push("NEXT_PUBLIC_WHATSAPP_NUMBER: es el número de ejemplo, poné el real");
  }
  const siteUrl = value("NEXT_PUBLIC_SITE_URL");
  if (deploying && siteUrl && (!siteUrl.startsWith("https://") || /localhost|127\.0\.0\.1/.test(siteUrl))) {
    problems.push("NEXT_PUBLIC_SITE_URL: tiene que ser la URL pública con https:// (ej. https://rebound.netlify.app)");
  }
  if (deploying && /127\.0\.0\.1|localhost/.test(value("SUPABASE_URL"))) {
    problems.push("SUPABASE_URL: apunta a la base local; usá la URL del proyecto en supabase.com");
  }

  if (problems.length) {
    throw new Error(
      `Variables de entorno con problemas (configuralas en Netlify → Site configuration → Environment variables):\n` +
        problems.map((p) => `  • ${p}`).join("\n"),
    );
  }
}
