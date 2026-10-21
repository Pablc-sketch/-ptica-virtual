import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";

export async function requireAdmin() {
  const supabase = await createClient();
  const session = await getSession(supabase);
  // Un fallo del servicio de acceso no es "sin sesión": se informa en vez de reenviar al login.
  if (session.status === "unavailable") throw new Error("auth_unavailable");
  if (session.status === "anonymous") redirect("/admin/login");
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error) throw new Error("admin_check_failed");
  if (!isAdmin) redirect("/admin/login?error=no-admin");
  return { supabase, user: session.user };
}
