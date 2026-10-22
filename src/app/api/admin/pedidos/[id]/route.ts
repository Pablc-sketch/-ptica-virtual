import { NextResponse } from "next/server";
import { PRIVATE_HEADERS, apiFail, requireAdminApi } from "@/lib/admin-api";
import { validQuoteId } from "@/lib/prescriptions";
import { RX_FIELDS, orderErrorToResponse, parseField, type RxField } from "@/lib/lab-order";

// Guarda la TRANSCRIPCIÓN de un borrador. Concurrencia optimista: se actualiza solo si la versión coincide.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, { mutation: true });
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!validQuoteId(id)) return apiFail("Pedido no disponible.", 404);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !Number.isInteger(body.expected_version) || (body.expected_version as number) < 0) return apiFail("Versión inválida.", 400);

  const patch: Record<string, unknown> = {};
  const errors: string[] = [];
  for (const f of RX_FIELDS) {
    const raw = body[f];
    if (raw === undefined) continue;
    const parsed = parseField(f as RxField, raw === null ? "" : String(raw));
    if ("error" in parsed) errors.push(parsed.error);
    else patch[f] = parsed.value;
  }
  if (body.measurement_source !== undefined) {
    if (body.measurement_source !== null && body.measurement_source !== "professional_on_fitted_frame") errors.push("Fuente de medición inválida.");
    else patch.measurement_source = body.measurement_source;
  }
  for (const k of ["measured_by", "notes"] as const) {
    if (body[k] === undefined) continue;
    const v = typeof body[k] === "string" ? (body[k] as string).trim() : null;
    if (v && v.length > (k === "notes" ? 1000 : 120)) errors.push(k === "notes" ? "Notas demasiado largas." : "Responsable demasiado largo.");
    else patch[k] = v || null;
  }
  if (body.measured_at !== undefined) {
    const v = body.measured_at;
    if (v !== null && (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v))) errors.push("Fecha de medición inválida.");
    else patch.measured_at = v;
  }
  if (errors.length) return apiFail(errors.join(" "), 400);

  const expected = body.expected_version as number;
  const { data, error } = await auth.supabase
    .from("lab_orders")
    .update({ ...patch, version: expected + 1 })
    .eq("id", id)
    .eq("version", expected)
    .select("id, version")
    .maybeSingle();
  if (error) {
    const mapped = orderErrorToResponse(error.message, error.code);
    return apiFail(mapped.error, mapped.status);
  }
  // 0 filas: otra persona cambió la versión (o el pedido ya no existe).
  if (!data) return apiFail("Otra persona cambió este pedido. Recarga para ver la versión actual.", 409);
  return NextResponse.json(data, { headers: PRIVATE_HEADERS });
}
