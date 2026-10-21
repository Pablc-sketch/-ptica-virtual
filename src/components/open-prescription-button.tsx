"use client";

import { useState } from "react";

// Abre la receta mediante GET /api/recetas/[id]: URL firmada de 60 s, nunca una URL pública.
export function OpenPrescriptionButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function open() {
    setBusy(true);
    setErr("");
    const win = window.open("about:blank", "_blank"); // sincrónico para evitar el bloqueo de ventanas
    try {
      const res = await fetch(`/api/recetas/${id}`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) throw new Error(body.error ?? "No pudimos abrir el archivo.");
      if (win) {
        win.opener = null;
        win.location.href = body.url;
      } else {
        window.location.href = body.url;
      }
    } catch (e) {
      win?.close();
      setErr(e instanceof Error ? e.message : "No pudimos abrir el archivo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={open} disabled={busy} className="btn btn-ghost !min-h-11 !px-3 text-sm">
        {busy ? "Abriendo…" : "Abrir (enlace por 60 s)"}
      </button>
      {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
    </span>
  );
}
