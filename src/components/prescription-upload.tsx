"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MAX = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function PrescriptionUpload({ quotes }: { quotes: { id: string; label: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const file = f.get("file");
    if (!(file instanceof File) || file.size === 0) return setMsg({ ok: false, text: "Selecciona un archivo." });
    if (file.size > MAX) return setMsg({ ok: false, text: "El archivo no puede superar 4 MB." });
    if (file.type && !TYPES.includes(file.type)) return setMsg({ ok: false, text: "Usa JPG, PNG, WebP o PDF." });
    if (f.get("consent") !== "true") return setMsg({ ok: false, text: "Necesitamos tu consentimiento para revisar la receta." });
    if (!f.get("quote_id")) f.delete("quote_id");
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/recetas", { method: "POST", body: f });
      const body = await res.json().catch(() => ({}));
      if (res.status === 201) {
        form.reset();
        setMsg({ ok: true, text: "Recibimos tu receta. Queda pendiente de revisión por una persona; todavía no está confirmada." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: body.error ?? "No pudimos enviar la receta." });
      }
    } catch {
      setMsg({ ok: false, text: "No hay conexión con el servidor. Inténtalo de nuevo." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-3 border border-line bg-white/60 p-5">
      <label>
        Archivo de tu receta (JPG, PNG, WebP o PDF, máx. 4 MB)
        <input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" required className="field mt-1 !py-2" />
      </label>
      {quotes.length > 0 && (
        <label>
          Asociar a una cotización (opcional)
          <select name="quote_id" className="field mt-1" defaultValue="">
            <option value="">Ninguna</option>
            {quotes.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}
          </select>
        </label>
      )}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" value="true" required className="mt-1 h-5 w-5 accent-olive" />
        <span>
          Autorizo que el equipo de la óptica revise mi receta para cotizar. Leí el{" "}
          <Link href="/privacidad" className="underline">aviso de privacidad (borrador)</Link>.
        </span>
      </label>
      <button className="btn self-start" disabled={busy}>{busy ? "Enviando…" : "Enviar receta"}</button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-olive" : "text-red-700"}`}>{msg.text}</p>}
    </form>
  );
}
