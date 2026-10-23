"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

const text = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
const num = (f: FormData, k: string) => {
  const v = text(f, k);
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n < 1000 ? n : NaN;
};

const slugify = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "marco";

export type ActionResult = { error?: string };
const priceValue = (f: FormData, k: string) => { const v=text(f,k); return v === null ? null : Number(v); };
const validPrice = (v: number | null) => v === null || (Number.isSafeInteger(v) && v > 0 && v <= 100_000_000);

export async function createProduct(formData: FormData) {
  const { supabase } = await requireAdmin();
  const name = text(formData, "name");
  const sku = text(formData, "sku");
  const price = priceValue(formData, "price_clp");
  if (!name || name.length > 120) redirect("/admin/productos/nuevo?error=Nombre%20inv%C3%A1lido");
  if (!sku || sku.length > 80) redirect("/admin/productos/nuevo?error=C%C3%B3digo%20inv%C3%A1lido");
  if (!validPrice(price)) redirect("/admin/productos/nuevo?error=Precio%20inv%C3%A1lido");
  const { data, error } = await supabase
    .from("products")
    .insert({ name, sku, price_clp: price, slug: `${slugify(name)}-${randomBytes(3).toString("hex")}`, status: "draft" })
    .select("id")
    .single();
  if (error || !data) redirect("/admin/productos/nuevo?error=No%20se%20pudo%20crear");
  redirect(`/admin/productos/${data.id}`);
}

export async function updateProduct(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const name = text(formData, "name");
  const sku = text(formData, "sku");
  const price = priceValue(formData, "price_clp");
  const pairBase = priceValue(formData, "pair_base_price_clp");
  const dims = ["lens_width_mm", "bridge_mm", "temple_mm"].map((k) => num(formData, k));
  const back = (m: string) => redirect(`/admin/productos/${id}?error=${encodeURIComponent(m)}`);
  if (!name || name.length > 120) back("Nombre inválido");
  if (!sku || sku.length > 80) back("Indica el código real del marco (hasta 80 caracteres)");
  if (!validPrice(price) || !validPrice(pairBase)) back("Precio inválido: indica pesos enteros mayores a cero o deja vacío si falta confirmar");
  if (dims.some((d) => Number.isNaN(d))) back("Las medidas deben ser números en mm");

  let brandId: string | null = null;
  const brand = text(formData, "brand");
  if (brand) {
    const { data, error } = await supabase
      .from("brands")
      .upsert({ name: brand, slug: slugify(brand) }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error || !data) back("No se pudo guardar la marca");
    brandId = data!.id;
  }
  const { error } = await supabase
    .from("products")
    .update({
      name: name!,
      sku,
      price_clp: price,
      pair_base_price_clp: pairBase,
      is_sample: formData.get("is_sample") === "on",
      brand_id: brandId,
      description: text(formData, "description"),
      frame_shape: text(formData, "frame_shape"),
      material: text(formData, "material"),
      color: text(formData, "color"),
      gender: text(formData, "gender"),
      use: formData.get("use") === "solar" ? "solar" : "optical",
      lens_width_mm: dims[0],
      bridge_mm: dims[1],
      temple_mm: dims[2],
    })
    .eq("id", id);
  if (error) back("No se pudo guardar");
  revalidatePath("/marcos");
  redirect(`/admin/productos/${id}?ok=Guardado`);
}

export async function updateProcurement(id: string, formData: FormData) {
  const {supabase}=await requireAdmin();
  const code=text(formData,"supplier_code"), color=text(formData,"color_code"), supplier=text(formData,"supplier_name"), notes=text(formData,"procurement_notes");
  const back=(m:string)=>redirect(`/admin/productos/${id}?error=${encodeURIComponent(m)}`);
  if (!code || code.length>80 || (color?.length??0)>80 || (supplier?.length??0)>120 || (notes?.length??0)>1000) back("Revisa los datos privados del proveedor");
  const {error}=await supabase.from("product_procurement").upsert({product_id:id,supplier_code:code,color_code:color,supplier_name:supplier,notes,confirmed:formData.get("procurement_confirmed")==="on"});
  if(error) back("No se pudo guardar el código privado");
  revalidatePath(`/admin/productos/${id}`);
  redirect(`/admin/productos/${id}?ok=Referencia%20privada%20guardada`);
}

