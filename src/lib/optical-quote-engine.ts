/** Motor de precios de venta. No interpreta imágenes, prescribe ni convierte graduaciones.
 * El consumidor servidor debe cargar precio del par y política desde fuentes autorizadas.
 * Nunca pasar como precio fiable un importe enviado por el navegador.
 */
export type OpticalUse = "distance" | "near";
export type OpticalTreatment = "white" | "antireflection" | "blue";
export type EyePrescription = { sphere: number; cylinder: number; axis?: number | null };
export type PricingBand = {
  id: string;
  sphereMin: number; sphereMax: number;
  cylinderMin: number; cylinderMax: number;
  surchargeClp: number;
};
export type OpticalPricingPolicy = {
  version: string;
  enabled: boolean;
  minimumBasePairClp: number;
  treatmentExtras: Record<OpticalTreatment, number>;
  surchargeBasis: "pair_max" | "per_eye_sum" | null;
  bands: readonly PricingBand[];
};
export type OpticalQuoteInput = {
  basePairClp: number | null;
  requestedUse: OpticalUse;
  prescriptionUse: OpticalUse | null;
  treatment: OpticalTreatment;
  right: EyePrescription | null;
  left: EyePrescription | null;
};
export type ReviewReason = "policy_inactive" | "invalid_policy" | "rules_missing" | "frame_price_missing" | "prescription_use_unconfirmed" | "prescription_incomplete" | "outside_priced_ranges" | "ambiguous_rules" | "invalid_total";
export type OpticalQuoteDecision = {
  kind: "requires_review";
  reason: ReviewReason;
} | {
  kind: "estimate";
  currency: "CLP";
  policyVersion: string;
  totalClp: number;
  lines: { key: "base_pair" | "prescription_surcharge" | "treatment"; amountClp: number }[];
  ruleIds: { right: string; left: string };
  requiresProfessionalReview: true;
  includesShipping: false;
};

// Precios aprobados por Pablo; SIN bandas inventadas. Así no se ofrece un total por graduación aún.
export const INITIAL_OPTICAL_POLICY: OpticalPricingPolicy = {
  version: "2026-10-21-draft",
  enabled: false,
  minimumBasePairClp: 28000,
  treatmentExtras: { white: 0, antireflection: 10000, blue: 20000 },
  surchargeBasis: null,
  bands: [],
};

const money = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const review = (reason: ReviewReason): OpticalQuoteDecision => ({ kind: "requires_review", reason });

export function validOpticalPolicy(p: OpticalPricingPolicy): boolean {
  if (!p || typeof p.version !== "string" || !p.version.trim() || typeof p.enabled !== "boolean"
    || !money(p.minimumBasePairClp) || !p.treatmentExtras
    || !["white", "antireflection", "blue"].every(k => money(p.treatmentExtras[k as OpticalTreatment]))
    || ![null, "pair_max", "per_eye_sum"].includes(p.surchargeBasis) || !Array.isArray(p.bands) || p.bands.length > 100) return false;
  const ids = new Set<string>();
  return p.bands.every(b => {
    if (!b || typeof b.id !== "string" || !b.id.trim() || ids.has(b.id)
      || ![b.sphereMin, b.sphereMax, b.cylinderMin, b.cylinderMax].every(finite)
      || b.sphereMin > b.sphereMax || b.cylinderMin > b.cylinderMax || !money(b.surchargeClp)) return false;
    ids.add(b.id);
    return true;
  });
}

function validEye(eye: EyePrescription | null): eye is EyePrescription {
  if (!eye || !finite(eye.sphere) || !finite(eye.cylinder)) return false;
  // Ausente no significa cero. El eje es obligatorio si la receta informa cilindro distinto de cero.
  return eye.cylinder === 0 || (Number.isInteger(eye.axis) && eye.axis! >= 0 && eye.axis! <= 180);
}

/** Todos los límites de bandas son inclusivos y conservan signo. Si dos bandas coinciden, requiere revisión. */
export function calculateOpticalQuote(input: OpticalQuoteInput, policy: OpticalPricingPolicy): OpticalQuoteDecision {
  if (!validOpticalPolicy(policy)) return review("invalid_policy");
  if (!policy.enabled) return review("policy_inactive");
  if (!policy.bands.length || policy.surchargeBasis === null) return review("rules_missing");
  if (!money(input.basePairClp) || input.basePairClp < policy.minimumBasePairClp) return review("frame_price_missing");
  if (!["distance", "near"].includes(input.requestedUse) || input.prescriptionUse !== input.requestedUse) return review("prescription_use_unconfirmed");
  if (!validEye(input.right) || !validEye(input.left)) return review("prescription_incomplete");
  if (!["white", "antireflection", "blue"].includes(input.treatment)) return review("invalid_policy");
  const matches = (eye: EyePrescription) => policy.bands.filter(b => eye.sphere >= b.sphereMin && eye.sphere <= b.sphereMax && eye.cylinder >= b.cylinderMin && eye.cylinder <= b.cylinderMax);
  const right = matches(input.right), left = matches(input.left);
  if (!right.length || !left.length) return review("outside_priced_ranges");
  if (right.length !== 1 || left.length !== 1) return review("ambiguous_rules");
  const rxExtra = policy.surchargeBasis === "pair_max"
    ? Math.max(right[0].surchargeClp, left[0].surchargeClp)
    : right[0].surchargeClp + left[0].surchargeClp;
  // Una sola alternativa: el azul nunca acumula además el extra antirreflejo.
  const treatmentExtra = policy.treatmentExtras[input.treatment];
  const total = input.basePairClp + rxExtra + treatmentExtra;
  if (!money(rxExtra) || !money(total)) return review("invalid_total");
  return {
    kind: "estimate", currency: "CLP", policyVersion: policy.version, totalClp: total,
    lines: [{ key: "base_pair", amountClp: input.basePairClp }, { key: "prescription_surcharge", amountClp: rxExtra }, { key: "treatment", amountClp: treatmentExtra }],
    ruleIds: { right: right[0].id, left: left[0].id }, requiresProfessionalReview: true, includesShipping: false,
  };
}
