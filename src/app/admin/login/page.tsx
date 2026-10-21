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
  redirect("/admin");
}

async function LoginForm({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-6 text-4xl">Administración</h1>
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

