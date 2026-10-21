import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { createProduct } from "@/app/admin/actions";

async function Form({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  return (
    <form action={createProduct} className="flex max-w-lg flex-col gap-3">
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <label>Nombre<input name="name" required maxLength={120} className="field mt-1" /></label>
      <label>Identificador de tienda<input name="sku" required maxLength={80} className="field mt-1" /></label>
      <label>Solo marco (CLP, opcional)<input name="price_clp" type="number" min={1} step={1} className="field mt-1" /></label>
      <p className="text-sm text-muted">Se crea como borrador. Para publicar necesita código real, una foto verificada y precio mayor a 0.</p>
      <button className="btn self-start">Crear borrador</button>
    </form>
  );
}

export default function NuevoPage({ searchParams }: PageProps<"/admin/productos/nuevo">) {
  return (
    <main className="container-page py-10">
      <h1 className="mb-6 text-4xl">Nuevo marco</h1>
      <AdminNav />
      <Suspense fallback={<p role="status">Cargando…</p>}><Form searchParams={searchParams} /></Suspense>
    </main>
  );
}
