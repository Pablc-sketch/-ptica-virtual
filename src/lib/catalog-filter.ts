import type { CatalogProduct } from "@/lib/catalog-types";

export type Sort = "recomendado" | "nombre" | "precio";
export type Filters = { q: string; shape: string; material: string; onlyFavs: boolean; sort: Sort };

const norm = (s: string) => s.toLocaleLowerCase("es").normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function filterProducts(products: CatalogProduct[], f: Filters, favs: string[]): CatalogProduct[] {
  const nq = norm(f.q.trim());
  const list = products.filter(
    (p) =>
      (!nq || [p.name, p.brand, p.color, p.material, p.frameShape].some((v) => v && norm(v).includes(nq))) &&
      (!f.shape || p.frameShape === f.shape) &&
      (!f.material || p.material === f.material) &&
      (!f.onlyFavs || favs.includes(p.id)),
  );
  if (f.sort === "nombre") list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  if (f.sort === "precio") list.sort((a, b) => a.priceClp - b.priceClp);
  return list;
}

export function distinct(products: CatalogProduct[], key: "frameShape" | "material"): string[] {
  return [...new Set(products.map((p) => p[key]).filter((v): v is string => Boolean(v)))].sort();
}
