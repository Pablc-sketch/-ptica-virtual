import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { FAMILY_USE, loadOrderDetail } from "@/lib/lab-order-data";
import { validQuoteId } from "@/lib/prescriptions";
import { FIELD_LABEL, type RxField } from "@/lib/lab-order";

const ROWS: { eye: string; f: RxField[] }[] = [
  { eye: "OD", f: ["od_sph", "od_cyl", "od_axis", "od_add", "od_pd", "od_height"] },
  { eye: "OI", f: ["oi_sph", "oi_cyl", "oi_axis", "oi_add", "oi_pd", "oi_height"] },
];
const v = (n: number | null) => (n == null ? "—" : String(n).replace(".", ","));

async function Sheet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  if (!validQuoteId(id)) notFound();
  const d = await loadOrderDetail(supabase, id);
  if (!d) notFound();
  const o = d.order;
  // Solo pedidos validados por un admin se imprimen como pedido.
  if (o.status !== "validated" || !o.validated_at) {
    return <p role="alert" className="p-8">Este pedido no está validado: no se puede imprimir como pedido.</p>;
  }
  return (
    <article className="mx-auto max-w-3xl bg-white p-8 text-ink print:p-0">
      <header className="mb-6 flex items-start justify-between gap-6 border-b border-line pb-4">
        <div>
          <p className="eyebrow">Borrador de pedido validado · no enviado</p>
          <h1 className="text-3xl">{o.product_name}</h1>
          <p>{FAMILY_USE(o)} · {o.treatment}</p>
          <p className="text-sm">Ref. proveedor: <span className="font-mono">{d.procurement?.supplier_code ?? "—"}</span>{d.procurement?.color_code ? ` · color ${d.procurement.color_code}` : ""}</p>
        </div>
        {d.photoUrl && <div className="relative h-24 w-24 shrink-0"><Image src={d.photoUrl} alt="" fill sizes="96px" className="object-cover" /></div>}
      </header>
      <table className="w-full border-collapse text-sm">
        <thead><tr><th className="border border-line p-2 text-left">Ojo</th>{["ESF", "CIL", "EJE", "ADD", "DP mono", "Altura"].map((c) => <th key={c} className="border border-line p-2 text-left">{c}</th>)}</tr></thead>
        <tbody>{ROWS.map((r) => <tr key={r.eye}><th className="border border-line p-2 text-left">{r.eye}</th>{r.f.map((f) => <td key={f} className="border border-line p-2" aria-label={FIELD_LABEL[f]}>{v(o[f])}</td>)}</tr>)}</tbody>
      </table>
      {o.family !== "Monofocal" && <p className="mt-3 text-sm">Medición profesional sobre marco ajustado: {o.measured_by} · {o.measured_at}</p>}
      <footer className="mt-6 border-t border-line pt-3 text-xs text-muted">
        Validado el {new Date(o.validated_at).toLocaleString("es-CL")} · pedido {o.id.slice(0, 8)}. RX transcrita manualmente desde el archivo original;
        el archivo se imprime por separado. Este documento no reemplaza la revisión profesional ni confirma pago o fabricación.
      </footer>
    </article>
  );
}

export default function ImprimirPedidoPage({ params }: PageProps<"/admin/pedidos/[id]/imprimir">) {
  return <main><Suspense fallback={<p role="status">Cargando…</p>}><Sheet params={params} /></Suspense></main>;
}
