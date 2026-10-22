import { NextResponse } from "next/server";
import { PRIVATE_HEADERS, apiFail, requireAdminApi } from "@/lib/admin-api";
import { validQuoteId } from "@/lib/prescriptions";
import { orderErrorToResponse, type OrderStatus } from "@/lib/lab-order";

const TARGETS: OrderStatus[] = ["validated", "draft", "cancelled"];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, { mutation: true });
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!validQuoteId(id)) return apiFail("Pedido no disponible.", 404);
  const body = (await request.json().catch(() => null)) as { to?: unknown; expected_version?: unknown; confirm_transcription?: unknown } | null;
  if (!body || !TARGETS.includes(body.to as OrderStatus)) return apiFail("Estado inválido.", 400);
  if (!Number.isInteger(body.expected_version) || (body.expected_version as number) < 0) return apiFail("Versión inválida.", 400);
  // Validar exige confirmar explícitamente que la transcripción se comparó con el archivo original.
  if (body.to === "validated" && body.confirm_transcription !== true) {
    return apiFail("Confirma que comparaste la transcripción con el archivo original.", 400);
  }
  const expected = body.expected_version as number;
  const { data, error } = await auth.supabase
    .from("lab_orders")
    .update({ status: body.to, version: expected + 1 })
    .eq("id", id)
    .eq("version", expected)
    .select("id, status, version")
    .maybeSingle();
  if (error) {
    const mapped = orderErrorToResponse(error.message, error.code);
    return apiFail(mapped.error, mapped.status);
  }
  if (!data) return apiFail("Otra persona cambió este pedido. Recarga para ver la versión actual.", 409);
  return NextResponse.json(data, { headers: PRIVATE_HEADERS });
}
