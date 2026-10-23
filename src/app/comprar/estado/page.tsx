import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { clp } from "@/lib/format";
import { paymentsEnabled } from "@/lib/mercadopago";
import { syncPayment } from "@/lib/store-orders";

export const metadata: Metadata = { title: "Estado de tu compra", robots: { index: false } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LENS: Record<string, string> = { basico: "cristal básico", antirreflejo: "antirreflejo", "filtro-azul": "filtro de luz azul" };
const WHATSAPP = "https://wa.me/56975512281?text=";

async function Estado({ searchParams }: { searchParams: PageProps<"/comprar/estado">["searchParams"] }) {
  const q = await searchParams;
  const id = typeof q.pedido === "string" ? q.pedido : "", token = typeof q.t === "string" ? q.t : "";
  if (!UUID.test(id) || !/^[0-9a-f]{20,64}$/.test(token)) return <p role="alert">No encontramos esa compra.</p>;
  // Al volver desde Mercado Pago se verifica el pago contra su API (no se confía en los parámetros de la URL).
  const paymentId = typeof q.payment_id === "string" ? q.payment_id : typeof q.collection_id === "string" ? q.collection_id : "";
  if (paymentId && paymentsEnabled()) await syncPayment(paymentId);
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_store_order", { p_order: id, p_token: token });
  const o = Array.isArray(data) ? data[0] : data;
  if (!o) return <p role="alert">No encontramos esa compra.</p>;
  const ref = id.slice(0, 8).toUpperCase();
  const paid = !["pending_payment", "rejected", "cancelled"].includes(o.status);
  return (
    <div className="max-w-xl border border-line bg-white/60 p-8">
      <p className="eyebrow">Compra {ref}</p>
      <h2 className="mt-2 text-3xl">{paid ? "¡Pago recibido!" : o.status === "rejected" ? "El pago no se completó" : "Pago pendiente"}</h2>
      <p className="mt-3">{o.product_name}{o.color_name ? `, ${o.color_name.toLowerCase()}` : ""}{o.lens_option ? `, ${LENS[o.lens_option]}` : ""} · <strong>{clp(o.total_clp)}</strong></p>
      {paid && o.needs_prescription && (
        <div className="mt-5 border-l-2 border-olive pl-4">
          <p className="font-medium">Siguiente paso: envíanos tu receta.</p>
          <p className="mt-1 text-sm text-muted">Un profesional la revisa antes de fabricar tus lentes. Puedes enviarla por WhatsApp o crear tu cuenta y subirla de forma privada.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a className="btn" href={`${WHATSAPP}${encodeURIComponent(`Hola, envío la receta de mi compra ${ref}`)}`}>Enviar por WhatsApp</a>
            <Link className="btn btn-ghost" href="/mi-cuenta">Subir en mi cuenta</Link>
          </div>
        </div>
      )}
      {paid && !o.needs_prescription && <p className="mt-4 text-sm text-muted">Te escribiremos para coordinar el despacho.</p>}
      {!paid && <p className="mt-4 text-sm text-muted">{q.mp === "error" ? "No pudimos abrir Mercado Pago. Inténtalo de nuevo o escríbenos por WhatsApp." : "Si ya pagaste, esta página se actualiza cuando Mercado Pago confirme el pago."}</p>}
      <p className="mt-6 text-xs text-muted">Guarda este enlace para revisar el estado de tu compra.</p>
    </div>
  );
}

export default function EstadoPage({ searchParams }: PageProps<"/comprar/estado">) {
  return (
    <main className="container-page py-10 md:py-14">
      <h1 className="mb-8 text-[clamp(36px,5vw,60px)]">Tu compra.</h1>
      <Suspense fallback={<p role="status" className="text-muted">Cargando…</p>}><Estado searchParams={searchParams} /></Suspense>
    </main>
  );
}
