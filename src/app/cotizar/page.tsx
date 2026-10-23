import type { Metadata } from "next";
import { Suspense } from "react";
import { QuoteForm, type QuoteAccount } from "@/components/quote-form";
import { quotesOpen } from "@/lib/flags";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { formatAddress } from "@/lib/addresses";

export const metadata: Metadata = { title: "Tu selección" };

// Se puede cotizar sin cuenta; con sesión se ofrecen las direcciones guardadas.
async function Gate() {
  const supabase = await createClient();
  const session = await getSession(supabase);
  let account: QuoteAccount | null = null;
  if (session.status === "user") {
    const { data } = await supabase.from("customer_addresses").select("id, recipient, region, comuna, street, street_number, unit, is_default")
      .eq("user_id", session.user.id).order("created_at");
    account = {
      email: session.user.email ?? "",
      addresses: (data ?? []).map((a) => ({ id: a.id, text: `${a.recipient} · ${formatAddress(a)}`, isDefault: a.is_default })),
    };
  }
  return <QuoteForm open={quotesOpen()} account={account} sessionUnavailable={session.status === "unavailable"} />;
}

export default function CotizarPage() {
  return (
    <main className="container-page">
      <div className="page-heading"><div><p className="eyebrow">Un paso más cerca</p><h1>Tu selección.</h1></div><p className="heading-note">Aquí se reúnen tus próximos favoritos. El valor de los cristales y la entrega se confirma contigo.</p></div>
      <div className="quote-layout"><Suspense fallback={<p role="status" className="text-muted">Cargando tu selección…</p>}><Gate /></Suspense><aside className="quote-note"><p className="eyebrow !mt-0">De persona a persona</p><h2>Primero, tus lentes.<br />Después, los detalles.</h2><p>Tu selección es el comienzo de una conversación. Revisamos tu receta y confirmamos el valor completo antes de cualquier pago.</p><ol><li><span>01</span>Elige tus marcos</li><li><span>02</span>Revisamos tu receta</li><li><span>03</span>Confirmamos el total y el despacho</li><li><span>04</span>Pagas con Mercado Pago y despachamos</li></ol></aside></div>
    </main>
  );
}
