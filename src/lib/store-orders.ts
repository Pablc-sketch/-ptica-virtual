import { createClient } from "@/lib/supabase/server";
import { getPayment } from "@/lib/mercadopago";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Consulta el pago en Mercado Pago (fuente de verdad) y lo registra en la base con el secreto del servidor.
export type SyncPaymentResult =
  | { kind: "synced"; status: string }
  | { kind: "ignored"; reason: "invalid_id" | "not_found" | "unlinked" | "currency" | "amount_mismatch" }
  | { kind: "retry"; reason: "provider" | "storage" };

export async function syncPayment(paymentId: string): Promise<SyncPaymentResult> {
  const lookup = await getPayment(paymentId);
  if (lookup.kind === "ignored") return lookup;
  if (lookup.kind === "retry") return { kind: "retry", reason: "provider" };
  const pay = lookup.payment;
  if (!pay.externalReference || !UUID.test(pay.externalReference)) return { kind: "ignored", reason: "unlinked" };
  if (pay.currency !== "CLP") return { kind: "ignored", reason: "currency" };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("confirm_store_order_payment", {
      p_secret: process.env.PAYMENTS_SECRET ?? "", p_order: pay.externalReference, p_payment: pay.id,
      p_status: pay.status, p_amount: pay.amount,
    });
    if (error?.code === "22023" && error.message === "amount_mismatch") return { kind: "ignored", reason: "amount_mismatch" };
    if (error || typeof data !== "string" || !data) return { kind: "retry", reason: "storage" };
    return data === "not_found" ? { kind: "ignored", reason: "not_found" } : { kind: "synced", status: data };
  } catch {
    return { kind: "retry", reason: "storage" };
  }
}
