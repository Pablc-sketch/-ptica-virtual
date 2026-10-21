import type { SupabaseClient, User } from "@supabase/supabase-js";

export type SessionResult =
  | { status: "user"; user: User }
  | { status: "anonymous" }
  | { status: "unavailable" };

// Distingue "no hay sesión" (anónimo, incluida una cookie caducada o inválida) de "el servicio de acceso
// falló" (red, 5xx): lo segundo nunca debe presentarse como si la persona simplemente no hubiera ingresado.
export async function getSession(supabase: SupabaseClient): Promise<SessionResult> {
  const { data, error } = await supabase.auth.getUser();
  if (data.user) return { status: "user", user: data.user };
  if (!error) return { status: "anonymous" };
  const status = (error as { status?: number }).status;
  if (error.name === "AuthSessionMissingError" || (typeof status === "number" && status >= 400 && status < 500)) {
    return { status: "anonymous" };
  }
  return { status: "unavailable" };
}
