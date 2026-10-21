import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { PRESCRIPTION_MAX_BYTES, PRESCRIPTION_CONSENT_VERSION, prescriptionFileType, readLimitedFormData, sameOrigin, validQuoteId } from "@/lib/prescriptions";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
function failure(error: string, status: number) { return NextResponse.json({ error }, { status, headers: privateHeaders }); }

export async function POST(request: Request) {
  if (!sameOrigin(request)) return failure("Origen de solicitud inválido.", 403);
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > PRESCRIPTION_MAX_BYTES + 128 * 1024) return failure("El archivo no puede superar 4 MB.", 413);
  const supabase = await createClient();
  const session = await getSession(supabase);
  if (session.status === "unavailable") return failure("El servicio de acceso no está disponible. Intenta nuevamente.", 503);
  if (session.status !== "user") return failure("Inicia sesión para enviar tu receta de forma privada.", 401);
  const user = session.user;

  // Bound daily uploads before buffering the multipart body. RLS filters to this user.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if (countError) return failure("La recepción privada de recetas aún no está disponible.", 503);
  if ((count ?? 0) >= 10) return failure("Alcanzaste el límite diario de archivos. Intenta mañana.", 429);

  let form: FormData;
  try { form = await readLimitedFormData(request, PRESCRIPTION_MAX_BYTES + 128 * 1024); }
  catch (error) { return failure(error instanceof RangeError ? "El archivo no puede superar 4 MB." : "La solicitud no es válida.", error instanceof RangeError ? 413 : 400); }
  if (!form || form.get("consent") !== "true") return failure("Necesitamos tu consentimiento para revisar la receta.", 400);
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 12 || file.size > PRESCRIPTION_MAX_BYTES) return failure("Adjunta una receta en JPG, PNG, WebP o PDF de hasta 4 MB.", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = prescriptionFileType(bytes);
  if (!detected || (file.type && file.type !== detected.mime)) return failure("El contenido del archivo no coincide con un formato permitido.", 400);

  let quoteId = form.get("quote_id");
  if (quoteId) {
    if (!validQuoteId(quoteId)) return failure("La cotización no es válida.", 400);
    const { data: quote } = await supabase.from("quotes").select("id").eq("id", quoteId).eq("user_id", user.id).maybeSingle();
    if (!quote) return failure("La cotización no pertenece a tu cuenta.", 403);
  }
  // Reemplazo de una receta marcada "requiere nuevo archivo". El trigger de la base también lo exige (propia,
  // en needs_new_file, una sola vez); esta comprobación previa solo da un mensaje claro antes de subir el archivo.
  const replacesId = form.get("replaces_id");
  if (replacesId) {
    if (!validQuoteId(replacesId)) return failure("La receta a reemplazar no es válida.", 400);
    const { data: old, error: oldError } = await supabase.from("prescriptions").select("id, status, quote_id").eq("id", replacesId).eq("user_id", user.id).maybeSingle();
    if (oldError) return failure("No pudimos comprobar la receta a reemplazar. Intenta nuevamente.", 503);
    if (!old || old.status !== "needs_new_file") return failure("Esa receta no está esperando un nuevo archivo.", 409);
    const { data: already, error: alreadyError } = await supabase.from("prescriptions").select("id").eq("replaces_id", replacesId).eq("user_id", user.id).maybeSingle();
    if (alreadyError) return failure("No pudimos comprobar la receta a reemplazar. Intenta nuevamente.", 503);
    if (already) return failure("Ya enviaste un archivo de reemplazo para esa receta.", 409);
    // El reemplazo continúa la misma solicitud: hereda la cotización si no se eligió otra.
    if (!quoteId && old.quote_id) quoteId = old.quote_id;
  }
  const path = `${user.id}/${crypto.randomUUID()}.${detected.extension}`;
  const { error: uploadError } = await supabase.storage.from("prescriptions").upload(path, bytes, { contentType: detected.mime, cacheControl: "0", upsert: false });
  if (uploadError) return failure("No pudimos guardar el archivo. Intenta nuevamente.", 502);
  const { data: record, error: insertError } = await supabase.from("prescriptions").insert({ user_id: user.id, quote_id: quoteId || null, replaces_id: replacesId || null, path, consent_version: PRESCRIPTION_CONSENT_VERSION }).select("id").single();
  if (insertError || !record) {
    // El archivo subido no quedó registrado: se retira. Si la limpieza falla queda un objeto privado sin fila
    // (solo visible para su dueño/admin); se registra para conciliarlo, nunca se oculta.
    const { error: cleanupError } = await supabase.storage.from("prescriptions").remove([path]);
    if (cleanupError) console.error("recetas: archivo huérfano tras fallo de registro", { path, code: insertError?.code });
    // Carrera entre dos reemplazos simultáneos (índice único) o reemplazo ya no permitido (trigger): conflicto, no fallo.
    if (replacesId && (insertError?.code === "23505" || insertError?.code === "42501")) {
      return failure("Esa receta ya tiene un archivo de reemplazo o ya no espera uno.", 409);
    }
    return failure("No pudimos registrar la receta. El archivo no quedó asociado a una solicitud.", 502);
  }
  return NextResponse.json({ id: record.id, status: "pending" }, { status: 201, headers: privateHeaders });
}

