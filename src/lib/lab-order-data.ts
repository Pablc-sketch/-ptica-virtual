import type { SupabaseClient } from "@supabase/supabase-js";
import { publicStorageUrl } from "@/lib/catalog-adapt";
import type { LabOrder } from "@/lib/lab-order";

export type OrderDetail = {
  order: LabOrder;
  prescriptionReviewed: boolean;
  procurement: { supplier_code: string; color_code: string | null; confirmed: boolean } | null;
  photoUrl: string | null;
  events: { from_status: string; to_status: string; created_at: string }[];
};

// Lecturas para admin (RLS exige admin en cada tabla). La miniatura del marco es la imagen pública del catálogo;
// el archivo de la receta NUNCA se incrusta ni se guarda su URL firmada.
export async function loadOrderDetail(supabase: SupabaseClient, id: string): Promise<OrderDetail | null> {
  const { data: order, error } = await supabase.from("lab_orders").select("*").eq("id", id).maybeSingle<LabOrder>();
  if (error) throw new Error("order_read_failed");
  if (!order) return null;
  const [rx, proc, imgs, ev] = await Promise.all([
    supabase.from("prescriptions").select("status").eq("id", order.prescription_id).maybeSingle(),
    order.product_id
      ? supabase.from("product_procurement").select("supplier_code, color_code, confirmed").eq("product_id", order.product_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    order.product_id
      ? supabase.from("product_images").select("path, position").eq("product_id", order.product_id).order("position").limit(1)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("lab_order_events").select("from_status, to_status, created_at").eq("order_id", id).order("created_at"),
  ]);
  if (rx.error || proc.error || imgs.error || ev.error) throw new Error("order_read_failed");
  const img = (imgs.data as { path: string }[] | null)?.[0];
  return {
    order,
    prescriptionReviewed: rx.data?.status === "reviewed",
    procurement: (proc.data as OrderDetail["procurement"]) ?? null,
    photoUrl: img ? publicStorageUrl("product-images", img.path) : null,
    events: (ev.data as OrderDetail["events"]) ?? [],
  };
}

export const STATUS_LABEL: Record<string, string> = { draft: "Borrador", validated: "Validado por admin", cancelled: "Cancelado" };
export const FAMILY_USE = (o: Pick<LabOrder, "family" | "requested_use">) =>
  `${o.family}${o.requested_use ? ` · ${o.requested_use === "near" ? "cerca" : "lejos"}` : ""}`;
