"use client";

import Link from "next/link";
import { Brand } from "@/components/brand";
import { useEffect, useRef, useState } from "react";
import { useFavorites, useSelection } from "@/lib/local-store";

const NAV = [
  { href: "/marcos", label: "Marcos" },
  { href: "/configurar", label: "Arma tus lentes" },
  { href: "/probador", label: "Probador" },
  { href: "/comparar", label: "Comparar" },
  { href: "/ayuda", label: "Ayuda" },
];

export function SiteHeader() {
  const favs = useFavorites().length;
  const sel = useSelection().length;
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  // Menú móvil: se cierra con Escape (devolviendo el foco al botón) y al hacer clic fuera.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);
  const close = () => setOpen(false);

  return (
    <header className="site-header">
      <div className="container-page flex min-h-[72px] items-center justify-between gap-2 sm:gap-4">
        <Link href="/" aria-label="Óptica Global, Visión sin fronteras, inicio" className="shrink-0">
          <Brand />
        </Link>
        <nav aria-label="Principal" className="site-nav hidden gap-7 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-olive">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions flex items-center">
          <Link href="/marcos?favoritos=1" className="hidden min-h-11 items-center px-2 hover:text-olive sm:flex">
            Favoritos{favs > 0 && <span className="ml-1 text-muted">({favs})</span>}
          </Link>
          <Link href="/mi-cuenta" className="hidden min-h-11 items-center px-2 text-muted hover:text-olive lg:flex">
            Mi cuenta
          </Link>
          <Link href="/cotizar" aria-label={`Selección${sel>0 ? `, ${sel} ${sel === 1 ? "marco" : "marcos"}` : ""}`} className="btn header-selection !min-h-11 !px-3 sm:!px-4">
            <svg className="selection-icon" width="18" height="20" viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M3 7h14l1 13H2L3 7Z"/><path d="M6 8V5a4 4 0 0 1 8 0v3"/></svg><span className="selection-label">Selección</span>{sel > 0 && <span className="header-count">{sel}</span>}
          </Link>
          <div ref={wrap} className="relative lg:hidden">
            <button
              ref={toggle}
              type="button"
              aria-expanded={open}
              aria-controls="menu-movil"
              onClick={() => setOpen((v) => !v)}
              className="flex min-h-11 min-w-11 items-center justify-center border border-line"
            >
              <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path d={open ? "M4 4l12 12M16 4L4 16" : "M3 6h14M3 10h14M3 14h14"} stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            {open && (
              <nav id="menu-movil" aria-label="Menú móvil" className="absolute right-0 top-12 flex w-56 flex-col border border-line bg-paper p-2 shadow-lg">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} onClick={close} className="flex min-h-11 items-center px-3 hover:bg-sage">
                    {n.label}
                  </Link>
                ))}
                <Link href="/mi-cuenta" onClick={close} className="flex min-h-11 items-center px-3 hover:bg-sage">Mi cuenta</Link>
                <Link href="/marcos?favoritos=1" onClick={close} className="flex min-h-11 items-center px-3 hover:bg-sage sm:hidden">
                  Favoritos{favs > 0 && <span className="ml-1 text-muted">({favs})</span>}
                </Link>
              </nav>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
