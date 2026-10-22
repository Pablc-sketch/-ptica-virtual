"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BLOCKER_TEXT, FIELD_LABEL, ORDER_TRANSITIONS, orderBlocker, parseField, type LabOrder, type RxField,
} from "@/lib/lab-order";

const EYE_ROWS: { eye: "OD" | "OI"; fields: RxField[] }[] = [
  { eye: "OD", fields: ["od_sph", "od_cyl", "od_axis", "od_add", "od_pd", "od_height"] },
  { eye: "OI", fields: ["oi_sph", "oi_cyl", "oi_axis", "oi_add", "oi_pd", "oi_height"] },
];
const COL = ["ESF", "CIL", "EJE", "ADD", "DP mono (mm)", "Altura (mm)"];
const fmt = (v: number | null) => (v == null ? "" : String(v).replace(".", ","));

export function LabOrderEditor({ order, prescriptionReviewed, procurementConfirmed }: {
  order: LabOrder; prescriptionReviewed: boolean; procurementConfirmed: boolean;
}) {
  const router = useRouter();
  const editable = order.status === "draft";
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(EYE_ROWS.flatMap((r) => r.fields).map((f) => [f, fmt(order[f])])),
    measured_by: order.measured_by ?? "", measured_at: order.measured_at ?? "", notes: order.notes ?? "",
    measurement_source: order.measurement_source ?? "",
  }));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const parsed = useMemo(() => {
    const out: Partial<Record<RxField, number | null>> = {};
    const errors: string[] = [];
    for (const f of EYE_ROWS.flatMap((r) => r.fields)) {
      const p = parseField(f, values[f] ?? "");
      if ("error" in p) errors.push(p.error); else out[f] = p.value;
    }
    return { out, errors };
  }, [values]);
  // Cambio = cualquier diferencia en lo ESCRITO (también si aún es inválido), para que "Guardar" explique el error.
  const dirty = EYE_ROWS.flatMap((r) => r.fields).some((f) => (values[f] ?? "").trim() !== fmt(order[f])
      && !(parsed.out[f] !== undefined && parsed.out[f] === order[f]))
    || (values.measured_by || null) !== order.measured_by || (values.measured_at || null) !== order.measured_at
    || (values.notes || null) !== order.notes || (values.measurement_source || null) !== order.measurement_source;
  const blocker = orderBlocker(
    { ...order, ...parsed.out, measurement_source: (values.measurement_source || null) as LabOrder["measurement_source"],
      measured_by: values.measured_by || null, measured_at: values.measured_at || null },
    { prescriptionReviewed, procurementConfirmed },
  );
  const isMulti = order.family !== "Monofocal";

  async function call(url: string, method: string, body: object) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ ok: false, text: data.error ?? "No pudimos guardar." }); if (res.status === 409) router.refresh(); return false; }
      router.refresh();
      return true;
    } catch {
      setMsg({ ok: false, text: "Sin conexión con el servidor. Tus cambios siguen en pantalla." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (parsed.errors.length) return setMsg({ ok: false, text: parsed.errors.join(" ") });
    const ok = await call(`/api/admin/pedidos/${order.id}`, "PATCH", {
      expected_version: order.version, ...parsed.out,
      measurement_source: values.measurement_source || null, measured_by: values.measured_by || null,
      measured_at: values.measured_at || null, notes: values.notes || null,
    });
    if (ok) setMsg({ ok: true, text: "Transcripción guardada (sigue en borrador)." });
  }
  const transition = (to: "validated" | "draft" | "cancelled") =>
    call(`/api/admin/pedidos/${order.id}/estado`, "POST", { to, expected_version: order.version, confirm_transcription: to === "validated" ? confirm : undefined });

  return (
    <div className="space-y-6">
      <fieldset disabled={!editable || busy} className="space-y-4">
        <legend className="mb-2 text-2xl">Transcripción manual desde el archivo original</legend>
        <div className="overflow-x-auto">
          <table className="min-w-[640px] border-collapse text-sm">
            <caption className="sr-only">RX por ojo</caption>
            <thead><tr><th scope="col" className="p-2 text-left">Ojo</th>{COL.map((c) => <th key={c} scope="col" className="p-2 text-left">{c}</th>)}</tr></thead>
            <tbody>
              {EYE_ROWS.map((row) => (
                <tr key={row.eye} className="border-t border-line">
                  <th scope="row" className="p-2 text-left">{row.eye}</th>
                  {row.fields.map((f) => (
                    <td key={f} className="p-1">
                      <input aria-label={FIELD_LABEL[f]} inputMode="decimal" value={values[f]} onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))}
                        className="field !min-h-11 w-24" disabled={(f.endsWith("_add") || f.endsWith("_height")) && !isMulti && !values[f]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isMulti && <p className="text-xs text-muted">Monofocal: sin ADD ni alturas. Si la receta solo trae ADD para cerca, no la conviertas: deja el pedido en revisión.</p>}
        {isMulti && (
          <div className="grid gap-3 border border-line bg-white/60 p-4 sm:grid-cols-3">
            <label className="flex items-start gap-2 text-sm sm:col-span-3">
              <input type="checkbox" checked={values.measurement_source === "professional_on_fitted_frame"} className="mt-1 h-5 w-5"
                onChange={(e) => setValues((v) => ({ ...v, measurement_source: e.target.checked ? "professional_on_fitted_frame" : "" }))} />
              Alturas y DP medidas por un profesional sobre el marco ajustado (no con selfie ni estimación).
            </label>
            <label className="text-sm">Responsable de la medición<input value={values.measured_by} maxLength={120} onChange={(e) => setValues((v) => ({ ...v, measured_by: e.target.value }))} className="field mt-1" /></label>
            <label className="text-sm">Fecha de la medición<input type="date" value={values.measured_at} onChange={(e) => setValues((v) => ({ ...v, measured_at: e.target.value }))} className="field mt-1" /></label>
          </div>
        )}
        <label className="block text-sm">Notas internas (opcional)<textarea value={values.notes} maxLength={1000} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} className="field mt-1" /></label>
        {parsed.errors.length > 0 && <ul role="alert" className="list-disc pl-5 text-sm text-red-700">{parsed.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        {editable && <button type="button" className="btn" onClick={save} disabled={busy || !dirty}>{busy ? "Guardando…" : "Guardar transcripción"}</button>}
      </fieldset>

      <section aria-labelledby="validar" className="border-t border-line pt-4">
        <h2 id="validar" className="mb-2 text-2xl">Estado</h2>
        {order.status === "draft" && (
          blocker ? (
            <p role="status" className="text-sm"><strong>Bloqueado para validar:</strong> {BLOCKER_TEXT[blocker]}</p>
          ) : dirty ? (
            <p role="status" className="text-sm">Guarda la transcripción antes de validar.</p>
          ) : (
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1 h-5 w-5" />
                Comparé cada valor con el archivo original de la receta. Validar prepara el pedido; no reemplaza la revisión profesional ni lo envía a Fides.
              </label>
              <button type="button" className="btn" disabled={busy || !confirm} onClick={() => transition("validated")}>Validar pedido</button>
            </div>
          )
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {ORDER_TRANSITIONS[order.status].includes("draft") && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => transition("draft")}>Reabrir como borrador</button>}
          {ORDER_TRANSITIONS[order.status].includes("cancelled") && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { if (window.confirm("¿Cancelar este pedido? No se puede deshacer.")) transition("cancelled"); }}>Cancelar pedido</button>}
        </div>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-olive" : "text-red-700"}`}>{msg.text}</p>}
      </section>
    </div>
  );
}
