import Link from "next/link";
import type { ReactNode } from "react";
import { POLICIES } from "@/data/business";
import { PageHero } from "./PageHero";

const LEGAL_LINKS = [
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/privacidad", label: "Política de privacidad" },
  { href: "/cambios-y-devoluciones", label: "Cambios, devoluciones y garantía" },
  { href: "/envios", label: "Envíos y pagos" },
  { href: "/arrepentimiento", label: "Botón de arrepentimiento" },
];

export function LegalPage({
  title,
  eyebrow = "Legales",
  current,
  children,
}: {
  title: string;
  eyebrow?: string;
  current: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title}>
        Última actualización: {POLICIES.lastUpdated}
      </PageHero>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Páginas legales" className="lg:sticky lg:top-32 lg:self-start">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href} className="shrink-0">
                <Link
                  href={l.href}
                  aria-current={current === l.href ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest transition ${
                    current === l.href
                      ? "bg-accent text-black"
                      : "text-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="legal max-w-3xl">{children}</article>
      </div>
    </>
  );
}
