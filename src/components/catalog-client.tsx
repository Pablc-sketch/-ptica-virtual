"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog-types";
import { distinct, filterProducts, type Sort } from "@/lib/catalog-filter";
import { useFavorites } from "@/lib/local-store";
import { ProductCard } from "@/components/product-card";
import { FrameOutline } from "@/components/frame-outline";

export function CatalogClient({ products }: { products: CatalogProduct[] }) {
  const params = useSearchParams();
  return <CatalogControls key={params.toString()} products={products} />;
}

function CatalogControls({ products }: { products: CatalogProduct[] }) {
  const params = useSearchParams();
  const favs = useFavorites();
  const [q, setQ] = useState("");
  const requestedShape = params.get("forma");
  const shapeAliases: Record<string, string[]> = { rectangular: ["rectangular", "rectangulares"], round: ["redondo", "redondos", "round"], "cat-eye": ["cat eye", "cat-eye", "cateye"] };
  const initialShape = products.find(p => p.frameShape && (shapeAliases[requestedShape ?? ""] ?? []).includes(p.frameShape.toLowerCase()))?.frameShape ?? "";
  const [shape, setShape] = useState(initialShape);
  const [material, setMaterial] = useState("");
  const [sort, setSort] = useState<Sort>("recomendado");
  const [onlyFavs, setOnlyFavs] = useState(params.get("favoritos") === "1");

  const shapes = useMemo(() => distinct(products, "frameShape"), [products]);
  const materials = useMemo(() => distinct(products, "material"), [products]);
  const result = useMemo(
    () => filterProducts(products, { q, shape, material, onlyFavs, sort }, favs),
    [products, q, shape, material, onlyFavs, favs, sort],
  );

  const filtered = Boolean(q || shape || material || onlyFavs);
  const clear = () => {
    setQ("");
    setShape("");
    setMaterial("");
    setOnlyFavs(false);
  };

  if (products.length === 0) {
    return (
      <div className="catalog-empty">
        <div><p className="eyebrow">Cada detalle, en su lugar</p><h2>Estamos preparando el catálogo</h2>
        <p>
          Todavía no hay marcos publicados. Solo mostramos un modelo cuando tiene fotografía real
          verificada, precio confirmado y medidas. Vuelve pronto.
        </p>
        <Link href="/como-funciona" className="btn btn-ghost">
          Cómo funciona
        </Link></div><div><FrameOutline /><p className="!text-[10px] text-center">Ilustración de forma · No es un producto a la venta</p></div>
      </div>
    );
  }

  return (
    <>
      <form
        role="search"
        aria-label="Filtrar marcos"
        onSubmit={(e) => e.preventDefault()}
        className="catalog-filter grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]"
      >
        <label className="sr-only" htmlFor="q">Buscar</label>
        <input id="q" className="field" type="search" placeholder="Buscar por nombre, color, material…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="sr-only" htmlFor="shape">Forma</label>
        <select id="shape" className="field" value={shape} onChange={(e) => setShape(e.target.value)}>
          <option value="">Todas las formas</option>
          {shapes.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="sr-only" htmlFor="material">Material</label>
        <select id="material" className="field" value={material} onChange={(e) => setMaterial(e.target.value)}>
          <option value="">Todos los materiales</option>
          {materials.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="sr-only" htmlFor="sort">Ordenar</label>
        <select id="sort" className="field" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="recomendado">Recomendados</option>
          <option value="nombre">Nombre</option>
          <option value="precio">Precio del marco</option>
        </select>
        <label className="flex min-h-11 items-center gap-2 px-1">
          <input type="checkbox" checked={onlyFavs} onChange={(e) => setOnlyFavs(e.target.checked)} className="h-5 w-5 accent-olive" />
          Solo favoritos
        </label>
      </form>

      <p className="mt-4 text-sm text-muted" role="status" aria-live="polite">
        {result.length} {result.length === 1 ? "marco" : "marcos"}
        {filtered && (
          <>
            {" · "}
            <button type="button" onClick={clear} className="underline">Limpiar filtros</button>
          </>
        )}
      </p>

      {result.length === 0 ? (
        <div className="mt-6 border border-line bg-white/60 p-8 text-center">
          <p className="text-lg">{onlyFavs && favs.length === 0 ? "Aún no guardas favoritos." : "Ningún marco coincide con tu búsqueda."}</p>
          <button type="button" onClick={clear} className="btn btn-ghost mt-4">Limpiar filtros</button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {result.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
        </div>
      )}
    </>
  );
}
