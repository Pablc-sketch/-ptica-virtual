import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseQuote } from "@/lib/quotes";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseQuote(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const supabase = await createClient();
  const { name, email, phone, notes, items } = parsed.value;
  const { data, error } = await supabase.rpc("create_quote", {
    p_name: name,
    p_email: email,
    p_phone: phone,
    p_notes: notes,
    p_items: items,
  });
  if (error) return NextResponse.json({ error: "No se pudo crear la cotización" }, { status: 422 });
  return NextResponse.json({ id: data }, { status: 201 });
}
