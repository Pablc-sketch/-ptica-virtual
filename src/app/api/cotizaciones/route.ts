import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { parseQuote } from "@/lib/quotes";
import { quotesOpen } from "@/lib/flags";
import { formatAddress } from "@/lib/addresses";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!quotesOpen()) {
    return NextResponse.json({ error: "Las cotizaciones aún no están abiertas" }, { status: 503 });
  }
  const supabase = await createClient();
  // Sin invitados: cotizar exige sesión.
  const session = await getSession(supabase);
  if (session.status === "unavailable") return NextResponse.json({ error: "No pudimos verificar tu sesión" }, { status: 503 });
  if (session.status !== "user") return NextResponse.json({ error: "Inicia sesión para cotizar" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = parseQuote(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Entrega: la dirección se lee de la base con RLS (solo las propias), nunca se confía en texto del cliente.
  const d = (body as { delivery?: { method?: unknown; address_id?: unknown } }).delivery;
  let deliveryNote = "Entrega: retiro coordinado.";
  if (d?.method === "despacho") {
    if (typeof d.address_id !== "string" || !UUID.test(d.address_id)) return NextResponse.json({ error: "Elige una dirección de despacho" }, { status: 400 });
    const { data: a } = await supabase.from("customer_addresses").select("recipient, phone, region, comuna, street, street_number, unit, notes")
      .eq("id", d.address_id).eq("user_id", session.user.id).maybeSingle();
    if (!a) return NextResponse.json({ error: "Elige una dirección de despacho" }, { status: 400 });
    deliveryNote = `Despacho a: ${a.recipient}, ${formatAddress(a)}. Tel. ${a.phone}${a.notes ? `. Indicaciones: ${a.notes}` : ""}.`;
  } else if (d?.method !== "retiro") {
    return NextResponse.json({ error: "Elige cómo recibir tus lentes" }, { status: 400 });
  }
  const { name, email, phone, notes, items } = parsed.value;
  const fullNotes = [notes, deliveryNote].filter(Boolean).join("\n");
  if (fullNotes.length > 2000) return NextResponse.json({ error: "Comentarios demasiado largos" }, { status: 400 });
  const { data, error } = await supabase.rpc("create_quote", {
    p_name: name,
    p_email: email,
    p_phone: phone,
    p_notes: fullNotes,
    p_items: items,
  });
  if (error) return NextResponse.json({ error: "No se pudo crear la cotización" }, { status: 422 });
  return NextResponse.json({ id: data }, { status: 201 });
}
