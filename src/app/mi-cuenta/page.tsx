import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { DeletePrescriptionButton } from "@/components/delete-prescription-button";
import { CLIENT_LABEL, isReviewStatus } from "@/lib/prescription-review";
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

type SP = Promise<{ error?: string; aviso?: string; modo?: string; reemplazar?: string }>;

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

async function Account({ userId, email, replacement }: { userId: string; email: string | undefined; replacement?: string }) {
  const supabase = await createClient();
  // Filtro explícito de dueño: un administrador ve todas las filas por RLS, pero aquí solo van las suyas.
  const [{ data: rx, error: rxErr }, { data: quotes, error: quotesErr }] = await Promise.all([
    supabase.from("prescriptions").select("id, created_at, quote_id, status, status_changed_at, client_message, replaces_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("quotes").select("id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);
  const quoteOpts = (quotes ?? []).map((q) => ({ id: q.id, label: `Cotización del ${new Date(q.created_at).toLocaleDateString("es-CL")}` }));
  const replacementRow = rx?.find((r) => r.id === replacement && r.status === "needs_new_file" && !rx.some((o) => o.replaces_id === r.id));
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section aria-labelledby="enviar">
        <p className="mb-4 text-sm text-muted">Sesión iniciada como <strong>{email}</strong>.</p>
        <h2 id="enviar" className="mb-3 text-2xl">Enviar mi receta</h2>
        {quotesErr && <p role="alert" className="mb-3 text-sm text-red-700">No pudimos cargar tus cotizaciones; puedes enviar la receta sin asociarla.</p>}
        {replacement && !replacementRow && <p role="alert" className="mb-3 text-sm">Ese archivo ya no está esperando un reemplazo. Puedes enviar una receta nueva.</p>}
        {replacementRow && <Link href="/mi-cuenta#enviar" className="mb-3 inline-flex min-h-11 items-center underline">Cancelar reemplazo</Link>}
        <PrescriptionUpload key={replacementRow?.id ?? "new"} quotes={quoteOpts} replacesId={replacementRow?.id} />
        <form action={signOut} className="mt-6"><button className="btn btn-ghost">Cerrar sesión</button></form>
      </section>
      <section aria-labelledby="mis">
        <h2 id="mis" className="mb-3 text-2xl">Mis recetas</h2>
        {rxErr ? (
          <p role="alert" className="text-sm text-red-700">No pudimos cargar tus recetas en este momento. Intenta recargar la página.</p>
        ) : !rx?.length ? (
          <p className="text-muted">Aún no has enviado ninguna receta.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {rx.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="max-w-prose text-sm">
                  Enviada el {new Date(r.created_at).toLocaleString("es-CL")}
                  {isReviewStatus(r.status) ? (
                    <>
                      <span className="block font-medium">{CLIENT_LABEL[r.status].title}</span>
                      <span className="block text-xs text-muted">{CLIENT_LABEL[r.status].detail}</span>
                      {r.status === "needs_new_file" && r.client_message && (
                        <span className="mt-1 block border-l-2 border-olive pl-2 text-sm">Motivo: {r.client_message}</span>
                      )}
                      {r.status === "needs_new_file" && (rx.some((o) => o.replaces_id === r.id)
                        ? <span className="block text-xs text-muted">Ya enviaste el archivo nuevo.</span>
                        : <Link href={`/mi-cuenta?reemplazar=${r.id}#enviar`} className="mt-1 inline-flex min-h-11 items-center text-sm underline">Subir un archivo nuevo</Link>)}
                    </>
                  ) : (
                    <span className="block text-xs text-muted">Pendiente de revisión por una persona</span>
                  )}
                </span>
                <span className="flex flex-wrap items-start gap-2">
                  <OpenPrescriptionButton id={r.id} />
                  <DeletePrescriptionButton
                    id={r.id}
                    warning={rx.some((o) => o.replaces_id === r.id)
                      // Borrar sigue permitido (privacidad); solo se avisa del contexto que se pierde. No se guardan copias del motivo.
                      ? "Esta receta ya tiene un archivo de reemplazo. Si la eliminas, también se borran su motivo y su historial, y el equipo dejará de ver qué archivo reemplazó el nuevo."
                      : r.replaces_id
                        ? "Este archivo reemplaza a uno anterior. Si lo eliminas, la receta anterior volverá a esperar un archivo nuevo."
                        : undefined}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted">
          Los enlaces para abrir una receta duran 60 segundos. Solo tú y el equipo autorizado pueden verla. Puedes eliminarla cuando quieras.
        </p>
      </section>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: SP }) {
  const supabase = await createClient();
  const session = await getSession(supabase);
  if (session.status === "unavailable") {
    return (
      <div role="alert" className="max-w-md border border-line bg-white/60 p-6">
        <h2 className="text-2xl">No pudimos verificar tu sesión</h2>
        <p className="mt-2 text-muted">El servicio de acceso no respondió. No es un problema de tu cuenta: inténtalo de nuevo en un momento.</p>
        {/* Recarga completa a propósito: reintenta la consulta al servidor. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/mi-cuenta" className="btn mt-4">Reintentar</a>
      </div>
    );
  }
  return session.status === "user" ? <Account userId={session.user.id} email={session.user.email} replacement={(await searchParams).reemplazar} /> : <AuthForms searchParams={searchParams} />;
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
