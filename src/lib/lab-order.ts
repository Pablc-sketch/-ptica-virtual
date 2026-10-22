// Borradores de pedido de laboratorio (Fides). Refleja supabase/pendientes/04_pedidos_laboratorio.sql.
// La RX se TRANSCRIBE manualmente desde el archivo original: aquí no se calcula, convierte ni mide nada.

export type Family = "Monofocal" | "Bifocal" | "Multifocal";
export type OrderStatus = "draft" | "validated" | "cancelled";

export const RX_FIELDS = [
  "od_sph", "od_cyl", "od_axis", "od_add", "oi_sph", "oi_cyl", "oi_axis", "oi_add",
  "od_pd", "oi_pd", "od_height", "oi_height",
] as const;
export type RxField = (typeof RX_FIELDS)[number];
export type Transcription = Record<RxField, number | null> & {
  measurement_source: "professional_on_fitted_frame" | null;
  measured_by: string | null;
  measured_at: string | null;
  notes: string | null;
};
export type LabOrder = Transcription & {
  id: string; prescription_id: string; product_id: string | null; product_name: string; family: Family;
  requested_use: "distance" | "near" | null; treatment: string; status: OrderStatus; version: number;
  created_at: string; validated_at: string | null;
};

type Spec = { min: number; max: number; step: number; integer?: boolean };
const SPEC: Record<RxField, Spec> = {
  od_sph: { min: -30, max: 30, step: 0.25 }, oi_sph: { min: -30, max: 30, step: 0.25 },
  od_cyl: { min: -10, max: 10, step: 0.25 }, oi_cyl: { min: -10, max: 10, step: 0.25 },
  od_axis: { min: 0, max: 180, step: 1, integer: true }, oi_axis: { min: 0, max: 180, step: 1, integer: true },
  od_add: { min: 0.5, max: 4, step: 0.25 }, oi_add: { min: 0.5, max: 4, step: 0.25 },
  od_pd: { min: 20, max: 40, step: 0.5 }, oi_pd: { min: 20, max: 40, step: 0.5 },
  od_height: { min: 8, max: 40, step: 0.5 }, oi_height: { min: 8, max: 40, step: 0.5 },
};

export const FIELD_LABEL: Record<RxField, string> = {
  od_sph: "OD ESF", od_cyl: "OD CIL", od_axis: "OD EJE", od_add: "OD ADD",
  oi_sph: "OI ESF", oi_cyl: "OI CIL", oi_axis: "OI EJE", oi_add: "OI ADD",
  od_pd: "DP OD (mm)", oi_pd: "DP OI (mm)", od_height: "Altura OD (mm)", oi_height: "Altura OI (mm)",
};

/** Lee un valor transcrito ("-1,75", "+2.00", "90"). Vacío -> null. Inválido -> undefined (con su mensaje). */
export function parseField(field: RxField, raw: string): { value: number | null } | { error: string } {
  const s = raw.trim().replace(",", ".").replace(/^\+/, "");
  if (s === "") return { value: null };
  if (!/^-?\d{1,3}(\.\d{1,2})?$/.test(s)) return { error: `${FIELD_LABEL[field]}: número inválido.` };
  const v = Number(s);
  const spec = SPEC[field];
  const steps = v / spec.step;
  if (v < spec.min || v > spec.max) return { error: `${FIELD_LABEL[field]}: debe estar entre ${spec.min} y ${spec.max}.` };
  if (Math.abs(steps - Math.round(steps)) > 1e-9) return { error: `${FIELD_LABEL[field]}: usa pasos de ${String(spec.step).replace(".", ",")}.` };
  return { value: Object.is(v, -0) ? 0 : v };
}

export type BlockerCode =
  | "prescription_not_reviewed" | "procurement_not_confirmed" | "rx_incomplete" | "axis_required" | "pd_required"
  | "use_unconfirmed" | "add_not_allowed_for_single_vision" | "add_required" | "heights_required" | "professional_measurement_required";

export const BLOCKER_TEXT: Record<BlockerCode, string> = {
  prescription_not_reviewed: "La receta aún no tiene la revisión documental completada.",
  procurement_not_confirmed: "Falta confirmar la referencia privada del proveedor para este marco.",
  rx_incomplete: "Faltan ESF y CIL de ambos ojos.",
  axis_required: "Con cilindro distinto de 0 el eje es obligatorio.",
  pd_required: "Falta la DP monocular de ambos ojos.",
  use_unconfirmed: "Monofocal: falta el uso confirmado (lejos o cerca).",
  add_not_allowed_for_single_vision: "Monofocal no lleva ADD: no se convierte ADD en graduación de cerca. Transcribe la RX de cerca tal como figura o deja el pedido en revisión.",
  add_required: "Bifocal/multifocal: falta la ADD de ambos ojos.",
  heights_required: "Bifocal/multifocal: faltan las alturas de ambos ojos.",
  professional_measurement_required: "Bifocal/multifocal: falta la medición profesional sobre el marco ajustado (responsable y fecha). No se mide con selfie.",
};

