import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { clp } from "@/lib/format";

const LABEL: Record<string, string> = { draft: "Borrador", published: "Publicado", archived: "Archivado" };

async function List() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price_clp, status, product_images(verified)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return <p role="alert" className="text-red-700">No se pudo cargar la lista.</p>;
  if (!data?.length) return <p className="text-muted">Aún no hay marcos. Crea el primero.</p>;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {data.map((p) => {
        const verified = p.product_images?.filter((i) => i.verified).length ?? 0;
        return (
          <li key={p.id}>
            <Link href={`/admin/productos/${p.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-2 py-3 hover:bg-sage/30">
              <span>{p.name}</span>
              <span className="text-sm text-muted">
                {clp(p.price_clp)} · {verified} foto(s) verificada(s) · {LABEL[p.status] ?? p.status}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function ProductosAdminPage() {
  return (
    <main className="container-page py-10">
      <h1 className="mb-6 text-4xl">Marcos</h1>
      <AdminNav />
      <Link href="/admin/productos/nuevo" className="btn mb-6">Nuevo marco</Link>
      <Suspense fallback={<p role="status">Cargando…</p>}><List /></Suspense>
    </main>
  );
}
