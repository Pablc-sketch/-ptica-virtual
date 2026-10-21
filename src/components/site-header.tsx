"use client";

import Link from "next/link";
import { useFavorites, useSelection } from "@/lib/local-store";

const NAV = [
  { href: "/marcos", label: "Marcos" },
  { href: "/cristales", label: "Cristales" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/ayuda", label: "Ayuda" },
];

export function SiteHeader() {
  const favs = useFavorites().length;
  const sel = useSelection().length;
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="container-page flex min-h-[72px] items-center justify-between gap-4">
        <Link href="/" className="whitespace-nowrap font-serif text-base tracking-[0.1em] sm:text-2xl sm:tracking-[0.12em]">
          ÓPTICA GLOBAL
        </Link>
        <nav aria-label="Principal" className="hidden gap-8 text-[13px] md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-olive">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 text-[13px]">
          <Link href="/marcos?favoritos=1" className="hidden min-h-11 items-center px-2 hover:text-olive sm:flex">
            Favoritos{favs > 0 && <span className="ml-1 text-muted">({favs})</span>}
          </Link>
          <Link href="/mi-cuenta" className="hidden min-h-11 items-center px-2 text-muted hover:text-olive lg:flex">
            Mi cuenta
          </Link>
          <Link href="/cotizar" className="btn !min-h-11 !px-4">
            Selección{sel > 0 && <span className="ml-1">({sel})</span>}
          </Link>
          <details className="relative md:hidden">
            <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center border border-line">
              <span className="sr-only">Menú</span>
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </summary>
            <nav
              aria-label="Menú móvil"
              className="absolute right-0 top-12 flex w-56 flex-col border border-line bg-paper p-2 shadow-lg"
            >
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="flex min-h-11 items-center px-3 hover:bg-sage">
                  {n.label}
                </Link>
              ))}
              <Link href="/mi-cuenta" className="flex min-h-11 items-center px-3 hover:bg-sage">Mi cuenta</Link>
              <Link href="/marcos?favoritos=1" className="flex min-h-11 items-center px-3 hover:bg-sage sm:hidden">
                Favoritos{favs > 0 && <span className="ml-1 text-muted">({favs})</span>}
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