/** Mismo orden y reglas que public.lab_order_blocker(). */
export function orderBlocker(
  o: Pick<LabOrder, RxField | "family" | "requested_use" | "measurement_source" | "measured_by" | "measured_at" | "product_id">,
  ctx: { prescriptionReviewed: boolean; procurementConfirmed: boolean },
): BlockerCode | null {
  if (!ctx.prescriptionReviewed) return "prescription_not_reviewed";
  if (!o.product_id || !ctx.procurementConfirmed) return "procurement_not_confirmed";
  if (o.od_sph == null || o.od_cyl == null || o.oi_sph == null || o.oi_cyl == null) return "rx_incomplete";
  if ((o.od_cyl !== 0 && o.od_axis == null) || (o.oi_cyl !== 0 && o.oi_axis == null)) return "axis_required";
  if (o.od_pd == null || o.oi_pd == null) return "pd_required";
  if (o.family === "Monofocal") {
    if (!o.requested_use) return "use_unconfirmed";
    if (o.od_add != null || o.oi_add != null) return "add_not_allowed_for_single_vision";
  } else {
    if (o.od_add == null || o.oi_add == null) return "add_required";
    if (o.od_height == null || o.oi_height == null) return "heights_required";
    if (o.measurement_source !== "professional_on_fitted_frame" || !o.measured_by || !o.measured_at) return "professional_measurement_required";
  }
  return null;
}

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["validated", "cancelled"],
  validated: ["draft", "cancelled"],
  cancelled: [],
};

/** Traduce errores de la base (mensaje de la excepción) a HTTP. */
export function orderErrorToResponse(message: string | undefined, code?: string): { status: number; error: string } {
  if (message && message in BLOCKER_TEXT) return { status: 422, error: BLOCKER_TEXT[message as BlockerCode] };
  if (code === "23505") return { status: 409, error: "Esa receta ya tiene un pedido activo." };
  switch (message) {
    case "version_conflict": return { status: 409, error: "Otra persona cambió este pedido. Recarga para ver la versión actual." };
    case "reopen_to_edit": return { status: 409, error: "El pedido está validado: reábrelo como borrador para editar." };
    case "save_before_transition": return { status: 409, error: "Guarda la transcripción antes de cambiar el estado." };
    case "order_cancelled": return { status: 409, error: "El pedido está cancelado." };
    case "invalid_transition": return { status: 409, error: "Ese cambio de estado no está permitido." };
    case "prescription_context_missing": return { status: 422, error: "La receta no tiene marco y opciones elegidas: no se puede preparar un pedido." };
    case "prescription_not_found": return { status: 404, error: "La receta ya no existe." };
    case "immutable_fields": return { status: 400, error: "Ese dato del pedido no se puede cambiar." };
    default: return { status: 502, error: "No pudimos guardar el pedido. Intenta nuevamente." };
  }
}

// ---- CSV ----
const NUMERIC = /^-?\d+(\.\d+)?$/;
/** Celda segura: números se mantienen; texto que empieza con = + - @ tab o CR se neutraliza (CSV injection). */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "number" ? String(value) : String(value);
  if (!(typeof value === "number" || NUMERIC.test(s)) && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  s = s.replace(/\r?\n/g, " ");
  return /[",;\n]/.test(s) || s.startsWith("'") ? `"${s.replace(/"/g, '""')}"` : s;
}

export type ExportRow = {
  pedido: string; marco: string; referencia_proveedor: string; codigo_color: string | null; familia: Family;
  uso: string | null; tratamiento: string; validado_en: string;
} & Record<RxField, number | null> & { medicion: string | null; medido_por: string | null; medido_en: string | null };

export const CSV_COLUMNS: (keyof ExportRow)[] = [
  "pedido", "marco", "referencia_proveedor", "codigo_color", "familia", "uso", "tratamiento",
  ...RX_FIELDS, "medicion", "medido_por", "medido_en", "validado_en",
];

export function toCsv(rows: ExportRow[]): string {
  const head = CSV_COLUMNS.join(",");
  const body = rows.map((r) => CSV_COLUMNS.map((c) => csvCell(r[c])).join(","));
  // BOM para que planillas abran bien los acentos; separador coma; fin de línea CRLF.
  return "﻿" + [head, ...body].join("\r\n") + "\r\n";
}
