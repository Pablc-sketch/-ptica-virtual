// Mercado Pago Checkout Pro. Se activa cuando el servidor tiene MP_ACCESS_TOKEN y PAYMENTS_SECRET.
// El monto siempre viene de la base (store_orders.total_clp); el estado del pago se consulta a la API de Mercado Pago.
const API = "https://api.mercadopago.com";

export const paymentsEnabled = () => Boolean(process.env.MP_ACCESS_TOKEN && process.env.PAYMENTS_SECRET);

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

export async function getPayment(paymentId: string): Promise<MpPayment | null> {
  if (!/^\d{1,20}$/.test(paymentId)) return null;
  const res = await fetch(`${API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const p = (await res.json()) as { id: number; status: string; external_reference: string | null; transaction_amount: number; currency_id: string };
  return { id: String(p.id), status: p.status, externalReference: p.external_reference, amount: p.transaction_amount, currency: p.currency_id };
}
