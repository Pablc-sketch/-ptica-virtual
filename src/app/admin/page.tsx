import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";

async function AdminContent() {
  const { supabase } = await requireAdmin();
  const [{ data: products }, { data: quotes }] = await Promise.all([
    supabase.from("products").select("id, name, price_clp, status").order("created_at", { ascending: false }).limit(50),
    supabase.from("quotes").select("id, customer_name, status, created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <h1 className="text-2xl font-semibold">Administración</h1>
      <section>
        <h2 className="mb-2 text-lg font-medium">Productos ({products?.length ?? 0})</h2>
        <ul className="divide-y">
          {products?.map((p) => (
            <li key={p.id} className="flex justify-between py-2">
              <span>{p.name}</span>
              <span>${p.price_clp.toLocaleString("es-CL")} · {p.status}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-medium">Cotizaciones ({quotes?.length ?? 0})</h2>
        <ul className="divide-y">
          {quotes?.map((q) => (
            <li key={q.id} className="flex justify-between py-2">
              <span>{q.customer_name}</span>
              <span>{q.status} · {new Date(q.created_at).toLocaleDateString("es-CL")}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<main className="p-8">Cargando…</main>}>
      <AdminContent />
    </Suspense>
  );
}
