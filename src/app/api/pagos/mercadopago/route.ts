import { NextResponse } from "next/server";
import { paymentsEnabled } from "@/lib/mercadopago";
import { syncPayment } from "@/lib/store-orders";
import {validMpWebhook} from '@/lib/mp-webhook';

// Aviso de Mercado Pago. No se confía en el cuerpo: solo se usa el id para consultar el pago a la API.
export async function POST(request: Request) {
  if (!paymentsEnabled()) return NextResponse.json({ ok: false }, { status: 503 });
  const url = new URL(request.url);
  const signedId=url.searchParams.get('data.id');
  if(!validMpWebhook(request.headers,signedId,process.env.MP_WEBHOOK_SECRET))return NextResponse.json({ok:false},{status:401});
  const body = (await request.json().catch(() => ({}))) as { type?: string; data?: { id?: string | number } };
  const type = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const id = signedId!;
  if(body.data?.id!=null&&String(body.data.id)!==id)return NextResponse.json({ok:false},{status:401});
  if (type === "payment" && id) await syncPayment(id);
  return NextResponse.json({ ok: true });
}
