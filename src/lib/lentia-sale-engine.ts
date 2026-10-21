import sales from "../data/lentia-sale-tariffs.json";
import type { EyePrescription, OpticalUse } from "./optical-quote-engine";

export type SaleFamily = "Monofocal" | "Bifocal" | "Multifocal";
export type SaleTariff = { family: string; range: string; treatment: string; laboratorySaleClp: number; stockSaleClp: number | null };
export const LENTIA_SALE_TARIFFS: readonly SaleTariff[] = sales;
export type LensSaleRequest = {
  family: SaleFamily;
  treatment: string;
  source: "stock" | "laboratory";
  requestedUse: OpticalUse;
  prescriptionUse: OpticalUse | null;
  right: EyePrescription | null;
  left: EyePrescription | null;
};
export type LensSaleDecision = { kind: "requires_review"; reason: "measurements_required" | "incomplete_prescription" | "use_unconfirmed" | "outside_tariff" | "source_not_priced" | "ambiguous_tariff" }
  | { kind: "lens_estimate"; lensSubtotalClp: number; range: string; treatment: string; source: "stock" | "laboratory"; includesFrame: false; includesShipping: false; requiresProfessionalReview: true; tariffVersion: "lentia-sales-2026-10-21" };

function validEye(e: EyePrescription | null): e is EyePrescription {
  return !!e && Number.isFinite(e.sphere) && Number.isFinite(e.cylinder)
    && Number.isInteger(e.sphere * 4) && Number.isInteger(e.cylinder * 4)
    && (e.cylinder === 0 || (Number.isInteger(e.axis) && e.axis! >= 0 && e.axis! <= 180));
}
function limits(range: string): { sphere: number; cylinder: number } | null {
  const match = /^±(\d+(?:\.\d+)?)\s*\/\s*±(\d+(?:\.\d+)?)$/.exec(range);
  return match ? { sphere: Number(match[1]), cylinder: Number(match[2]) } : null;
}

/** Precio de VENTA de los cristales según la tabla propia, sin costos de laboratorio ni datos personales.
 * Nunca devuelve un precio del par completo. No confirma disponibilidad, fabricación ni adaptación.
 */
export function estimateLentiaLensSale(request: LensSaleRequest, tariffs: readonly SaleTariff[] = LENTIA_SALE_TARIFFS): LensSaleDecision {
  // Progresivos y bifocales necesitan un proceso de medición específico aún no habilitado en la tienda.
  if (request.family === "Multifocal" || request.family === "Bifocal") return { kind: "requires_review", reason: "measurements_required" };
  if (request.family !== "Monofocal") return { kind: "requires_review", reason: "outside_tariff" };
  if (!["distance", "near"].includes(request.requestedUse) || request.prescriptionUse !== request.requestedUse) return { kind: "requires_review", reason: "use_unconfirmed" };
  if (!validEye(request.right) || !validEye(request.left)) return { kind: "requires_review", reason: "incomplete_prescription" };
  if (!["stock", "laboratory"].includes(request.source)) return { kind: "requires_review", reason: "source_not_priced" };
  const sph = Math.max(Math.abs(request.right.sphere), Math.abs(request.left.sphere));
  const cyl = Math.max(Math.abs(request.right.cylinder), Math.abs(request.left.cylinder));
  const candidates = tariffs.filter(t => t.family === request.family && t.treatment === request.treatment).flatMap(t => {
    const l = limits(t.range);
    return l && sph <= l.sphere && cyl <= l.cylinder ? [{ tariff: t, limits: l }] : [];
  });
  if (!candidates.length) return { kind: "requires_review", reason: "outside_tariff" };
  // La banda más estrecha que contiene ambos ojos. Rangos cruzados/duplicados requieren revisión, no precio mínimo.
  const tightest = candidates.filter(c => !candidates.some(o => o !== c && o.limits.sphere <= c.limits.sphere && o.limits.cylinder <= c.limits.cylinder && (o.limits.sphere < c.limits.sphere || o.limits.cylinder < c.limits.cylinder)));
  if (tightest.length !== 1) return { kind: "requires_review", reason: "ambiguous_tariff" };
  const selected = tightest[0].tariff;
  const price = request.source === "stock" ? selected.stockSaleClp : selected.laboratorySaleClp;
  if (price === null || !Number.isSafeInteger(price) || price <= 0) return { kind: "requires_review", reason: "source_not_priced" };
  return { kind: "lens_estimate", lensSubtotalClp: price, range: selected.range, treatment: selected.treatment, source: request.source, includesFrame: false, includesShipping: false, requiresProfessionalReview: true, tariffVersion: "lentia-sales-2026-10-21" };
}
