import { describe, expect, it } from "vitest";
import { filterProducts, distinct, type Filters } from "../src/lib/catalog-filter";
import type { CatalogProduct } from "../src/lib/catalog-types";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://ejemplo.supabase.co";

const mk = (o: Partial<CatalogProduct>): CatalogProduct => ({
  id: "i", slug: "s", name: "N", brand: null, description: null, priceClp: 1000, frameShape: null,
  material: null, color: null, gender: null, lensWidthMm: null, bridgeMm: null, templeMm: null,
  images: [{ url: "u", alt: "a" }], modelUrl: null, ...o,
});
const P = [
  mk({ id: "1", name: "Ámbar", frameShape: "Redondo", material: "Acetato", color: "Carey", priceClp: 90000 }),
  mk({ id: "2", name: "Basalto", frameShape: "Rectangular", material: "Metal", color: "Negro", priceClp: 50000 }),
  mk({ id: "3", name: "Cedro", frameShape: "Rectangular", material: "Acetato", color: "Oliva", priceClp: 70000 }),
];
const base: Filters = { q: "", shape: "", material: "", onlyFavs: false, sort: "recomendado" };

describe("filterProducts", () => {
  it("combina búsqueda + forma + material", () => {
    expect(filterProducts(P, { ...base, shape: "Rectangular", material: "Acetato" }, []).map((p) => p.id)).toEqual(["3"]);
    expect(filterProducts(P, { ...base, q: "oliva", shape: "Rectangular" }, []).map((p) => p.id)).toEqual(["3"]);
  });
  it("busca sin distinguir tildes ni mayúsculas", () => {
    expect(filterProducts(P, { ...base, q: "AMBAR" }, []).map((p) => p.id)).toEqual(["1"]);
  });
  it("filtra favoritos y distingue de la selección", () => {
    expect(filterProducts(P, { ...base, onlyFavs: true }, ["2"]).map((p) => p.id)).toEqual(["2"]);
    expect(filterProducts(P, { ...base, onlyFavs: true }, [])).toEqual([]);
  });
  it("ordena por precio y nombre sin mutar la entrada", () => {
    expect(filterProducts(P, { ...base, sort: "precio" }, []).map((p) => p.id)).toEqual(["2", "3", "1"]);
    expect(filterProducts(P, { ...base, sort: "nombre" }, []).map((p) => p.id)).toEqual(["1", "2", "3"]);
    expect(P.map((p) => p.id)).toEqual(["1", "2", "3"]);
  });
  it("lista opciones distintas sin vacíos", () => {
    expect(distinct([...P, mk({ id: "4" })], "frameShape")).toEqual(["Rectangular", "Redondo"]);
  });
});

describe("adapt (DB -> UI)", () => {
  it("solo expone fotos verificadas y 3D verificado, nunca drafts de media", async () => {
    const { adapt } = await import("../src/lib/catalog-adapt");
    const p = adapt({
      id: "1", slug: "a", name: "A", description: null, price_clp: 1000, frame_shape: null, material: null,
      color: null, gender: null, lens_width_mm: null, bridge_mm: null, temple_mm: null,
      brands: { name: "Marca" },
      product_images: [
        { path: "1/b.jpg", alt: null, position: 1, verified: true },
        { path: "1/a.jpg", alt: "Alt", position: 0, verified: false },
        { path: "1/c con espacio.jpg", alt: null, position: 2, verified: true },
      ],
      product_models: { glb_path: "1/m.glb", verified: false },
    });
    expect(p.images.map((i) => i.url.split("/").pop())).toEqual(["b.jpg", "c%20con%20espacio.jpg"]);
    expect(p.modelUrl).toBeNull();
    expect(p.brand).toBe("Marca");
    const q = adapt({ id: "2", slug: "b", name: "B", description: null, price_clp: 1, frame_shape: null,
      material: null, color: null, gender: null, lens_width_mm: null, bridge_mm: null, temple_mm: null, brands: null,
      product_images: [], product_models: [{ glb_path: "2/m.glb", verified: true }] });
    expect(q.modelUrl).toMatch(/product-models\/2\/m\.glb$/);
    expect(q.images).toEqual([]);
  });
});
