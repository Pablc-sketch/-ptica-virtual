import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { signIn, signOut, signUp } from "./actions";
import { PrescriptionUpload } from "@/components/prescription-upload";
import { OpenPrescriptionButton } from "@/components/open-prescription-button";
import Link from "next/link";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

const ERRORS: Record<string, string> = {
  credenciales: "Correo o contraseña incorrectos.",
  email: "Escribe un correo válido.",
  clave: "La contraseña debe tener entre 10 y 72 caracteres.",
  registro: "No pudimos crear la cuenta. Revisa los datos o intenta con otro correo.",
};

type SP = Promise<{ error?: string; aviso?: string; modo?: string }>;

async function AuthForms({ searchParams }: { searchParams: SP }) {
  const { error, aviso, modo } = await searchParams;
  const registro = modo === "registro";
  return (
    <div className="max-w-md">
      <p className="mb-6 text-muted">
        No necesitas cuenta para explorar los marcos. La cuenta sirve para enviar tu receta de forma privada y verla después.
      </p>
      {aviso === "registro" && (
        <p role="status" className="mb-4 border border-line bg-sage/50 p-3 text-sm">
          Registro recibido. Si el sistema de acceso pide confirmar tu correo, hazlo y luego ingresa aquí.
        </p>
      )}
      {error && <p role="alert" className="mb-4 text-sm text-red-700">{ERRORS[error] ?? "Ocurrió un problema."}</p>}
      <h2 className="mb-3 text-2xl">{registro ? "Crear cuenta" : "Ingresar"}</h2>
      <form action={registro ? signUp : signIn} className="flex flex-col gap-3">
        <label>Correo<input name="email" type="email" required autoComplete="email" className="field mt-1" /></label>
        <label>
          Contraseña
          <input name="password" type="password" required minLength={registro ? 10 : 1} maxLength={72}
            autoComplete={registro ? "new-password" : "current-password"} className="field mt-1" />
        </label>
        {registro && <p className="-mt-1 text-xs text-muted">Mínimo 10 caracteres.</p>}
        <button className="btn">{registro ? "Crear cuenta" : "Ingresar"}</button>
      </form>
      <p className="mt-4 text-sm">
        {registro ? (
          <>¿Ya tienes cuenta? <Link href="/mi-cuenta" className="underline">Ingresar</Link></>
        ) : (
          <>¿Primera vez? <Link href="/mi-cuenta?modo=registro" className="underline">Crear cuenta</Link></>
        )}
      </p>
    </div>
  );
}

async function Account() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const [{ data: rx, error: rxErr }, { data: quotes }] = await Promise.all([
    supabase.from("prescriptions").select("id, created_at, quote_id").order("created_at", { ascending: false }).limit(50),
    supabase.from("quotes").select("id, created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  const quoteOpts = (quotes ?? []).map((q) => ({ id: q.id, label: `Cotización del ${new Date(q.created_at).toLocaleDateString("es-CL")}` }));
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section aria-labelledby="enviar">
        <p className="mb-4 text-sm text-muted">Sesión iniciada como <strong>{user.email}</strong>.</p>
        <h2 id="enviar" className="mb-3 text-2xl">Enviar mi receta</h2>
        <PrescriptionUpload quotes={quoteOpts} />
        <form action={signOut} className="mt-6"><button className="btn btn-ghost">Cerrar sesión</button></form>
      </section>
      <section aria-labelledby="mis">
        <h2 id="mis" className="mb-3 text-2xl">Mis recetas</h2>
        {rxErr ? (
          <p role="alert" className="text-sm text-red-700">La recepción privada de recetas aún no está disponible.</p>
        ) : !rx?.length ? (
          <p className="text-muted">Aún no has enviado ninguna receta.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {rx.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="text-sm">
                  Enviada el {new Date(r.created_at).toLocaleString("es-CL")}
                  <span className="block text-xs text-muted">Pendiente de revisión por una persona</span>
                </span>
                <OpenPrescriptionButton id={r.id} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted">
          Los enlaces para abrir una receta duran 60 segundos. Solo tú y el equipo autorizado pueden verla.
        </p>
      </section>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: SP }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? <Account /> : <AuthForms searchParams={searchParams} />;
}

export default function MiCuentaPage({ searchParams }: PageProps<"/mi-cuenta">) {
  return (
    <main className="container-page py-10 md:py-14">
      <p className="eyebrow">Mi cuenta</p>
      <h1 className="mb-8 text-[clamp(40px,6vw,72px)]">Mi cuenta</h1>
      <Suspense fallback={<p role="status" className="text-muted">Cargando…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
