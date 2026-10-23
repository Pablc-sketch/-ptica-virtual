"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {accountReturnPath} from '@/lib/prescription-context';
import { revalidatePath } from "next/cache";
import { parseAddress } from "@/lib/addresses";

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Volver a la selección si la dirección se agregó desde ahí.
const addressBack = (f: FormData) => (str(f, "return_to") === "/cotizar" ? "/cotizar" : "/mi-cuenta");

export async function addAddress(formData: FormData) {
  const back = addressBack(formData);
  const parsed = parseAddress((k) => formData.get(k));
  if (!parsed.ok) redirect(notice(back, `direccion=revisar&campo=${parsed.error}#direcciones`));
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/mi-cuenta");
  const { count } = await supabase.from("customer_addresses").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id);
  const { error } = await supabase.from("customer_addresses").insert({ ...parsed.value, user_id: auth.user.id, is_default: !count });
  if (error) redirect(notice(back, `direccion=${error.message.includes("address_limit") ? "tope" : "error"}#direcciones`));
  revalidatePath(back);
  redirect(notice(back, "direccion=guardada#direcciones"));
}

export async function deleteAddress(id: string) {
  if (!UUID.test(id)) redirect("/mi-cuenta");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/mi-cuenta");
  // RLS ya impide borrar direcciones ajenas; el filtro de dueño lo hace explícito.
  await supabase.from("customer_addresses").delete().eq("id", id).eq("user_id", auth.user.id);
  revalidatePath("/mi-cuenta");
  redirect("/mi-cuenta?direccion=borrada#direcciones");
}
