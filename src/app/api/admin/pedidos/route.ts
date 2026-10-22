import { NextResponse } from "next/server";
import { PRIVATE_HEADERS, apiFail, requireAdminApi } from "@/lib/admin-api";
import { validQuoteId } from "@/lib/prescriptions";
import { orderErrorToResponse } from "@/lib/lab-order";

// Crea un BORRADOR desde una receta con revisión documental completada. El contexto (marco, familia, uso,
// tratamiento) lo copia la base desde la receta; aquí solo se envía el id.
export async function POST(request: Request) {
  const auth = await requireAdminApi(request, { mutation: true });
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { prescription_id?: unknown } | null;
  if (!body || !validQuoteId(body.prescription_id)) return apiFail("Receta inválida.", 400);
  const { data, error } = await auth.supabase
    .from("lab_orders")
    .insert({ prescription_id: body.prescription_id, product_name: "-", family: "Monofocal", treatment: "-" })
    .select("id")
    .single();
  if (error || !data) {
    const mapped = orderErrorToResponse(error?.message, error?.code);
    return apiFail(mapped.error, mapped.status);
  }
  return NextResponse.json({ id: data.id }, { status: 201, headers: PRIVATE_HEADERS });
}
