import {formatName,normalizeMobile} from './contact-format';
export type QuoteInput = {
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  items: { product_id: string; quantity: number }[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function parseQuote(body: unknown): { ok: true; value: QuoteInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Solicitud inválida" };
  const b = body as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const rawName = text(b.name);
  const name = rawName ? formatName(rawName) : null;
  if (!name || name.length < 2 || name.length > 120) return { ok: false, error: "Nombre inválido" };
  const email = text(b.email)?.toLowerCase() ?? null;
  const rawPhone = text(b.phone);
  const phone = rawPhone ? normalizeMobile(rawPhone) : null;
  if (!email && !phone) return { ok: false, error: "Indica email o teléfono" };
  if (email && !EMAIL.test(email)) return { ok: false, error: "Email inválido" };
  if (rawPhone && !phone) return { ok: false, error: 'Celular inválido: usa +569 y 8 dígitos' };
  const notes = text(b.notes);
  if (notes && notes.length > 2000) return { ok: false, error: "Notas demasiado largas" };

  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 10) {
    return { ok: false, error: "La cotización debe tener entre 1 y 10 productos" };
  }
  const items: QuoteInput["items"] = [];
  for (const it of b.items) {
    const i = it as Record<string, unknown>;
    const qty = Number(i?.quantity ?? 1);
    if (typeof i?.product_id !== "string" || !UUID.test(i.product_id)) return { ok: false, error: "Producto inválido" };
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) return { ok: false, error: "Cantidad inválida" };
    items.push({ product_id: i.product_id, quantity: qty });
  }
  return { ok: true, value: { name, email, phone, notes, items } };
}
