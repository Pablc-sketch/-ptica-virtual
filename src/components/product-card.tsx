"use client";

import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog-types";
import { clp } from "@/lib/format";
import { toggleFavorite, toggleSelection, useFavorites, useSelection } from "@/lib/local-store";

export function ProductCard({ p, priority = false }: { p: CatalogProduct; priority?: boolean }) {
  const isFav = useFavorites().includes(p.id);
  const inSel = useSelection().some((x) => x.id === p.id);
  const img = p.images[0];
  return (
    <article className="group flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-sage/50">
        <Link href={`/marcos/${p.slug}`} aria-label={`Ver ${p.name}`}>
          <Image
            src={img.url}
            alt={img.alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
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
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {p.brand && <p className="eyebrow">{p.brand}</p>}
          <h3 className="truncate text-lg">
            <Link href={`/marcos/${p.slug}`}>{p.name}</Link>
          </h3>
          <p className="text-sm text-muted">{[p.frameShape, p.material, p.color].filter(Boolean).join(" · ")}</p>
        </div>
        <p className="whitespace-nowrap text-sm">
          {clp(p.priceClp)}
          <span className="block text-right text-[11px] text-muted">solo marco</span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => toggleSelection(p.id)}
        aria-pressed={inSel}
        className={`btn mt-3 ${inSel ? "" : "btn-ghost"}`}
      >
        {inSel ? "En tu selección ✓" : "Agregar a selección"}
      </button>
    </article>
  );
}
