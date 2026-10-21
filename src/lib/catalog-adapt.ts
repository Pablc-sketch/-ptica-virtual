import type { CatalogProduct } from "./catalog-types";

export function publicStorageUrl(bucket: "product-images" | "product-models", path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export type Row = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_clp: number;
  frame_shape: string | null;
  material: string | null;
  color: string | null;
  gender: string | null;
  lens_width_mm: number | null;
  bridge_mm: number | null;
  temple_mm: number | null;
  brands: { name: string } | { name: string }[] | null;
  product_images: { path: string; alt: string | null; position: number; verified: boolean }[] | null;
  product_models:
    | { glb_path: string; verified: boolean }
    | { glb_path: string; verified: boolean }[]
    | null;
};

// Adaptador DB -> forma de la UI. Solo se exponen fotos verificadas y modelos GLB verificados.
export function adapt(r: Row): CatalogProduct {
  const brand = Array.isArray(r.brands) ? r.brands[0] : r.brands;
  const model = Array.isArray(r.product_models) ? r.product_models[0] : r.product_models;
  const images = [...(r.product_images ?? [])]
    .filter((i) => i.verified)
    .sort((a, b) => a.position - b.position)
    .map((i) => ({
      url: publicStorageUrl("product-images", i.path),
      alt: i.alt?.trim() || `${r.name}, fotografía real`,
    }));
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    brand: brand?.name ?? null,
    description: r.description,
    priceClp: r.price_clp,
    frameShape: r.frame_shape,
    material: r.material,
    color: r.color,
    gender: r.gender,
    lensWidthMm: r.lens_width_mm,
    bridgeMm: r.bridge_mm,
    templeMm: r.temple_mm,
    images,
    modelUrl: model?.verified ? publicStorageUrl("product-models", model.glb_path) : null,
  };
}
