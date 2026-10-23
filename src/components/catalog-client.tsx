"use client";

import Link from "next/link";
import {frameDesign} from "@/lib/frame-design";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog-types";
import { distinct, filterProducts, type Sort } from "@/lib/catalog-filter";
import { useFavorites } from "@/lib/local-store";
import { ProductCard } from "@/components/product-card";
import { FrameOutline } from "@/components/frame-outline";

const CATEGORIES: [string, string][] = [["", "Todos"], ["mujer", "Mujer"], ["hombre", "Hombre"], ["sol", "Lentes de sol"], ["filtro-azul", "Filtro de luz azul"]];

export function CatalogClient({ products }: { products: CatalogProduct[] }) {
  const params = useSearchParams();
  return <CatalogControls key={params.toString()} products={products} />;
}

function CatalogControls({ products }: { products: CatalogProduct[] }) {
  const params = useSearchParams();
  const favs = useFavorites();
  const [q, setQ] = useState(params.get("q")??"");
  const [filtersOpen,setFiltersOpen]=useState(params.get("buscar")==="1");
  const requestedShape = params.get("forma");
  const shapeAliases: Record<string, string[]> = { oval: ["oval", "ovalado"], rectangular: ["rectangular", "rectangulares"], round: ["redondo", "redondos", "round"], "cat-eye": ["cat eye", "cat-eye", "cateye"] };
  const initialShape = products.find(p => p.frameShape && (shapeAliases[requestedShape ?? ""] ?? []).includes(p.frameShape.toLowerCase()))?.frameShape ?? (requestedShape ? "__unavailable__" : "");
  const [shape, setShape] = useState(initialShape);
  // Una sola categoría: Mujer / Hombre (ópticos), Lentes de sol, Filtro de luz azul (marcos ópticos).
  // Se aceptan también los enlaces antiguos ?uso=solar|optical y ?genero=mujer|hombre.
  const initialCategory = params.get("categoria") ?? (params.get("uso") === "solar" ? "sol" : params.get("genero") ?? "");
  const [category, setCategory] = useState(CATEGORIES.some(([v]) => v === initialCategory) ? initialCategory : "");
  const usage = category === "sol" ? "solar" : category ? "optical" : "";
  const gender = category === "mujer" || category === "hombre" ? category : "";
  const [material, setMaterial] = useState("");
  const [sort, setSort] = useState<Sort>("recomendado");
  const [onlyFavs, setOnlyFavs] = useState(params.get("favoritos") === "1");

  const shapes = useMemo(() => distinct(products, "frameShape"), [products]);
  const materials = useMemo(() => distinct(products, "material"), [products]);
  const result = useMemo(
    () => filterProducts(products.filter(p=>(!usage||(p.use ?? frameDesign(p.slug)?.use)===usage)&&(!gender||[gender,'unisex',gender==='mujer'?'female':'male',gender==='mujer'?'femenino':'masculino'].includes((p.gender??'').toLowerCase()))), { q, shape, material, onlyFavs, sort }, favs),
    [products, q, shape, material, onlyFavs, favs, sort,usage,gender],
  );

  const filtered = Boolean(q || shape || material || onlyFavs || category);
  const clear = () => {
    setQ("");setCategory("");
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
      <div className="catalog-categories" role="group" aria-label="Categoría">
        {CATEGORIES.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</button>
        ))}
      </div>
      {category === "filtro-azul" && <p className="mt-3 text-sm text-muted">Todos los marcos ópticos pueden llevar filtro de luz azul: elige tu marco y el tratamiento al armar tus lentes.</p>}
      {shapes.length > 0 && (
        <div className="catalog-shapes" role="group" aria-label="Forma">
          <span className="eyebrow">Forma</span>
          <button type="button" aria-pressed={!shape} onClick={() => setShape("")}>Todas</button>
          {shapes.map((s) => <button type="button" key={s} aria-pressed={shape === s} onClick={() => setShape(s)}>{s === "Cat eye" ? "Cat eye · agatados" : s}</button>)}
        </div>
      )}
      <button type="button" onClick={()=>setFiltersOpen(v=>!v)} aria-expanded={filtersOpen} aria-controls="catalog-filters" className="btn btn-ghost catalog-filter-toggle mt-4 w-full">{filtersOpen ? "Cerrar filtros" : filtered ? "Más filtros · filtros activos" : "Más filtros"}</button>
      <form
        id="catalog-filters"
        role="search"
        aria-label="Filtrar marcos"
        onSubmit={(e) => e.preventDefault()}
        className={`catalog-filter ${filtersOpen ? "grid" : "hidden"} mt-4 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-[1fr_auto_2fr_1fr]`}
      >
        <label className="sr-only" htmlFor="material">Material</label>
        <select id="material" className="field" value={material} onChange={(e) => setMaterial(e.target.value)}>
          <option value="">Todos los materiales</option>
          {materials.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="flex min-h-11 items-center gap-2 px-1">
          <input type="checkbox" checked={onlyFavs} onChange={(e) => setOnlyFavs(e.target.checked)} className="h-5 w-5 accent-olive" />
          Solo favoritos
        </label>
        <label className="sr-only" htmlFor="q">Buscar</label>
        <input id="q" className="field" type="search" placeholder="Buscar por nombre o color…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="sr-only" htmlFor="sort">Ordenar</label>
        <select id="sort" className="field" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="recomendado">Recomendados</option>
          <option value="nombre">Nombre</option>
          <option value="precio">Precio inicial</option>
        </select>
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
        <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {result.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
        </div>
      )}
    </>
  );
}
