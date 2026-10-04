import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-glow">
      <div className="mx-auto max-w-xl px-4 py-32 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-accent">Error 404</p>
        <h1 className="text-gradient mt-3 font-display text-8xl uppercase italic leading-none sm:text-9xl">
          Airball
        </h1>
        <p className="mt-6 text-muted">
          Este tiro no entró: la página no existe o el producto ya no está disponible.
        </p>
        <Link
          href="/catalogo"
          className="mt-8 inline-block rounded-full bg-accent px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-black transition hover:brightness-110"
        >
          Volver al catálogo
        </Link>
      </div>
    </div>
  );
}
