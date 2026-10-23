import { NextResponse } from "next/server";
import { paymentsEnabled } from "@/lib/mercadopago";
import { syncPayment } from "@/lib/store-orders";

// Aviso de Mercado Pago. No se confía en el cuerpo: solo se usa el id para consultar el pago a la API.
export async function POST(request: Request) {
  if (!paymentsEnabled()) return NextResponse.json({ ok: false }, { status: 503 });
  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as { type?: string; data?: { id?: string | number } };
  const type = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const id = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  if (type === "payment" && id) await syncPayment(id);
  return NextResponse.json({ ok: true });
}
