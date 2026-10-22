"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {accountReturnPath} from '@/lib/prescription-context';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const str = (f: FormData, k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string).trim() : "");
const notice=(path:string,q:string)=>path+(path.includes('?')?'&':'?')+q;

export async function signIn(formData: FormData) {
  const back=accountReturnPath(str(formData,'return_to'));
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!EMAIL.test(email) || !password) redirect(notice(back,'error=credenciales'));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Mensaje único: no revela si el correo existe ni si falta confirmarlo.
  if (error) redirect(notice(back,'error=credenciales'));
  redirect(back);
}

export async function signUp(formData: FormData) {
  const back=accountReturnPath(str(formData,'return_to'));
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!EMAIL.test(email) || email.length > 254) redirect(notice(back,'error=email&modo=registro'));
  if (password.length < 10 || password.length > 72) redirect(notice(back,'error=clave&modo=registro'));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(notice(back,'error=registro&modo=registro'));
  // El rol siempre nace como "customer" (trigger en la base): registrarse nunca da acceso admin.
  if (data.session) redirect(back);
  redirect(notice(back,'aviso=registro'));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/mi-cuenta");
}
