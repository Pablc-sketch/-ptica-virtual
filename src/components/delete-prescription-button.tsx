"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Confirmación en línea (no window.confirm): accesible con teclado y lector de pantalla.
export function DeletePrescriptionButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const askRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // El foco se mueve en un efecto, cuando el DOM ya refleja el nuevo estado (no antes).
  const returnFocus = useRef(false);
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      askRef.current?.focus();
    }
  }, [confirming]);

  function ask() {
    setErr("");
    setConfirming(true);
  }
  function cancel() {
    returnFocus.current = true;
    setConfirming(false);
  }
  async function remove() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/recetas/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "No pudimos eliminar la receta.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No pudimos eliminar la receta.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <span className="inline-flex flex-col items-start gap-1">
        <button ref={askRef} type="button" onClick={ask} className="btn btn-ghost !min-h-11 !px-3 text-sm">Eliminar</button>
        {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
      </span>
    );
  }
  return (
    <span role="group" aria-label="Confirmar eliminación de la receta" className="inline-flex flex-col items-start gap-1">
      <span className="text-sm">¿Eliminar esta receta definitivamente? No se puede deshacer.</span>
      <span className="flex gap-2">
        <button ref={confirmRef} type="button" onClick={remove} disabled={busy} className="btn !min-h-11 !px-3 text-sm">
          {busy ? "Eliminando…" : "Sí, eliminar"}
        </button>
        <button type="button" onClick={cancel} disabled={busy} className="btn btn-ghost !min-h-11 !px-3 text-sm">Cancelar</button>
      </span>
      {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
    </span>
  );
}
