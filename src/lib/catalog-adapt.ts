import {frameDesign} from "./frame-design";
import type { CatalogProduct } from "./catalog-types";

export function publicStorageUrl(bucket: "product-images" | "product-models", path: string) {
  if (bucket === "product-images" && /^site\/products\/[a-z0-9-]+\.webp$/.test(path)) return path.slice(4);
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export type Row = {
  id: string;
  slug: string;
  name: string;
  sku?: string | null;
  description: string | null;
  price_clp: number | null;
  pair_base_price_clp?: number | null;
  is_sample?: boolean;
  frame_shape: string | null;
  material: string | null;
  color: string | null;
  gender: string | null;
  lens_width_mm: number | null;
  bridge_mm: number | null;
  temple_mm: number | null;
  brands: { name: string } | { name: string }[] | null;
  product_images: { path: string; alt: string | null; position: number; verified: boolean; kind?: string; variant_id?: string | null; view?: string }[] | null;
  use?: "optical" | "solar";
  product_variants?: { id: string; color_name: string; color_hex: string; color_hex_2: string | null; position: number; status: string }[] | null;
  product_models:
    | { glb_path: string; verified: boolean }
    | { glb_path: string; verified: boolean }[]
    | null;
};

// Adaptador DB -> forma de la UI. Solo se exponen fotos verificadas y modelos GLB verificados.
export function adapt(r: Row): CatalogProduct {
  const brand = Array.isArray(r.brands) ? r.brands[0] : r.brands;
  const model = Array.isArray(r.product_models) ? r.product_models[0] : r.product_models;
  const visible = [...(r.product_images ?? [])]
    .filter((i) => i.verified || (r.is_sample && i.kind === "retouched"))
    .sort((a, b) => a.position - b.position);
  const toImage = (i: (typeof visible)[number]) => ({
    url: publicStorageUrl("product-images", i.path),
    alt: i.alt?.trim() || `${r.name}, fotografía real`,
  });
  // Colores: la foto de frente es por color; el contexto es del modelo.
  const variants = [...(r.product_variants ?? [])]
    .filter((v) => v.status === "published")
    .sort((a, b) => a.position - b.position)
    .map((v) => {
      const front = visible.find((i) => i.variant_id === v.id && (i.view ?? "front") === "front");
      const back = visible.find((i) => i.variant_id === v.id && i.view === "back");
      return { id: v.id, name: v.color_name, hex: v.color_hex, hex2: v.color_hex_2, front: front ? toImage(front) : null, back: back ? toImage(back) : null };
    })
    .filter((v) => v.front);
  const contextImages = visible.filter((i) => !i.variant_id && i.view === "context").map(toImage);
  const images = variants.length
    ? [variants[0].front!, ...(variants[0].back ? [variants[0].back] : []), ...contextImages]
    : visible.filter((i) => !i.variant_id).map(toImage);
  const scenes:Record<string,[string,string][]>= {
    'ovalo-negro':[['soho-ambiente','Soho sobre lino junto al mar'],['soho-cerrado','Soho cerrado sobre madera']],
    'cat-eye-ambar':[['riviera-ambiente','Riviera sobre piedra clara'],['riviera-cerrado','Riviera cerrado sobre madera']],
    'cat-eye-mosaico':[['brera-ambiente','Brera sobre un escritorio'],['brera-angulo','Brera en vista lateral sobre fondo azul']],
  };
  for(const [file,description] of scenes[r.slug]??[])images.push({url:`/products/${file}.webp`,alt:`Imagen ambientada de ${description}`});
  return {
    id: r.id,
    slug: r.slug,
    name: frameDesign(r.slug)?.name ?? r.name,
    sku: null,
    brand: brand?.name ?? null,
    description: r.description,
    priceClp: r.price_clp,
    pairBasePriceClp: r.pair_base_price_clp ?? null,
    isSample: r.is_sample ?? false,
    frameShape: r.frame_shape,
    material: r.material,
    color: r.color,
    gender: r.gender,
    lensWidthMm: r.lens_width_mm,
    bridgeMm: r.bridge_mm,
    templeMm: r.temple_mm,
    images,
    use: r.use ?? frameDesign(r.slug)?.use ?? "optical",
    variants,
    contextImages,
    modelUrl: model?.verified ? publicStorageUrl("product-models", model.glb_path) : null,
  };
}
