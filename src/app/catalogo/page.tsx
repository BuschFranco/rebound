import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView } from "@/components/CatalogView";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = { title: "Catálogo" };

export default function CatalogPage() {
  return (
    <Suspense fallback={<PageHero eyebrow="Toda la colección" title="Catálogo" />}>
      <CatalogView />
    </Suspense>
  );
}
