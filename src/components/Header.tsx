"use client";

import { useLenis } from "lenis/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type MouseEvent } from "react";
import { usePromo } from "@/context/PromoContext";
import { POLICIES } from "@/data/business";
import { useOrderedCategories } from "@/context/CatalogContext";
import { CartButton } from "./CartButton";
import { CatalogMenu } from "./CatalogMenu";
import { Logo } from "./Logo";
import { PromoCountdown } from "./PromoCountdown";
import { SearchBar } from "./SearchBar";
import { CloseIcon, MenuIcon } from "./icons";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/catalogo?categoria=zapatillas", label: "Zapatillas" },
  { href: "/ofertas", label: "Ofertas", hot: true },
];

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { promo: promotion } = usePromo();
  const categories = useOrderedCategories();
  const lenis = useLenis();

  /** Inicio y logo: si ya estás en la home, en vez de "navegar" a la misma página, vuelve suave arriba. */
  function onHomeClick(e: MouseEvent<HTMLAnchorElement>) {
    setMenuOpen(false);
    if (pathname !== "/") return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/80 backdrop-blur-xl">
      <div className="bg-accent-2 px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
        {promotion && (
          <>
            {promotion.label} en toda la web · <PromoCountdown className="gap-1" /> ·{" "}
          </>
        )}
        Pagás al recibir · Envíos en CABA y PBA · Cambio gratis {POLICIES.exchangeDays} días
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <button
          type="button"
          className="grid size-10 place-items-center rounded-full hover:bg-surface md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <CloseIcon className="size-6" /> : <MenuIcon className="size-6" />}
        </button>

        <Link href="/" aria-label="REBOUND, ir al inicio" onClick={onHomeClick}>
          <Logo />
        </Link>

        <nav className="ml-8 hidden items-center gap-7 md:flex" aria-label="Principal">
          {NAV.map((item) => {
            const active = pathname === item.href;
            if (item.href === "/catalogo") {
              return <CatalogMenu key={item.href} active={active} />;
            }
            return item.hot ? (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full bg-accent-2 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white transition hover:brightness-110"
              >
                {item.label}
              </Link>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={item.href === "/" ? onHomeClick : undefined}
                className={`relative text-xs font-semibold uppercase tracking-widest transition hover:text-ink ${
                  active ? "text-ink" : "text-muted"
                } after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:bg-accent after:transition-all ${
                  active ? "after:w-full" : "after:w-0 hover:after:w-full"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden w-full max-w-xs md:block">
          <Suspense>
            <SearchBar />
          </Suspense>
        </div>

        <div className="ml-auto md:ml-0">
          <CartButton />
        </div>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <Suspense>
          <SearchBar />
        </Suspense>
      </div>

      {menuOpen && (
        <nav className="border-t border-line px-4 py-2 md:hidden" aria-label="Principal móvil">
          {NAV.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={item.href === "/" ? onHomeClick : () => setMenuOpen(false)}
                className={`block py-3 font-display text-2xl uppercase italic ${item.hot ? "text-accent" : ""}`}
              >
                {item.label}
              </Link>
              {item.href === "/catalogo" && (
                <ul className="-mt-1 mb-2 grid grid-cols-2 gap-2">
                  {categories.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/catalogo?categoria=${c.slug}`}
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted transition hover:border-accent hover:text-ink"
                      >
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}
