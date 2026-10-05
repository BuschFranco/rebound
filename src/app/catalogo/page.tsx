import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView } from "@/components/CatalogView";
import { PageHero } from "@/components/PageHero";
import { pageMetadata } from "@/lib/seo";

// Los filtros (?categoria=, ?q=) se resuelven en el navegador: todas las variantes comparten esta URL canónica.
export const metadata: Metadata = pageMetadata({
  title: "Catálogo",
  description:
    "Camisetas, shorts, zapatillas, buzos, camperas y accesorios de basket. Armá tu pedido y pagá al recibir.",
  path: "/catalogo/",
});

export default function CatalogPage() {
  return (
    <Suspense fallback={<PageHero eyebrow="Toda la colección" title="Catálogo" />}>
      <CatalogView />
    </Suspense>
  );
}
