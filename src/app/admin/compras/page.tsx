import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { clp } from "@/lib/format";
import { setStoreOrderStatus } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Compras", robots: { index: false } };

const STATUS: Record<string, string> = {
  pending_payment: "Pago pendiente", paid: "Pagada", rejected: "Pago rechazado", cancelled: "Cancelada",
  ordered: "Pedida a la importadora", shipped: "Despachada", delivered: "Entregada",
};
const NEXT = ["paid", "ordered", "shipped", "delivered", "cancelled"];
const LENS: Record<string, string> = { basico: "Cristal básico", antirreflejo: "Antirreflejo", "filtro-azul": "Filtro luz azul" };
type ShipTo = { recipient?: string; phone?: string; region?: string; comuna?: string; street?: string; street_number?: string; unit?: string | null; notes?: string | null };

async function Orders() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("store_orders")
    .select("id, created_at, status, product_id, variant_id, product_name, color_name, lens_option, needs_prescription, total_clp, buyer_name, buyer_email, buyer_phone, ship_to, mp_payment_id")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return <p role="alert" className="text-red-700">No se pudieron cargar las compras.</p>;
  if (!data?.length) return <p className="text-muted">Aún no hay compras.</p>;
  // Código privado del proveedor (por color y, si no hay, por modelo): para pedir el marco a la importadora.
  const variantIds = data.flatMap((o) => (o.variant_id ? [o.variant_id] : []));
  const productIds = [...new Set(data.map((o) => o.product_id))];
  const [{ data: vp }, { data: pp }] = await Promise.all([
    variantIds.length ? supabase.from("product_variant_procurement").select("variant_id, supplier_code, color_code").in("variant_id", variantIds) : Promise.resolve({ data: [] as { variant_id: string; supplier_code: string; color_code: string | null }[] }),
    supabase.from("product_procurement").select("product_id, supplier_code, color_code").in("product_id", productIds),
  ]);
  const byVariant = new Map((vp ?? []).map((r) => [r.variant_id, r]));
  const byProduct = new Map((pp ?? []).map((r) => [r.product_id, r]));
  return (
    <ul className="space-y-4">
      {data.map((o) => {
        const ref = (o.variant_id && byVariant.get(o.variant_id)) || byProduct.get(o.product_id);
        const s = (o.ship_to ?? {}) as ShipTo;
        return (
          <li key={o.id} className="border border-line bg-white/60 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{o.product_name}{o.color_name ? ` · ${o.color_name}` : ""}{o.lens_option ? ` · ${LENS[o.lens_option]}` : ""}</p>
              <p><strong>{clp(o.total_clp)}</strong> · {STATUS[o.status] ?? o.status}</p>
            </div>
            <p className="mt-1 text-xs text-muted">Compra {o.id.slice(0, 8).toUpperCase()} · {new Date(o.created_at).toLocaleString("es-CL")}{o.mp_payment_id ? ` · Pago MP ${o.mp_payment_id}` : ""}</p>
            <p className="mt-2 text-sm">Código proveedor: <strong>{ref ? `${ref.supplier_code}${ref.color_code ? ` · color ${ref.color_code}` : ""}` : "sin código"}</strong></p>
            <p className="mt-2 text-sm">{o.buyer_name} · {o.buyer_email} · {o.buyer_phone}</p>
            <p className="text-sm text-muted">Despacho: {s.street} {s.street_number}{s.unit ? `, ${s.unit}` : ""}, {s.comuna}, {s.region}{s.notes ? ` · ${s.notes}` : ""}</p>
            {o.needs_prescription && <p className="mt-1 text-sm">Requiere receta: revisar en Recetas o WhatsApp antes de fabricar.</p>}
            <form action={setStoreOrderStatus.bind(null, o.id)} className="mt-3 flex flex-wrap items-center gap-2">
              <label className="text-sm">Estado
                <select name="status" defaultValue={NEXT.includes(o.status) ? o.status : ""} className="field ml-2 !w-auto">
                  <option value="" disabled>Elegir…</option>
                  {NEXT.map((k) => <option key={k} value={k}>{STATUS[k]}</option>)}
                </select>
              </label>
              <button className="btn btn-ghost">Actualizar</button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

export default function ComprasAdminPage() {
  return (
    <main className="container-page py-10">
      <AdminNav />
      <h1 className="mb-6 text-4xl">Compras</h1>
      <p className="mb-6 text-sm text-muted">Pagadas con Mercado Pago. Solo administración ve los datos de despacho y los códigos del proveedor.</p>
      <Suspense fallback={<p role="status">Cargando…</p>}><Orders /></Suspense>
    </main>
  );
}
