"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateOrderButton({ prescriptionId }: { prescriptionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function create() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/pedidos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prescription_id: prescriptionId }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.id) throw new Error(body.error ?? "No pudimos crear el borrador.");
      router.push(`/admin/pedidos/${body.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No pudimos crear el borrador.");
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={create} disabled={busy} className="btn btn-ghost !min-h-11 !px-3 text-sm">{busy ? "Creando…" : "Crear borrador de pedido"}</button>
      {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
    </span>
  );
}
