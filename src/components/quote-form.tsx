"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearSelection, setQuantity, toggleSelection, useSelection } from "@/lib/local-store";
import { clp } from "@/lib/format";

type Line = { id: string; name: string; price_clp: number };

export function QuoteForm({ open }: { open: boolean }) {
  const selection = useSelection();
  const ids = selection.map((s) => s.id).join(",");
  const [lines, setLines] = useState<Line[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!ids) return;
    createClient()
      .from("products")
      .select("id, name, price_clp")
      .in("id", ids.split(","))
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setLoadError(true);
        else setLines(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const byId = new Map((lines ?? []).map((l) => [l.id, l]));
  const total = selection.reduce((acc, s) => acc + (byId.get(s.id)?.price_clp ?? 0) * s.quantity, 0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          notes: f.get("notes"),
          items: selection.map((s) => ({ product_id: s.id, quantity: s.quantity })),
        }),
      });
      if (res.status === 201) {
        clearSelection();
        setState("done");
        return;
      }
      const body = await res.json().catch(() => ({}));
      setMessage(body.error ?? "No pudimos enviar tu cotización.");
      setState("error");
    } catch {
      setMessage("No hay conexión con el servidor. Tu selección sigue guardada; inténtalo de nuevo.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div role="status" className="border border-line bg-white/60 p-8">
        <h2 className="text-3xl">Recibimos tu cotización</h2>
        <p className="mt-3 text-muted">Te contactaremos para revisar tu receta y confirmar el total. Esto no es una compra.</p>
        <Link href="/marcos" className="btn mt-6">Seguir mirando</Link>
      </div>
    );
  }

  if (selection.length === 0) {
    return (
      <div className="border border-line bg-white/60 p-8 text-center">
        <h2 className="text-3xl">Tu selección está vacía</h2>
        <p className="mt-3 text-muted">Agrega marcos desde el catálogo para pedir una cotización.</p>
        <Link href="/marcos" className="btn mt-6">Ver marcos</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
      <section aria-labelledby="sel">
        <h2 id="sel" className="mb-4 text-2xl">Tu selección</h2>
        {loadError && <p role="alert" className="mb-3 text-sm text-red-700">No pudimos cargar los precios. Recarga la página.</p>}
        <ul className="divide-y divide-line border-y border-line">
          {selection.map((s) => {
            const l = byId.get(s.id);
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0 flex-1">{l ? l.name : lines === null ? "Cargando…" : "Marco ya no disponible"}</span>
                <label className="flex items-center gap-2 text-sm">
                  Cant.
                  <input type="number" min={1} max={10} value={s.quantity} onChange={(e) => setQuantity(s.id, Number(e.target.value))} className="field !w-16" />
                </label>
                <span className="w-28 text-right">{l ? clp(l.price_clp * s.quantity) : "—"}</span>
                <button type="button" onClick={() => toggleSelection(s.id)} className="min-h-11 px-2 text-sm underline">Quitar</button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 flex justify-between text-lg"><span>Total referencial de marcos</span><span>{clp(total)}</span></p>
        <p className="mt-1 text-sm text-muted">El precio de los cristales y la entrega se confirma contigo después de revisar tu receta.</p>
      </section>

      <section aria-labelledby="datos">
        <h2 id="datos" className="mb-4 text-2xl">Tus datos</h2>
        {!open ? (
          <div className="border border-line bg-sage/40 p-5" role="status">
            <p className="font-medium">Las cotizaciones todavía no están abiertas.</p>
            <p className="mt-1 text-sm text-muted">Tu selección queda guardada en este dispositivo. Aún no puedes enviarla.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label>Nombre<input name="name" required minLength={2} maxLength={120} autoComplete="name" className="field mt-1" /></label>
            <label>Email<input name="email" type="email" autoComplete="email" className="field mt-1" /></label>
            <label>Teléfono<input name="phone" type="tel" minLength={6} maxLength={30} autoComplete="tel" className="field mt-1" /></label>
            <p className="-mt-1 text-xs text-muted">Indica al menos email o teléfono.</p>
            <label>Comentarios<textarea name="notes" maxLength={2000} className="field mt-1" /></label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="consent" required className="mt-1 h-5 w-5 accent-[#424d3b]" />
              <span>Acepto que usen mis datos para responder esta cotización. Leí el <Link href="/privacidad" className="underline">aviso de privacidad (borrador)</Link>.</span>
            </label>
            {state === "error" && <p role="alert" className="text-sm text-red-700">{message}</p>}
            <button className="btn" disabled={state === "sending" || lines === null}>{state === "sending" ? "Enviando…" : "Enviar cotización"}</button>
          </form>
        )}
      </section>
    </div>
  );
}
