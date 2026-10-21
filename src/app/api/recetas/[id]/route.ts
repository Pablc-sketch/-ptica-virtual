import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validQuoteId } from "@/lib/prescriptions";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validQuoteId(id)) return NextResponse.json({ error: "Receta no disponible." }, { status: 404, headers });
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Inicia sesión para acceder." }, { status: 401, headers });
  // RLS allows only the owner or an administrator, even if another UUID is guessed.
  const { data: record } = await supabase.from("prescriptions").select("path").eq("id", id).maybeSingle();
  if (!record) return NextResponse.json({ error: "Receta no disponible." }, { status: 404, headers });
  const { data, error } = await supabase.storage.from("prescriptions").createSignedUrl(record.path, 60);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "No pudimos abrir el archivo." }, { status: 502, headers });
  return NextResponse.json({ url: data.signedUrl, expires_in: 60 }, { headers });
}
