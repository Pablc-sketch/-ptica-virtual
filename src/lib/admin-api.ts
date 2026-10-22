import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { sameOrigin } from "@/lib/prescriptions";

export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export const apiFail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: PRIVATE_HEADERS });

/**
 * Equivalente de requireAdmin() para rutas de API: responde 401/403/503 en vez de redirigir.
 * Las mutaciones exigen además mismo origen. La base vuelve a exigir admin por RLS en cada consulta.
 */
export async function requireAdminApi(
  request: Request,
  { mutation }: { mutation: boolean },
): Promise<{ ok: true; supabase: SupabaseClient; user: User } | { ok: false; response: NextResponse }> {
  if (mutation && !sameOrigin(request)) return { ok: false, response: apiFail("Origen de solicitud inválido.", 403) };
  const supabase = await createClient();
  const session = await getSession(supabase);
  if (session.status === "unavailable") return { ok: false, response: apiFail("El servicio de acceso no está disponible.", 503) };
  if (session.status !== "user") return { ok: false, response: apiFail("Inicia sesión como administrador.", 401) };
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error) return { ok: false, response: apiFail("No pudimos verificar permisos. Intenta nuevamente.", 503) };
  if (!isAdmin) return { ok: false, response: apiFail("Solo administración.", 403) };
  return { ok: true, supabase, user: session.user };
}
