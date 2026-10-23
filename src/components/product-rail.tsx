"use client";

import { useEffect, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog-types";
import { ProductCard } from "@/components/product-card";

// Grupos de 4 marcos que se deslizan solos, con puntos para elegir el grupo (máximo 4 grupos).
// Se pausa al pasar el cursor o al usar el teclado, y respeta "reducir movimiento".
export function ProductRail({ products, label }: { products: CatalogProduct[]; label: string }) {
  const pages: CatalogProduct[][] = [];
  for (let i = 0; i < Math.min(products.length, 16); i += 4) pages.push(products.slice(i, i + 4));
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (pages.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => { if (!document.hidden) setPage((p) => (p + 1) % pages.length); }, 5500);
    return () => clearInterval(t);
  }, [pages.length, paused]);
  if (pages.length === 0) return null;
  return (
    <div className="product-rail" role="group" aria-roledescription="carrusel" aria-label={label}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)}>
      <div className="product-rail-viewport">
        <div className="product-rail-track" style={{ transform: `translateX(-${page * 100}%)` }}>
          {pages.map((group, i) => (
            <div key={i} className="product-rail-page" aria-hidden={i !== page} inert={i !== page} role="group" aria-roledescription="grupo" aria-label={`${i + 1} de ${pages.length}`}>
              {group.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          ))}
        </div>
      </div>
      {pages.length > 1 && (
        <div className="product-rail-dots" aria-label="Elegir grupo de marcos">
          {pages.map((_, i) => (
            <button key={i} type="button" aria-label={`Ver grupo ${i + 1}`} aria-pressed={i === page} onClick={() => { setPage(i); setPaused(true); }}><span /></button>
          ))}
        </div>
      )}
    </div>
  );
}
