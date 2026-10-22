import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { OpenPrescriptionButton } from "@/components/open-prescription-button";
import { LabOrderEditor } from "@/components/lab-order-editor";
import { FAMILY_USE, STATUS_LABEL, loadOrderDetail } from "@/lib/lab-order-data";
import { validQuoteId } from "@/lib/prescriptions";

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  if (!validQuoteId(id)) notFound();
  const d = await loadOrderDetail(supabase, id);
  if (!d) notFound();
  const o = d.order;
  return (
    <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-3 text-sm">
        <div className="relative aspect-square w-40 overflow-hidden bg-sage/50">
          {d.photoUrl ? <Image src={d.photoUrl} alt={`Marco ${o.product_name}`} fill sizes="160px" className="object-cover" /> : <span className="p-3 text-xs text-muted">Sin foto</span>}
        </div>
        <p><strong>{o.product_name}</strong></p>
        <p>{FAMILY_USE(o)} · {o.treatment}</p>
        <p>Estado: <strong>{STATUS_LABEL[o.status]}</strong> · versión {o.version}</p>
        <p>
          Referencia proveedor:{" "}
          {d.procurement ? <><span className="font-mono">{d.procurement.supplier_code}</span>{d.procurement.color_code ? ` · color ${d.procurement.color_code}` : ""} {d.procurement.confirmed ? "(confirmada)" : <strong className="text-red-700">(sin confirmar)</strong>}</> : <strong className="text-red-700">sin registrar</strong>}
        </p>
        <div className="border-t border-line pt-3">
          <p className="mb-1">Archivo original (se abre aparte, enlace de 60 s; imprímelo desde ahí):</p>
          <OpenPrescriptionButton id={o.prescription_id} />
        </div>
        {o.status === "validated" && (
          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            <Link href={`/admin/pedidos/${o.id}/imprimir`} className="btn btn-ghost !min-h-11 !px-3">Vista imprimible</Link>
            <a href={`/api/admin/pedidos/${o.id}/csv`} className="btn btn-ghost !min-h-11 !px-3" download>Descargar CSV</a>
          </div>
        )}
        <details className="border-t border-line pt-3">
          <summary className="cursor-pointer underline">Historial ({d.events.length})</summary>
          <ol className="mt-1 list-decimal pl-5 text-xs text-muted">
            {d.events.map((e, i) => <li key={i}>{new Date(e.created_at).toLocaleString("es-CL")}: {STATUS_LABEL[e.from_status]} → {STATUS_LABEL[e.to_status]}</li>)}
          </ol>
        </details>
      </aside>
      <LabOrderEditor order={o} prescriptionReviewed={d.prescriptionReviewed} procurementConfirmed={!!d.procurement?.confirmed} />
    </div>
  );
}

export default function PedidoPage({ params }: PageProps<"/admin/pedidos/[id]">) {
  return (
    <main className="container-page py-10">
      <h1 className="mb-6 text-4xl">Pedido de laboratorio</h1>
      <AdminNav />
      <Suspense fallback={<p role="status">Cargando…</p>}><Detail params={params} /></Suspense>
    </main>
  );
}
