import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import { CartDrawer } from "@/components/CartDrawer";
import { FavoritesDrawer } from "@/components/FavoritesDrawer";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SmoothScroll } from "@/components/SmoothScroll";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { CatalogProvider } from "@/context/CatalogContext";
import { getCatalog } from "@/lib/catalog";
import { PromoProvider } from "@/context/PromoContext";
import { BUSINESS } from "@/data/business";
import { JsonLd } from "@/components/JsonLd";
import { SITE_DESCRIPTION } from "@/lib/seo";
import { absoluteUrl, SITE_URL } from "@/lib/site";
import "lenis/dist/lenis.css";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  title: { default: "REBOUND · Basketball Store", template: "%s · REBOUND" },
  description: SITE_DESCRIPTION,
  applicationName: BUSINESS.brand,
  keywords: ["zapatillas de basket", "ropa de basket", "camisetas de basket", "tienda de basket", "Argentina"],
  formatDetection: { telephone: false, email: false, address: false },
  robots: { index: true, follow: true },
  openGraph: { type: "website", locale: "es_AR", siteName: BUSINESS.brand },
};

const SITE_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BUSINESS.brand,
    url: absoluteUrl("/"),
    areaServed: ["Ciudad Autónoma de Buenos Aires", "Provincia de Buenos Aires"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BUSINESS.brand,
    url: absoluteUrl("/"),
    inLanguage: "es-AR",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: absoluteUrl("/catalogo/?q={search_term_string}") },
      "query-input": "required name=search_term_string",
    },
  },
];

export const viewport: Viewport = {
  themeColor: "#0b0a0f",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const catalog = await getCatalog();

  return (
    <html lang="es-AR" className={`${inter.variable} ${anton.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <JsonLd data={SITE_JSON_LD} />
        <SmoothScroll>
          <CatalogProvider catalog={catalog}>
            <PromoProvider>
              <CartProvider>
                <FavoritesProvider>
                  <Header />
                  <main className="flex-1">{children}</main>
                  <Footer categories={catalog.categories} promotion={catalog.promotion} />
                  <CartDrawer />
                  <FavoritesDrawer />
                  <WhatsAppFloat />
                </FavoritesProvider>
              </CartProvider>
            </PromoProvider>
          </CatalogProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
