"use client";

import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog-types";
import { productPrice } from "@/lib/product-price";
import { frameDesign } from "@/lib/frame-design";
import { CompareButton } from "@/components/compare-button";
import { useState } from "react";
import { toggleFavorite, toggleSelection, useFavorites, useSelection } from "@/lib/local-store";

export function ProductCard({ p, priority = false }: { p: CatalogProduct; priority?: boolean }) {
  const isFav = useFavorites().includes(p.id);
  const inSel = useSelection().some((x) => x.id === p.id);
  const variants = p.variants ?? [];
  const [colorIdx, setColorIdx] = useState(0);
  const variant = variants[colorIdx];
  const img = variant?.front ?? p.images[0];
  const href = `/marcos/${p.slug}${colorIdx > 0 && variant ? `?color=${variant.id}` : ""}`;
  const price = productPrice(p);
  return (
    <article className="product-card group flex flex-col">
      <div className="product-image relative aspect-[4/3] overflow-hidden !bg-white">
        <Link href={href} aria-label={`Ver ${p.name}${variant ? `, ${variant.name}` : ""}`}>
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
          {frameDesign(p.slug)?.collection && <p className="product-collection">{frameDesign(p.slug)!.collection}</p>}
          {p.brand && <p className="eyebrow">{p.brand}</p>}
          <h3 className="truncate text-lg">
            <Link href={href}>{p.name}</Link>
          </h3>
          <p className="text-xs text-muted">{[p.frameShape, variant?.name ?? p.color].filter(Boolean).join(" · ")}</p>
          {variants.length > 1 ? (
            <div className="card-swatches" role="group" aria-label={`Colores de ${p.name}`}>
              {variants.map((v, idx) => (
                <button key={v.id} type="button" aria-pressed={idx === colorIdx} aria-label={v.name} title={v.name} onClick={() => setColorIdx(idx)}
                  onMouseEnter={() => setColorIdx(idx)}>
                  <span aria-hidden="true" style={{ background: v.hex2 ? `linear-gradient(135deg, ${v.hex} 50%, ${v.hex2} 50%)` : v.hex }} />
                </button>
              ))}
            </div>
          ) : <div className="card-swatches" aria-hidden="true" />}
        </div>
        <p className="mt-3 text-sm">
          {price.text}
          <span className="block text-[11px] text-muted">{price.label}</span>
        </p>
      </div>
      {p.use === "solar"
        ? <Link href={href} className="btn mt-3">Ver colores y detalle</Link>
        : <Link href={`/cotizar-receta?marco=${p.slug}`} className="btn mt-3">Elegir cristales</Link>}
      <Link href={`/probador?marco=${p.slug}${variant?`&color=${variant.id}`:""}`} className="rx-change">Probar en mi foto →</Link>
      <button
        type="button"
        onClick={() => toggleSelection(p.id)}
        aria-pressed={inSel}
        className="compare-toggle"
      >
        {inSel ? "En tu selección ✓" : "+ Guardar en selección"}
      </button>
      <CompareButton id={p.id}/>
    </article>
  );
}
