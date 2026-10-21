import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { OpenPrescriptionButton } from "@/components/open-prescription-button";
import { ReviewActions } from "@/components/review-actions";
import { ADMIN_LABEL, isReviewStatus, type ReviewStatus } from "@/lib/prescription-review";

const FILTERS: { key: string; label: string; statuses: ReviewStatus[] }[] = [
  { key: "por-revisar", label: "Por revisar", statuses: ["pending", "in_review"] },
  { key: "nuevo-archivo", label: "Esperando nuevo archivo", statuses: ["needs_new_file"] },
  { key: "completadas", label: "Revisión completada", statuses: ["reviewed"] },
];

type Row = {
  id: string; user_id: string; created_at: string; consent_version: string; status: string; version: number;
  status_changed_at: string; client_message: string | null; replaces_id: string | null;
  quotes: { customer_name: string } | { customer_name: string }[] | null;
};
type Event = { prescription_id: string; from_status: string; to_status: string; message: string | null; created_at: string };

async function List({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const filter = FILTERS.find((f) => f.key === estado) ?? FILTERS[0];
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("prescriptions")
    .select("id, user_id, created_at, consent_version, status, version, status_changed_at, client_message, replaces_id, quotes(customer_name)")
    .in("status", filter.statuses)
    .order("created_at", { ascending: true })
    .limit(100)
    .overrideTypes<Row[], { merge: false }>();
  const ids = (data ?? []).map((r) => r.id);
  const { data: events, error: evErr } = ids.length
    ? await supabase.from("prescription_events").select("prescription_id, from_status, to_status, message, created_at").in("prescription_id", ids).order("created_at", { ascending: true }).limit(500).overrideTypes<Event[], { merge: false }>()
    : { data: [] as Event[], error: null };
  const label = (s: string) => (isReviewStatus(s) ? ADMIN_LABEL[s] : s);

  return (
    <>
      <nav aria-label="Filtrar recetas por estado" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/admin/recetas?estado=${f.key}`} aria-current={f.key === filter.key ? "page" : undefined}
            className={`btn !min-h-11 !px-3 ${f.key === filter.key ? "" : "btn-ghost"}`}>{f.label}</Link>
        ))}
      </nav>
      {error ? (
        <p role="alert" className="text-red-700">No se pudieron cargar las recetas.</p>
      ) : !data?.length ? (
        <p className="text-muted">No hay recetas en “{filter.label}”.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {data.map((r) => {
            const q = Array.isArray(r.quotes) ? r.quotes[0] : r.quotes;
            const status = isReviewStatus(r.status) ? r.status : null;
            const history = (events ?? []).filter((e) => e.prescription_id === r.id);
            return (
              <li key={r.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto]">
                <div className="text-sm">
                  <p><strong>{label(r.status)}</strong> · recibida el {new Date(r.created_at).toLocaleString("es-CL")}</p>
                  <p className="text-xs text-muted">
                    Cliente {r.user_id.slice(0, 8)}… · {q?.customer_name ? `cotización de ${q.customer_name}` : "sin cotización asociada"} · aviso {r.consent_version}
                    {r.replaces_id && " · reemplaza un archivo anterior"}
                  </p>
                  {r.client_message && <p className="mt-1">Motivo enviado: “{r.client_message}”</p>}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs underline">Historial ({history.length})</summary>
                    {evErr ? <p className="text-xs text-red-700">No se pudo cargar el historial.</p> : (
                      <ol className="mt-1 list-decimal pl-5 text-xs text-muted">
                        {history.map((e, i) => (
                          <li key={i}>{new Date(e.created_at).toLocaleString("es-CL")}: {label(e.from_status)} → {label(e.to_status)}{e.message ? ` (“${e.message}”)` : ""}</li>
                        ))}
                      </ol>
                    )}
                  </details>
                </div>
                <div className="flex flex-col items-start gap-2">
                  <OpenPrescriptionButton id={r.id} />
                  {status && <ReviewActions id={r.id} status={status} version={r.version} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function RecetasAdminPage({ searchParams }: PageProps<"/admin/recetas">) {
  return (
    <main className="container-page py-10">
      <h1 className="mb-6 text-4xl">Recetas</h1>
      <AdminNav />
      <p className="mb-4 text-sm text-muted">
        Revisión <strong>documental</strong>: confirma que el archivo es legible y completo para cotizar. No es una evaluación médica ni activa pagos.
        Cada apertura genera un enlace firmado de 60 segundos.
      </p>
      <Suspense fallback={<p role="status">Cargando…</p>}><List searchParams={searchParams} /></Suspense>
    </main>
  );
}
