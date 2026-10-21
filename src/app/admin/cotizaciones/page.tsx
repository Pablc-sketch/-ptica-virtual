import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { clp } from "@/lib/format";
import { setQuoteStatus } from "@/app/admin/actions";

const STATUS = { new: "Nueva", contacted: "Contactada", closed: "Cerrada", cancelled: "Cancelada" } as const;

async function Quotes() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("quotes")
    .select("id, customer_name, email, phone, notes, status, created_at, quote_items(product_name, quantity, unit_price_clp)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return <p role="alert" className="text-red-700">No se pudieron cargar las cotizaciones.</p>;
  if (!data?.length) return <p className="text-muted">Aún no hay cotizaciones.</p>;
  return (
    <ul className="space-y-4">
      {data.map((q) => {
        const total = (q.quote_items ?? []).reduce((a, i) => a + i.quantity * i.unit_price_clp, 0);
        return (
          <li key={q.id} className="border border-line bg-white/60 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{q.customer_name}</p>
              <p className="text-sm text-muted">{new Date(q.created_at).toLocaleString("es-CL")} · {STATUS[q.status as keyof typeof STATUS] ?? q.status}</p>
            </div>
            <p className="text-sm text-muted">{[q.email, q.phone].filter(Boolean).join(" · ")}</p>
            <ul className="mt-2 text-sm">
              {q.quote_items?.map((i, idx) => <li key={idx}>{i.quantity} × {i.product_name} — {clp(i.unit_price_clp)}</li>)}
            </ul>
            <p className="mt-1 text-sm">Total marcos: {clp(total)}</p>
            {q.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{q.notes}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(STATUS) as (keyof typeof STATUS)[]).filter((s) => s !== q.status).map((s) => (
                <form key={s} action={setQuoteStatus.bind(null, q.id, s)}><button className="btn btn-ghost !min-h-11 !px-3">Marcar {STATUS[s].toLowerCase()}</button></form>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function CotizacionesPage() {
  return (
    <main className="container-page py-10">
      <h1 className="mb-6 text-4xl">Cotizaciones</h1>
      <AdminNav />
      <Suspense fallback={<p role="status">Cargando…</p>}><Quotes /></Suspense>
    </main>
  );
}
