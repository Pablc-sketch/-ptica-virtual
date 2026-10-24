import { createClient } from "@/lib/supabase/server";
import { adapt, type Row } from "@/lib/catalog-adapt";
import type { CatalogProduct } from "@/lib/catalog-types";

export { publicStorageUrl } from "@/lib/catalog-adapt";
export type { CatalogImage, CatalogProduct } from "@/lib/catalog-types";

const SELECT =
  "id, slug, name, description, price_clp, pair_base_price_clp, is_sample, use, frame_shape, material, color, gender, lens_width_mm, bridge_mm, temple_mm, " +
  "brands(name), product_images(path, alt, position, verified, kind, variant_id, view), product_models(glb_path, verified), " +
  "product_variants(id, color_name, color_hex, color_hex_2, position, status)";

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

// Comparison requests only the chosen published rows, never the entire catalogue.
export async function getComparisonProducts(ids: string[]): Promise<CatalogProduct[]> {
  const supabase = await createClient();
  const {data,error} = await supabase.from("products").select(SELECT).eq("status","published").in("id",ids).limit(3).overrideTypes<Row[], {merge:false}>();
  if (error) throw new Error("catalog_unavailable");
  return (data ?? []).map(adapt).filter(p=>p.images.length>0);
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

// Conserva los enlaces antiguos cuando una variante pasa a una publicación propia.
export async function getPublishedVariantProductSlug(id:string):Promise<string|null>{
  if(!/^[0-9a-f-]{36}$/i.test(id))return null;
  const supabase=await createClient();
  const {data,error}=await supabase.from('product_variants').select('products!inner(slug,status)').eq('id',id).eq('status','published').eq('products.status','published').maybeSingle().overrideTypes<{products:{slug:string}},{merge:false}>();
  return error?null:data?.products.slug??null;
}
