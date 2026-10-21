"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const str = (f: FormData, k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string).trim() : "");

export async function signIn(formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!EMAIL.test(email) || !password) redirect("/mi-cuenta?error=credenciales");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Mensaje único: no revela si el correo existe ni si falta confirmarlo.
  if (error) redirect("/mi-cuenta?error=credenciales");
  redirect("/mi-cuenta");
}

export async function signUp(formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!EMAIL.test(email) || email.length > 254) redirect("/mi-cuenta?error=email&modo=registro");
  if (password.length < 10 || password.length > 72) redirect("/mi-cuenta?error=clave&modo=registro");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) redirect("/mi-cuenta?error=registro&modo=registro");
  // El rol siempre nace como "customer" (trigger en la base): registrarse nunca da acceso admin.
  if (data.session) redirect("/mi-cuenta");
  redirect("/mi-cuenta?aviso=registro");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/mi-cuenta");
}
