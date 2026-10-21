"use client";

import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog-types";
import { productPrice } from "@/lib/product-price";
import { CompareButton } from "@/components/compare-button";
import { toggleFavorite, toggleSelection, useFavorites, useSelection } from "@/lib/local-store";

export function ProductCard({ p, priority = false }: { p: CatalogProduct; priority?: boolean }) {
  const isFav = useFavorites().includes(p.id);
  const inSel = useSelection().some((x) => x.id === p.id);
  const img = p.images[0];
  const price = productPrice(p);
  return (
    <article className="product-card group flex flex-col">
      <div className="product-image relative aspect-[4/3] overflow-hidden !bg-white">
        <Link href={`/marcos/${p.slug}`} aria-label={`Ver ${p.name}`}>
          <Image
            src={img.url}
            alt={img.alt}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 480px) 50vw, 100vw"
            className="object-contain transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </Link>
        <button
          type="button"
          onClick={() => toggleFavorite(p.id)}
          aria-pressed={isFav}
          aria-label={isFav ? `Quitar ${p.name} de favoritos` : `Guardar ${p.name} en favoritos`}
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center bg-paper/90"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
            <path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10Z" />
          </svg>
        </button>
      </div>
      <div className="product-meta mt-3">
        <div className="min-w-0">
          {p.brand && <p className="eyebrow">{p.brand}</p>}
          <h3 className="truncate text-lg">
            <Link href={`/marcos/${p.slug}`}>{p.name}</Link>
          </h3>
          <p className="text-xs text-muted">{[p.frameShape, p.color].filter(Boolean).join(" · ")}</p>
        </div>
        <p className="mt-3 text-sm">
          {price.text}
          <span className="block text-[11px] text-muted">{price.label}</span>
        </p>
      </div>
      {p.isSample && <p className="mt-2 text-[11px] text-muted">Imagen retocada · disponibilidad por confirmar</p>}
      <button
        type="button"
        onClick={() => toggleSelection(p.id)}
        aria-pressed={inSel}
        className={`btn mt-3 ${inSel ? "" : "btn-ghost"}`}
      >
        {inSel ? "En tu selección ✓" : "Agregar a selección"}
      </button>
      <CompareButton id={p.id}/>
    </article>
  );
}

