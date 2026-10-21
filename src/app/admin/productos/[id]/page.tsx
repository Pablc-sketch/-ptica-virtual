import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { MediaUploader } from "@/components/media-uploader";
import { MediaRowActions } from "@/components/media-row-actions";
import { publicStorageUrl } from "@/lib/catalog";
import { setProductStatus, updateProduct, updateProcurement } from "@/app/admin/actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Editor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const { supabase } = await requireAdmin();
  if (!UUID.test(id)) notFound();
  const { data: p } = await supabase
    .from("products")
    .select("*, brands(name), product_images(id, path, alt, position, verified, kind), product_models(glb_path, verified, size_bytes)")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();
  const {data:procurement,error:procurementError}=await supabase.from("product_procurement").select("supplier_code,color_code,supplier_name,confirmed,notes").eq("product_id",id).maybeSingle();
  const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands;
  const model = Array.isArray(p.product_models) ? p.product_models[0] : p.product_models;
  const images = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position);
  const hasVerified = images.some((i) => i.verified);
  const canPublish = hasVerified && p.price_clp > 0 && p.name.trim().length > 0 && Boolean(p.sku?.trim());

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
      <section aria-labelledby="datos">
        <h2 id="datos" className="mb-4 text-2xl">Datos del marco</h2>
        {error && <p role="alert" className="mb-3 border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}
        {ok && <p role="status" className="mb-3 border border-line bg-sage/50 p-3">{ok}</p>}
        <form action={updateProduct.bind(null, id)} className="flex flex-col gap-3">
          <label>Nombre<input name="name" defaultValue={p.name} required maxLength={120} className="field mt-1" /></label>
          <label>Identificador de tienda<input name="sku" defaultValue={p.sku ?? ""} required maxLength={80} className="field mt-1" /></label>
          <label>Marca<input name="brand" defaultValue={brand?.name ?? ""} maxLength={80} className="field mt-1" /></label>
          <label>Solo marco (CLP, vacío si falta confirmar)<input name="price_clp" type="number" min={1} step={1} defaultValue={p.price_clp ?? ""} className="field mt-1" /></label>
          <label>Par con cristal blanco, desde (CLP)<input name="pair_base_price_clp" type="number" min={1} step={1} defaultValue={p.pair_base_price_clp ?? ""} className="field mt-1" /></label>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="is_sample" defaultChecked={p.is_sample} className="h-5 w-5"/>Mostrar como muestra: imagen retocada y disponibilidad por confirmar. No habilita venta.</label>
          <label>Descripción<textarea name="description" defaultValue={p.description ?? ""} maxLength={2000} className="field mt-1" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label>Forma<input name="frame_shape" defaultValue={p.frame_shape ?? ""} className="field mt-1" /></label>
            <label>Material<input name="material" defaultValue={p.material ?? ""} className="field mt-1" /></label>
            <label>Color<input name="color" defaultValue={p.color ?? ""} className="field mt-1" /></label>
            <label>Público<input name="gender" defaultValue={p.gender ?? ""} className="field mt-1" /></label>
            <label>Ancho cristal (mm)<input name="lens_width_mm" type="number" step="0.5" defaultValue={p.lens_width_mm ?? ""} className="field mt-1" /></label>
            <label>Puente (mm)<input name="bridge_mm" type="number" step="0.5" defaultValue={p.bridge_mm ?? ""} className="field mt-1" /></label>
            <label>Varilla (mm)<input name="temple_mm" type="number" step="0.5" defaultValue={p.temple_mm ?? ""} className="field mt-1" /></label>
          </div>
          <button className="btn self-start">Guardar datos</button>
        </form>

        <section className="mt-10 border-t border-line pt-6" aria-labelledby="abastecimiento"><h2 id="abastecimiento" className="text-2xl">Referencia privada del proveedor</h2><p className="my-3 text-sm text-muted">Solo administración. Este código no aparece en el catálogo ni se envía al cliente.</p>{procurementError ? <p role="alert">No se pudo cargar la referencia privada.</p> : <form action={updateProcurement.bind(null,id)} className="flex flex-col gap-3"><label>Proveedor<input name="supplier_name" defaultValue={procurement?.supplier_name??""} maxLength={120} className="field mt-1"/></label><label>Código de compra<input name="supplier_code" defaultValue={procurement?.supplier_code??""} required maxLength={80} className="field mt-1"/></label><label>Variante / color del proveedor<input name="color_code" defaultValue={procurement?.color_code??""} maxLength={80} className="field mt-1"/></label><label>Notas internas<textarea name="procurement_notes" defaultValue={procurement?.notes??""} maxLength={1000} className="field mt-1"/></label><label className="flex gap-3 text-sm"><input name="procurement_confirmed" type="checkbox" defaultChecked={procurement?.confirmed} className="h-5 w-5"/>Código comprobado</label><button className="btn self-start">Guardar referencia privada</button></form>}</section>

        <h2 className="mb-2 mt-10 text-2xl">Publicación</h2>
        <p className="mb-3 text-sm text-muted">
          Estado actual: <strong>{p.is_sample ? "Muestra de catálogo" : p.status === "published" ? "Publicado" : p.status === "archived" ? "Archivado" : "Borrador"}</strong>.
          Para publicar se exige código real, precio mayor a 0 y al menos una foto verificada
          {canPublish ? " (cumplido)." : " (aún no se cumple)."}
        </p>
        <div className="flex flex-wrap gap-2">
          {p.status !== "published" && (
            <form action={setProductStatus.bind(null, id, "published")}><button className="btn" disabled={!canPublish}>Publicar</button></form>
          )}
          {p.status === "published" && (
            <form action={setProductStatus.bind(null, id, "draft")}><button className="btn btn-ghost">Volver a borrador</button></form>
          )}
          {p.status !== "archived" && (
            <form action={setProductStatus.bind(null, id, "archived")}><button className="btn btn-ghost">Archivar</button></form>
          )}
        </div>
      </section>

      <section aria-labelledby="media" className="space-y-8">
        <div>
          <h2 id="media" className="mb-3 text-2xl">Fotos reales</h2>
          <ul className="mb-4 space-y-4">
            {images.map((i) => (
              <li key={i.id} className="flex gap-3">
                <div className="relative h-24 w-24 shrink-0 bg-sage/50">
                  <Image src={publicStorageUrl("product-images", i.path)} alt={i.alt ?? ""} fill sizes="96px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm">{i.kind === "retouched" ? "Imagen retocada · muestra" : i.verified ? "✓ Verificada" : "Sin verificar"}</p>
                  {i.kind !== "retouched" && <MediaRowActions kind="image" productId={id} imageId={i.id} verified={i.verified} />}
                </div>
              </li>
            ))}
            {images.length === 0 && <li className="text-sm text-muted">Sin fotos todavía.</li>}
          </ul>
          <p className="mb-2 text-xs text-muted">Verificar = confirmas que es una foto real de este modelo, con código y color correctos.</p>
          <MediaUploader productId={id} kind="image" />
        </div>
        <div>
          <h2 className="mb-3 text-2xl">Modelo 3D</h2>
          {model ? (
            <div className="mb-3 text-sm">
              <p className="break-all">{model.glb_path} · {model.verified ? "✓ Verificado" : "Sin verificar"}</p>
              <MediaRowActions kind="model" productId={id} verified={model.verified} />
            </div>
          ) : (
            <p className="mb-3 text-sm text-muted">Sin modelo. Solo se muestra 3D con un GLB verificado.</p>
          )}
          <MediaUploader productId={id} kind="model" />
        </div>
      </section>
    </div>
  );
}

export default function EditPage({ params, searchParams }: PageProps<"/admin/productos/[id]">) {
  return (
    <main className="container-page py-10">
      <h1 className="mb-6 text-4xl">Editar marco</h1>
      <AdminNav />
      <Suspense fallback={<p role="status">Cargando…</p>}><Editor params={params} searchParams={searchParams} /></Suspense>
    </main>
  );
}
