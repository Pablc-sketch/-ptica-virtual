import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function signIn(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) redirect("/admin/login?error=credenciales");
  redirect("/admin");
}

async function LoginForm({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-6 text-2xl font-semibold">Administración</h1>
      {error && (
        <p className="mb-4 text-sm text-red-600">
          {error === "no-admin" ? "Tu usuario no tiene permisos de administrador." : "Credenciales incorrectas."}
        </p>
      )}
      <form action={signIn} className="flex flex-col gap-3">
        <input name="email" type="email" required placeholder="Email" className="rounded border p-2" />
        <input name="password" type="password" required placeholder="Contraseña" className="rounded border p-2" />
        <button className="rounded bg-black p-2 text-white">Entrar</button>
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
