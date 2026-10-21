"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { useFavorites } from "@/lib/local-store";
import { ProductCard } from "@/components/product-card";

type Sort = "recomendado" | "nombre" | "precio";

const norm = (s: string) => s.toLocaleLowerCase("es").normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function CatalogClient({ products }: { products: CatalogProduct[] }) {
  const params = useSearchParams();
  const favs = useFavorites();
  const [q, setQ] = useState("");
  const [shape, setShape] = useState("");
  const [material, setMaterial] = useState("");
  const [sort, setSort] = useState<Sort>("recomendado");
  const [onlyFavs, setOnlyFavs] = useState(params.get("favoritos") === "1");

  const shapes = useMemo(() => [...new Set(products.map((p) => p.frameShape).filter(Boolean))].sort() as string[], [products]);
  const materials = useMemo(() => [...new Set(products.map((p) => p.material).filter(Boolean))].sort() as string[], [products]);

  const result = useMemo(() => {
    const nq = norm(q.trim());
    const list = products.filter(
      (p) =>
        (!nq || [p.name, p.brand, p.color, p.material, p.frameShape].some((v) => v && norm(v).includes(nq))) &&
        (!shape || p.frameShape === shape) &&
        (!material || p.material === material) &&
        (!onlyFavs || favs.includes(p.id)),
    );
    if (sort === "nombre") list.sort((a, b) => a.name.localeCompare(b.name, "es"));
    if (sort === "precio") list.sort((a, b) => a.priceClp - b.priceClp);
    return list;
  }, [products, q, shape, material, onlyFavs, favs, sort]);

  const filtered = Boolean(q || shape || material || onlyFavs);
  const clear = () => {
    setQ("");
    setShape("");
    setMaterial("");
    setOnlyFavs(false);
  };

  if (products.length === 0) {
    return (
      <div className="border border-line bg-white/60 p-8 text-center">
        <h2 className="text-3xl">Estamos preparando el catálogo</h2>
        <p className="mx-auto mt-3 max-w-[52ch] text-muted">
          Todavía no hay marcos publicados. Solo mostramos un modelo cuando tiene fotografía real
          verificada, precio confirmado y medidas. Vuelve pronto.
        </p>
        <Link href="/como-funciona" className="btn btn-ghost mt-6">
          Cómo funciona
        </Link>
      </div>
    );
  }

  return (
    <>
      <form
        role="search"
        aria-label="Filtrar marcos"
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]"
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
          <input type="checkbox" checked={onlyFavs} onChange={(e) => setOnlyFavs(e.target.checked)} className="h-5 w-5 accent-[#424d3b]" />
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
