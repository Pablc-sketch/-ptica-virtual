import { describe, expect, it } from "vitest";
import { filterProducts, distinct, type Filters } from "../src/lib/catalog-filter";
import type { CatalogProduct } from "../src/lib/catalog-types";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://ejemplo.supabase.co";

const mk = (o: Partial<CatalogProduct>): CatalogProduct => ({
  id: "i", slug: "s", name: "N", sku: null, brand: null, description: null, priceClp: 1000, frameShape: null,
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
  it("encuentra colores de variantes sin duplicar el modelo ni alterar otros filtros", () => {
    const model = mk({ id: "variantes", color: "Negro", frameShape: "Rectangular", variants: [
      { id: "v1", name: "Lila translúcido", hex: "#aaa", hex2: null, front: null },
      { id: "v2", name: "Lila opaco", hex: "#bbb", hex2: null, front: null },
    ] });
    expect(filterProducts([model, ...P], { ...base, q: "LILA TRANSLUCIDO" }, []).map(p => p.id)).toEqual(["variantes"]);
    expect(filterProducts([model], { ...base, q: "lila" }, [])).toHaveLength(1);
    expect(filterProducts([model], { ...base, q: "lila", shape: "Redondo" }, [])).toEqual([]);
    expect(filterProducts([model], { ...base, q: "lila", onlyFavs: true }, [])).toEqual([]);
    expect(filterProducts([model], { ...base, q: "lila", onlyFavs: true }, [model.id])).toEqual([model]);
    expect(model.variants?.map(v => v.name)).toEqual(["Lila translúcido", "Lila opaco"]);
  });
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
  it("las muestras muestran el retoque identificado, sin exponer SKU ni metadatos privados",async()=>{
    const {adapt}=await import('../src/lib/catalog-adapt');
    const row={id:'trial',slug:'trial',name:'Muestra',sku:'PRIVATE-PURCHASE-CODE',description:null,price_clp:null,pair_base_price_clp:28000,is_sample:true,frame_shape:null,material:null,color:null,gender:null,lens_width_mm:null,bridge_mm:null,temple_mm:null,brands:null,product_models:null,product_images:[{path:'site/products/ambar.webp',alt:'Imagen retocada',position:0,verified:false,kind:'retouched'}],supplier_code:'PRIVATE-PURCHASE-CODE'};
    const p=adapt(row);
    expect(p.images[0].url).toBe('/products/ambar.webp');
    expect(p.priceClp).toBeNull();
    expect(p.pairBasePriceClp).toBe(28000);
    expect(JSON.stringify(p)).not.toContain('PRIVATE-PURCHASE-CODE');
    expect(adapt({...row,is_sample:false}).images).toEqual([]);
  });
  it("solo expone fotos verificadas y 3D verificado, nunca drafts de media", async () => {
    const { adapt } = await import("../src/lib/catalog-adapt");
    const p = adapt({
      id: "1", slug: "a", name: "A", sku: null, description: null, price_clp: 1000, frame_shape: null, material: null,
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
    const q = adapt({ id: "2", slug: "b", name: "B", sku: null, description: null, price_clp: 1, frame_shape: null,
      material: null, color: null, gender: null, lens_width_mm: null, bridge_mm: null, temple_mm: null, brands: null,
      product_images: [], product_models: [{ glb_path: "2/m.glb", verified: true }] });
    expect(q.modelUrl).toMatch(/product-models\/2\/m\.glb$/);
    expect(q.images).toEqual([]);
  });
  it("colores: frente y posterior por color, contexto del modelo; borradores de color ocultos", async () => {
    const { adapt } = await import("../src/lib/catalog-adapt");
    const img = (path: string, variant_id: string | null, view: string, position: number) => ({ path: `site/products/${path}.webp`, alt: null, position, verified: false, kind: "retouched", variant_id, view });
    const p = adapt({
      id: "s", slug: "sol-x", name: "X", sku: null, description: null, price_clp: null, pair_base_price_clp: 28000, is_sample: true,
      frame_shape: null, material: null, color: null, gender: "unisex", lens_width_mm: null, bridge_mm: null, temple_mm: null,
      brands: null, product_models: null, use: "solar",
      product_variants: [
        { id: "v2", color_name: "Negro", color_hex: "#111111", color_hex_2: null, position: 2, status: "published" },
        { id: "v1", color_name: "Dorado", color_hex: "#c9a24a", color_hex_2: "#6b4226", position: 1, status: "published" },
        { id: "v3", color_name: "Oculto", color_hex: "#ffffff", color_hex_2: null, position: 3, status: "draft" },
      ],
      product_images: [img("x-negro-f", "v2", "front", 20), img("x-dorado-f", "v1", "front", 10), img("x-dorado-p", "v1", "back", 11),
        img("x-oculto-f", "v3", "front", 30), img("x-contexto", null, "context", 50)],
    });
    expect(p.use).toBe("solar");
    expect(p.variants?.map((v) => v.name)).toEqual(["Dorado", "Negro"]);
    expect(p.variants?.[0].back?.url).toBe("/products/x-dorado-p.webp");
    expect(p.variants?.[1].back).toBeNull();
    expect(p.images.map((i) => i.url)).toEqual(["/products/x-dorado-f.webp", "/products/x-dorado-p.webp", "/products/x-contexto.webp"]);
    expect(JSON.stringify(p)).not.toContain("oculto");
  });
});
