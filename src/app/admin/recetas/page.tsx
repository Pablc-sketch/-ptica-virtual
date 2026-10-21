import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { OpenPrescriptionButton } from "@/components/open-prescription-button";

async function List() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("prescriptions")
    .select("id, user_id, created_at, consent_version, quotes(customer_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return <p role="alert" className="text-red-700">No se pudieron cargar las recetas.</p>;
  if (!data?.length) return <p className="text-muted">Aún no hay recetas recibidas.</p>;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {data.map((r) => {
        const q = Array.isArray(r.quotes) ? r.quotes[0] : r.quotes;
        return (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="text-sm">
              {new Date(r.created_at).toLocaleString("es-CL")}
              <span className="block text-xs text-muted">
                Cliente {r.user_id.slice(0, 8)}… · {q?.customer_name ? `cotización de ${q.customer_name}` : "sin cotización asociada"} · aviso {r.consent_version}
              </span>
            </span>
            <OpenPrescriptionButton id={r.id} />
          </li>
        );
      })}
    </ul>
  );
}

export default function RecetasAdminPage() {
  return (
    <main className="container-page py-10">
      <h1 className="mb-6 text-4xl">Recetas</h1>
      <AdminNav />
      <p className="mb-4 text-sm text-muted">Dato sensible: cada apertura genera un enlace firmado de 60 segundos.</p>
      <Suspense fallback={<p role="status">Cargando…</p>}><List /></Suspense>
    </main>
  );
}
