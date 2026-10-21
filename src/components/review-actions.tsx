"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import {
  ADMIN_ACTION, REASON_MAX, allowedTransitions, validateReason, type ReviewStatus,
} from "@/lib/prescription-review";

// Acciones de revisión. Envía la versión vista: si otra persona cambió la receta, la base responde conflicto (409).
export function ReviewActions({ id, status, version }: { id: string; status: ReviewStatus; version: number }) {
  const router = useRouter();
  const reasonId = useId();
  const [askingReason, setAskingReason] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const options = allowedTransitions(status);
  if (options.length === 0) return null;

  async function send(to: ReviewStatus) {
    const invalid = validateReason(to, reason);
    if (invalid) return setMsg({ ok: false, text: invalid });
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/recetas/${id}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, expected_version: version, reason: to === "needs_new_file" ? reason : undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: body.error ?? "No pudimos actualizar la receta." });
        if (res.status === 409 || res.status === 404) router.refresh();
        return;
      }
      setAskingReason(false);
      setReason("");
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Sin conexión con el servidor. Intenta nuevamente." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap gap-2">
        {options.filter((o) => o !== "needs_new_file").map((to) => (
          <button key={to} type="button" disabled={busy} onClick={() => send(to)} className={`btn !min-h-11 !px-3 ${to === "pending" ? "btn-ghost" : ""}`}>
            {ADMIN_ACTION[to]}
          </button>
        ))}
        {options.includes("needs_new_file") && !askingReason && (
          <button type="button" disabled={busy} onClick={() => setAskingReason(true)} className="btn btn-ghost !min-h-11 !px-3">
            {ADMIN_ACTION.needs_new_file}
          </button>
        )}
      </div>
      {askingReason && (
        <div className="flex flex-col gap-2 border border-line bg-white/60 p-3">
          <label htmlFor={reasonId}>Motivo visible para la persona</label>
          <textarea id={reasonId} value={reason} maxLength={REASON_MAX} onChange={(e) => setReason(e.target.value)} className="field" placeholder="Ej.: la foto está borrosa y no se lee el eje del ojo derecho." />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => send("needs_new_file")} className="btn !min-h-11 !px-3">Enviar solicitud</button>
            <button type="button" disabled={busy} onClick={() => { setAskingReason(false); setMsg(null); }} className="btn btn-ghost !min-h-11 !px-3">Cancelar</button>
          </div>
        </div>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-olive" : "text-red-700"}>{msg.text}</p>}
    </div>
  );
}
