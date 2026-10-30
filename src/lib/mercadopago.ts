// Mercado Pago Checkout Pro. Se activa cuando el servidor tiene MP_ACCESS_TOKEN y PAYMENTS_SECRET.
// El monto siempre viene de la base (store_orders.total_clp); el estado del pago se consulta a la API de Mercado Pago.
const API = "https://api.mercadopago.com";

export const paymentsEnabled = () => Boolean(process.env.MP_ACCESS_TOKEN && process.env.PAYMENTS_SECRET && process.env.MP_WEBHOOK_SECRET);

export type PreferenceInput = {
  orderId: string;
  token: string;
  title: string;
  totalClp: number;
  email: string;
  siteUrl: string;
};

export async function createPreference(i: PreferenceInput): Promise<{ id: string; initPoint: string }> {
  const back = `${i.siteUrl}/comprar/estado?pedido=${i.orderId}&t=${i.token}`;
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json", "X-Idempotency-Key": i.orderId },
    body: JSON.stringify({
      items: [{ id: i.orderId, title: i.title.slice(0, 250), quantity: 1, unit_price: i.totalClp, currency_id: "CLP" }],
      payer: { email: i.email },
      external_reference: i.orderId,
      back_urls: { success: back, pending: back, failure: back },
      auto_return: "approved",
      notification_url: `${i.siteUrl}/api/pagos/mercadopago`,
      statement_descriptor: "OPTICA GLOBAL",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`mp_preference_${res.status}`);
  const body = (await res.json()) as { id: string; init_point: string };
  return { id: body.id, initPoint: body.init_point };
}

export type MpPayment = { id: string; status: string; externalReference: string | null; amount: number; currency: string };

export type MpPaymentLookup =
  | { kind: "found"; payment: MpPayment }
  | { kind: "ignored"; reason: "invalid_id" | "not_found" }
  | { kind: "retry" };

export async function getPayment(paymentId: string): Promise<MpPaymentLookup> {
  if (!/^\d{1,20}$/.test(paymentId)) return { kind: "ignored", reason: "invalid_id" };
  try {
    const res = await fetch(`${API}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return { kind: "ignored", reason: "not_found" };
    if (!res.ok) return { kind: "retry" };
    const p: unknown = await res.json();
    if (!p || typeof p !== "object") return { kind: "retry" };
    const raw = p as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id : Number.isSafeInteger(raw.id) ? String(raw.id) : "";
    if (id !== paymentId || typeof raw.status !== "string" || !raw.status
      || typeof raw.transaction_amount !== "number" || !Number.isFinite(raw.transaction_amount) || raw.transaction_amount <= 0
      || (raw.currency_id === "CLP" && !Number.isSafeInteger(raw.transaction_amount))
      || typeof raw.currency_id !== "string"
      || (raw.external_reference != null && typeof raw.external_reference !== "string")) return { kind: "retry" };
    return { kind: "found", payment: { id, status: raw.status, externalReference: typeof raw.external_reference === "string" ? raw.external_reference : null, amount: raw.transaction_amount, currency: raw.currency_id } };
  } catch {
    // No confirmar la recepción de un evento que no se pudo consultar.
    return { kind: "retry" };
  }
}
