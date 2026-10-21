import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validQuoteId, sameOrigin } from "@/lib/prescriptions";
import { getSession } from "@/lib/session";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validQuoteId(id)) return NextResponse.json({ error: "Receta no disponible." }, { status: 404, headers });
  const supabase = await createClient();
  const session = await getSession(supabase);
  if (session.status === "unavailable") return NextResponse.json({ error: "El servicio de acceso no está disponible." }, { status: 503, headers });
  if (session.status !== "user") return NextResponse.json({ error: "Inicia sesión para acceder." }, { status: 401, headers });
  // RLS allows only the owner or an administrator, even if another UUID is guessed.
  const { data: record } = await supabase.from("prescriptions").select("path").eq("id", id).maybeSingle();
  if (!record) return NextResponse.json({ error: "Receta no disponible." }, { status: 404, headers });
  const { data, error } = await supabase.storage.from("prescriptions").createSignedUrl(record.path, 60);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "No pudimos abrir el archivo." }, { status: 502, headers });
  return NextResponse.json({ url: data.signedUrl, expires_in: 60 }, { headers });
}

// Borrado propio: solo la persona dueña (no admin), con origen válido. Orden recuperable: primero el objeto
// (idempotente si ya no existe) y después el registro; si algo falla, el registro se conserva para reintentar.
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido." }, { status: 403, headers });
  const { id } = await context.params;
  if (!validQuoteId(id)) return NextResponse.json({ error: "Receta no disponible." }, { status: 404, headers });
  const supabase = await createClient();
  const session = await getSession(supabase);
  if (session.status === "unavailable") return NextResponse.json({ error: "El servicio de acceso no está disponible." }, { status: 503, headers });
  if (session.status !== "user") return NextResponse.json({ error: "Inicia sesión para acceder." }, { status: 401, headers });
  const { data: record, error: readError } = await supabase.from("prescriptions").select("path").eq("id", id).eq("user_id", session.user.id).maybeSingle();
  if (readError) return NextResponse.json({ error: "No pudimos consultar la receta. Intenta nuevamente." }, { status: 502, headers });
  if (!record) return NextResponse.json({ error: "Receta no disponible." }, { status: 404, headers });
  const bucket = supabase.storage.from("prescriptions");
  const { error: removeError } = await bucket.remove([record.path]);
  if (removeError) {
    // No damos por hecho que remove() sea idempotente con objetos inexistentes: si el archivo ya no existe
    // (reintento tras un fallo parcial) se continúa; si existe o no podemos comprobarlo, se conserva el registro.
    const probe = await bucket.exists(record.path).catch(() => ({ data: null as boolean | null }));
    if (probe.data !== false) return NextResponse.json({ error: "No pudimos eliminar el archivo. Tu receta sigue guardada; intenta nuevamente." }, { status: 502, headers });
  }
  const { error: deleteError } = await supabase.from("prescriptions").delete().eq("id", id).eq("user_id", session.user.id);
  if (deleteError) return NextResponse.json({ error: "El archivo se eliminó pero no pudimos cerrar el registro. Vuelve a intentar para terminar." }, { status: 502, headers });
  return NextResponse.json({ deleted: true }, { headers });
}
