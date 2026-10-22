import { apiFail, requireAdminApi } from "@/lib/admin-api";
import { validQuoteId } from "@/lib/prescriptions";
import { RX_FIELDS, toCsv, type ExportRow, type LabOrder } from "@/lib/lab-order";

// Exportación CSV SOLO de pedidos validados por un admin. Sin URLs firmadas ni datos de la persona: solo lo que el
// laboratorio necesita. Protegido contra CSV injection (src/lib/lab-order.ts).
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, { mutation: false });
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!validQuoteId(id)) return apiFail("Pedido no disponible.", 404);
  const { data: o, error } = await auth.supabase.from("lab_orders").select("*").eq("id", id).maybeSingle<LabOrder>();
  if (error) return apiFail("No pudimos leer el pedido.", 502);
  if (!o) return apiFail("Pedido no disponible.", 404);
  if (o.status !== "validated" || !o.validated_at) return apiFail("Solo se exportan pedidos validados.", 409);
  const { data: proc, error: procErr } = await auth.supabase
    .from("product_procurement").select("supplier_code, color_code, confirmed").eq("product_id", o.product_id ?? "").maybeSingle();
  if (procErr) return apiFail("No pudimos leer la referencia del proveedor.", 502);
  if (!proc?.confirmed) return apiFail("La referencia del proveedor no está confirmada.", 409);
  const row: ExportRow = {
    pedido: o.id, marco: o.product_name, referencia_proveedor: proc.supplier_code, codigo_color: proc.color_code ?? null,
    familia: o.family, uso: o.requested_use === "near" ? "cerca" : o.requested_use === "distance" ? "lejos" : null,
    tratamiento: o.treatment, validado_en: o.validated_at,
    ...(Object.fromEntries(RX_FIELDS.map((f) => [f, o[f]])) as Record<(typeof RX_FIELDS)[number], number | null>),
    medicion: o.measurement_source === "professional_on_fitted_frame" ? "profesional sobre marco ajustado" : null,
    medido_por: o.measured_by, medido_en: o.measured_at,
  };
  return new Response(toCsv([row]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedido-${o.id.slice(0, 8)}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
