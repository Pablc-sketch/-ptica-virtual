import { createClient } from "@/lib/supabase/server";

export type CatalogImage = { url: string; alt: string };
export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  brand: string | null;
  description: string | null;
  priceClp: number;
  frameShape: string | null;
  material: string | null;
  color: string | null;
  gender: string | null;
  lensWidthMm: number | null;
  bridgeMm: number | null;
  templeMm: number | null;
  images: CatalogImage[];
  modelUrl: string | null;
};

const SELECT =
  "id, slug, name, sku, description, price_clp, frame_shape, material, color, gender, lens_width_mm, bridge_mm, temple_mm, " +
  "brands(name), product_images(path, alt, position, verified), product_models(glb_path, verified)";

export function publicStorageUrl(bucket: "product-images" | "product-models", path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

type Row = {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
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
function adapt(r: Row): CatalogProduct {
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
    sku: r.sku,
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

export async function getPublishedProducts(): Promise<CatalogProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(200)
    .overrideTypes<Row[], { merge: false }>();
  if (error) throw new Error("catalog_unavailable");
  return (data ?? []).map(adapt).filter((p) => p.images.length > 0);
}

export async function getPublishedProduct(slug: string): Promise<CatalogProduct | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<Row, { merge: false }>();
  if (error) throw new Error("catalog_unavailable");
  if (!data) return null;
  const p = adapt(data);
  return p.images.length > 0 ? p : null;
}
