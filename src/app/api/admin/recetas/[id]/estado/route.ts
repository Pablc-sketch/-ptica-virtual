import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { sameOrigin, validQuoteId } from "@/lib/prescriptions";
import { isReviewStatus, reviewErrorToResponse, validateReason } from "@/lib/prescription-review";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

// Cambio de estado de revisión documental. La autorización real está en la base: review_prescription() exige
// is_admin(), valida la transición y la versión esperada (concurrencia optimista). Aquí solo se valida la forma.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return fail("Origen de solicitud inválido.", 403);
  const { id } = await context.params;
  if (!validQuoteId(id)) return fail("Receta no disponible.", 404);
  const supabase = await createClient();
  const session = await getSession(supabase);
  if (session.status === "unavailable") return fail("El servicio de acceso no está disponible.", 503);
  if (session.status !== "user") return fail("Inicia sesión para acceder.", 401);

  const body = (await request.json().catch(() => null)) as { to?: unknown; expected_version?: unknown; reason?: unknown } | null;
  if (!body || !isReviewStatus(body.to)) return fail("Estado inválido.", 400);
  if (!Number.isInteger(body.expected_version) || (body.expected_version as number) < 0) return fail("Versión inválida.", 400);
  const reason = typeof body.reason === "string" ? body.reason : null;
  const reasonError = validateReason(body.to, reason);
  if (reasonError) return fail(reasonError, 400);

  const { data, error } = await supabase.rpc("review_prescription", {
    p_id: id,
    p_expected_version: body.expected_version,
    p_to: body.to,
    p_message: body.to === "needs_new_file" ? reason : null,
  });
  if (error) {
    const mapped = reviewErrorToResponse(error.message);
    return fail(mapped.error, mapped.status);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ status: row?.status, version: row?.version, status_changed_at: row?.status_changed_at }, { headers });
}
