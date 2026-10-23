import { createClient } from "@/lib/supabase/server";
import { getPayment } from "@/lib/mercadopago";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Consulta el pago en Mercado Pago (fuente de verdad) y lo registra en la base con el secreto del servidor.
export async function syncPayment(paymentId: string): Promise<string | null> {
  const pay = await getPayment(paymentId);
  if (!pay || !pay.externalReference || !UUID.test(pay.externalReference) || pay.currency !== "CLP") return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_store_order_payment", {
    p_secret: process.env.PAYMENTS_SECRET ?? "", p_order: pay.externalReference, p_payment: pay.id,
    p_status: pay.status, p_amount: Math.round(pay.amount),
  });
  return error ? null : (data as string);
}
