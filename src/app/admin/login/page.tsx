import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function signIn(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) redirect("/admin/login?error=credenciales");
  const {data:allowed,error:roleError}=await supabase.rpc("is_admin");
  if(roleError||!allowed){await supabase.auth.signOut();redirect("/admin/login?error=credenciales");}
  redirect("/admin");
}

async function LoginForm({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-6 text-4xl">Óptica Global</h1><p className="mb-6 text-muted">Acceso privado de administración</p>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error === "no-admin" ? "Tu usuario no tiene permisos de administrador." : "Credenciales incorrectas."}
        </p>
      )}
      <form action={signIn} className="flex flex-col gap-3">
        <label htmlFor="admin-email" className="text-sm">Correo electrónico</label>
        <input id="admin-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required className="field" />
        <label htmlFor="admin-password" className="text-sm">Contraseña</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" required className="field" />
        <button className="btn">Entrar</button>
      </form>
    </main>
  );
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense fallback={<main className="p-8">Cargando…</main>}>
      <LoginForm searchParams={searchParams} />
    </Suspense>
  );
}

