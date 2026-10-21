"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearSelection, setQuantity, toggleSelection, useSelection } from "@/lib/local-store";
import { clp } from "@/lib/format";
import { productPrice } from "@/lib/product-price";
import { FrameOutline } from "@/components/frame-outline";

type Line = { id: string; name: string; price_clp: number | null; pair_base_price_clp?: number | null; is_sample?: boolean };

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
    // El cliente de Supabase (≈250 KB) se importa bajo demanda: así no viaja en las demás páginas por la precarga del enlace.
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const { data, error } = await createClient().from("products").select("id, name, price_clp, pair_base_price_clp, is_sample").in("id", ids.split(","));
        if (cancelled) return;
        if (error) setLoadError(true);
        else setLines(data ?? []);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const byId = new Map((lines ?? []).map((l) => [l.id, l]));
  const pricing = (l: Line) => productPrice({priceClp:l.price_clp,pairBasePriceClp:l.pair_base_price_clp});
  const complete = !loadError && selection.every(s=>{const l=byId.get(s.id);return l && pricing(l).amount !== null;});
  const total = complete ? selection.reduce((acc,s)=>acc+pricing(byId.get(s.id)!).amount!*s.quantity,0) : null;
  const canSubmit = complete && selection.every(s=>{const l=byId.get(s.id);return l && !l.is_sample && l.price_clp !== null && l.price_clp>0;});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!open || !canSubmit || state === "sending") return;
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
      <div className="empty-selection">
        <div className="empty-icon w-32"><FrameOutline /></div>
        <h2>Tu próxima mirada empieza aquí.</h2>
        <p>Tu selección está vacía. Explora el catálogo y agrega los marcos que quieras conocer mejor.</p>
        <Link href="/marcos" className="btn">Explorar marcos <span aria-hidden="true">↗</span></Link>
      </div>
    );
  }

  return (
    <div className="quote-filled grid gap-10 md:grid-cols-[1.2fr_1fr]">
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
                <span className="w-32 text-right text-sm">{l && pricing(l).amount !== null ? <>{clp(pricing(l).amount! * s.quantity)}<small className="block text-muted">{pricing(l).label}</small></> : "Por confirmar"}</span>
                <button type="button" onClick={() => toggleSelection(s.id)} className="min-h-11 px-2 text-sm underline">Quitar</button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 flex justify-between text-lg"><span>Total inicial de selección</span><span>{total === null ? "Por confirmar" : clp(total)}</span></p>
        <p className="mt-1 text-sm text-muted">La graduación, los tratamientos y la entrega se confirman después de revisar tu receta. Las muestras necesitan comprobar disponibilidad y detalles antes de cotizar.</p>
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
              <input type="checkbox" name="consent" required className="mt-1 h-5 w-5 accent-olive" />
              <span>Acepto que usen mis datos para responder esta cotización. Leí el <Link href="/privacidad" className="underline">aviso de privacidad (borrador)</Link>.</span>
            </label>
            {state === "error" && <p role="alert" className="text-sm text-red-700">{message}</p>}
            {!canSubmit && lines !== null && <p role="status" className="text-sm">Esta selección necesita comprobar precio o disponibilidad antes del envío.</p>}
            <button className="btn" disabled={state === "sending" || !canSubmit}>{state === "sending" ? "Enviando…" : "Enviar cotización"}</button>
          </form>
        )}
      </section>
    </div>
  );
}
