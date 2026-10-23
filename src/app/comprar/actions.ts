"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REGIONES } from "@/lib/addresses";
import { createPreference, paymentsEnabled } from "@/lib/mercadopago";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LENSES = ["basico", "antirreflejo", "filtro-azul"];
const ERRORS: Record<string, string> = {
  invalid_name: "nombre", invalid_email: "correo", invalid_phone: "telefono", invalid_address: "direccion",
  lens_required: "cristal", variant_not_available: "color", product_not_available: "producto", too_many_pending: "muchas",
};

// Inicia la compra: la base crea el pedido con su precio y Mercado Pago recibe solo ese monto.
export async function startCheckout(slug: string, formData: FormData) {
  const str = (k: string) => (typeof formData.get(k) === "string" ? String(formData.get(k)).trim() : "");
  const back = (code: string) => redirect(`/comprar/${slug}?error=${code}`);
  if (!paymentsEnabled()) back("pago");
  const productId = str("product_id"), variant = str("variant_id"), lens = str("lens");
  if (!UUID.test(productId) || (variant && !UUID.test(variant)) || (lens && !LENSES.includes(lens))) back("producto");
  if (!(REGIONES as readonly string[]).includes(str("region"))) back("direccion");
  if (formData.get("acepto") !== "on") back("acepto");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_store_order", {
    p_product: productId, p_variant: variant || null, p_lens: lens || null, p_quantity: 1,
    p_name: str("name"), p_email: str("email"), p_phone: str("phone"),
    p_region: str("region"), p_comuna: str("comuna"), p_street: str("street"), p_number: str("street_number"),
    p_unit: str("unit") || null, p_notes: str("notes") || null,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) back(ERRORS[Object.keys(ERRORS).find((k) => error?.message.includes(k)) ?? ""] ?? "error");

  const { data: order } = await supabase.rpc("get_store_order", { p_order: row.order_id, p_token: row.access_token });
  const o = Array.isArray(order) ? order[0] : order;
  const h = await headers();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  let initPoint: string;
  try {
    const pref = await createPreference({
      orderId: row.order_id, token: row.access_token, totalClp: o.total_clp, email: str("email"), siteUrl,
      title: `Óptica Global · ${o.product_name}${o.color_name ? ` (${o.color_name})` : ""}`,
    });
    await supabase.rpc("set_store_order_preference", { p_order: row.order_id, p_token: row.access_token, p_preference: pref.id });
    initPoint = pref.initPoint;
  } catch {
    redirect(`/comprar/estado?pedido=${row.order_id}&t=${row.access_token}&mp=error`);
  }
  redirect(initPoint);
}