// Código del proveedor por color: privado (RLS solo administración), nunca en el catálogo.
export async function updateVariantProcurement(productId: string, variantId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const code = text(formData, "supplier_code"), color = text(formData, "color_code"), notes = text(formData, "notes");
  const back = (m: string) => redirect(`/admin/productos/${productId}?error=${encodeURIComponent(m)}`);
  if (!code || code.length > 80 || (color?.length ?? 0) > 80 || (notes?.length ?? 0) > 1000) back("Revisa el código del color");
  const { data: v } = await supabase.from("product_variants").select("id").eq("id", variantId).eq("product_id", productId).maybeSingle();
  if (!v) back("Ese color no pertenece a este marco");
  const { error } = await supabase.from("product_variant_procurement").upsert({ variant_id: variantId, supplier_code: code, color_code: color, notes, confirmed: formData.get("confirmed") === "on" });
  if (error) back("No se pudo guardar el código del color");
  revalidatePath(`/admin/productos/${productId}`);
  redirect(`/admin/productos/${productId}?ok=C%C3%B3digo%20del%20color%20guardado`);
}

export async function setProductStatus(id: string, status: "draft" | "published" | "archived") {
  const { supabase } = await requireAdmin();
  if (!["draft", "published", "archived"].includes(status)) redirect(`/admin/productos/${id}?error=Estado%20inv%C3%A1lido`);
  const { error } = await supabase.from("products").update({ status }).eq("id", id);
  if (error) redirect(`/admin/productos/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/marcos");
  redirect(`/admin/productos/${id}?ok=${status === "published" ? "Publicado" : "Estado actualizado"}`);
}

export async function recordImage(productId: string, path: string, alt: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!path.startsWith(`${productId}/`) || path.includes("..")) return { error: "Ruta inválida" };
  const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    path,
    alt: alt.trim().slice(0, 200) || null,
    position: count ?? 0,
    is_primary: (count ?? 0) === 0,
  });
  if (error) return { error: "No se pudo registrar la foto" };
  return {};
}

export async function setImageVerified(imageId: string, productId: string, verified: boolean): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("product_images")
    .update({ verified, verified_at: verified ? new Date().toISOString() : null })
    .eq("id", imageId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/productos/${productId}`);
  return {};
}

export async function deleteImage(imageId: string, productId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { data: img } = await supabase.from("product_images").select("path").eq("id", imageId).maybeSingle();
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { error: error.message };
  if (img) await supabase.storage.from("product-images").remove([img.path]);
  revalidatePath(`/admin/productos/${productId}`);
  return {};
}

export async function recordModel(productId: string, path: string, sizeBytes: number): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!path.startsWith(`${productId}/`) || !/\.glb$/i.test(path) || path.includes("..")) return { error: "Ruta inválida" };
  const { error } = await supabase
    .from("product_models")
    .upsert({ product_id: productId, glb_path: path, size_bytes: sizeBytes, verified: false, verified_at: null }, { onConflict: "product_id" });
  if (error) return { error: "No se pudo registrar el modelo" };
  return {};
}

export async function setModelVerified(productId: string, verified: boolean): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("product_models")
    .update({ verified, verified_at: verified ? new Date().toISOString() : null })
    .eq("product_id", productId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/productos/${productId}`);
  return {};
}

export async function setQuoteStatus(id: string, status: "new" | "contacted" | "closed" | "cancelled") {
  const { supabase } = await requireAdmin();
  if (!["new", "contacted", "closed", "cancelled"].includes(status)) return;
  await supabase.from("quotes").update({ status }).eq("id", id);
  revalidatePath("/admin/cotizaciones");
}
