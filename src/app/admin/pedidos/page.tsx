import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { FAMILY_USE, STATUS_LABEL } from "@/lib/lab-order-data";
import type { LabOrder } from "@/lib/lab-order";

const FILTERS = [
  { key: "borradores", label: "Borradores", status: "draft" },
  { key: "validados", label: "Validados", status: "validated" },
  { key: "cancelados", label: "Cancelados", status: "cancelled" },
] as const;

async function Queue({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const filter = FILTERS.find((f) => f.key === estado) ?? FILTERS[0];
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("lab_orders")
    .select("id, product_name, family, requested_use, treatment, status, created_at, validated_at")
    .eq("status", filter.status)
    .order("created_at", { ascending: true })
    .limit(100)
    .overrideTypes<Pick<LabOrder, "id" | "product_name" | "family" | "requested_use" | "treatment" | "status" | "created_at" | "validated_at">[], { merge: false }>();
  return (
    <>
      <nav aria-label="Filtrar pedidos" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/admin/pedidos?estado=${f.key}`} aria-current={f.key === filter.key ? "page" : undefined}
            className={`btn !min-h-11 !px-3 ${f.key === filter.key ? "" : "btn-ghost"}`}>{f.label}</Link>
        ))}
      </nav>
      {error ? (
        <p role="alert" className="text-red-700">No se pudieron cargar los pedidos.</p>
      ) : !data?.length ? (
        <p className="text-muted">No hay pedidos en “{filter.label}”. Los borradores se crean desde una receta con revisión documental completada.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {data.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/pedidos/${o.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-2 py-3 hover:bg-sage/30">
                <span><strong>{o.product_name}</strong> · {FAMILY_USE(o)} · {o.treatment}</span>
                <span className="text-sm text-muted">{STATUS_LABEL[o.status]} · creado {new Date(o.created_at).toLocaleString("es-CL")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function PedidosPage({ searchParams }: PageProps<"/admin/pedidos">) {
  return (
    <main className="container-page py-10">
      <h1 className="mb-6 text-4xl">Pedidos de laboratorio</h1>
      <AdminNav />
      <p className="mb-4 max-w-prose text-sm text-muted">
        Borradores para preparar un pedido a Fides. Nada se envía automáticamente y no hay estados de pago ni fabricación.
        La RX se transcribe a mano desde el archivo original; validar no reemplaza la revisión profesional.
      </p>
      <Suspense fallback={<p role="status">Cargando…</p>}><Queue searchParams={searchParams} /></Suspense>
    </main>
  );
}
