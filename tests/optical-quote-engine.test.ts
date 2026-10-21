import { describe, expect, it } from "vitest";
import { calculateOpticalQuote, INITIAL_OPTICAL_POLICY, type OpticalPricingPolicy, type OpticalQuoteInput } from "../src/lib/optical-quote-engine";

// Bandas SINTÉTICAS para verificar el algoritmo. NO son tarifas/rangos comerciales de Óptica Global.
const policy: OpticalPricingPolicy = { ...INITIAL_OPTICAL_POLICY, version: "test-only", enabled: true, surchargeBasis: "pair_max", bands: [
  { id: "synthetic-a", sphereMin: -1, sphereMax: 1, cylinderMin: -1, cylinderMax: 0, surchargeClp: 0 },
  { id: "synthetic-b", sphereMin: -3, sphereMax: -1.01, cylinderMin: -2, cylinderMax: 0, surchargeClp: 5000 },
] };
const input: OpticalQuoteInput = { basePairClp: 28000, requestedUse: "distance", prescriptionUse: "distance", treatment: "white", right: { sphere: 0, cylinder: 0 }, left: { sphere: 0, cylinder: 0 } };

describe("motor de cotización por reglas de venta", () => {
  it("sin aprobación de reglas no inventa un total", () => {
    const decision = calculateOpticalQuote(input, INITIAL_OPTICAL_POLICY);
    expect(decision).toEqual({ kind: "requires_review", reason: "policy_inactive" });
    expect(decision).not.toHaveProperty("totalClp");
    expect(calculateOpticalQuote(input, { ...policy, bands: [] })).toEqual({ kind: "requires_review", reason: "rules_missing" });
  });
  it("azul suma20.000 y no el extra antirreflejo; cualquier cálculo sigue requiriendo revisión profesional", () => {
    const decision = calculateOpticalQuote({ ...input, treatment: "blue" }, policy);
    expect(decision).toMatchObject({ kind: "estimate", totalClp: 48000, requiresProfessionalReview: true, includesShipping: false });
    expect(calculateOpticalQuote({ ...input, treatment: "antireflection" }, policy)).toMatchObject({ totalClp: 38000 });
  });
  it("revisa ambos ojos y aplica la base por par una sola vez", () => {
    expect(calculateOpticalQuote({ ...input, left: { sphere: -2, cylinder: -1, axis: 90 } }, policy)).toMatchObject({ totalClp: 33000, ruleIds: { right: "synthetic-a", left: "synthetic-b" } });
    const both = { ...input, right: { sphere: -2, cylinder: 0 }, left: { sphere: -2, cylinder: 0 } };
    expect(calculateOpticalQuote(both, policy)).toMatchObject({ totalClp: 33000 });
    expect(calculateOpticalQuote(both, { ...policy, surchargeBasis: "per_eye_sum" })).toMatchObject({ totalClp: 38000 });
  });
  it("conserva el signo y no transpone cilindros para entrar en una tarifa", () => {
    expect(calculateOpticalQuote({ ...input, right: { sphere: 2, cylinder: 0 } }, policy)).toEqual({ kind: "requires_review", reason: "outside_priced_ranges" });
    expect(calculateOpticalQuote({ ...input, right: { sphere: 0, cylinder: 1, axis: 90 } }, policy)).toEqual({ kind: "requires_review", reason: "outside_priced_ranges" });
  });
  it("no calcula el par cercano a partir de la receta lejana", () => {
    expect(calculateOpticalQuote({ ...input, requestedUse: "near" }, policy)).toEqual({ kind: "requires_review", reason: "prescription_use_unconfirmed" });
    expect(calculateOpticalQuote({ ...input, requestedUse: "near", prescriptionUse: "near" }, policy)).toMatchObject({ kind: "estimate" });
  });
  it("no convierte datos ausentes ni no finitos en cero", () => {
    for (const right of [null, { sphere: NaN, cylinder: 0 }, { sphere: Infinity, cylinder: 0 }, { sphere: 0, cylinder: -1 }, { sphere: 0, cylinder: -1, axis: 181 }]) {
      expect(calculateOpticalQuote({ ...input, right }, policy)).toEqual({ kind: "requires_review", reason: "prescription_incomplete" });
    }
  });
  it("tarifas solapadas nunca eligen silenciosamente la más barata", () => {
    expect(calculateOpticalQuote(input, { ...policy, bands: [...policy.bands, { ...policy.bands[0], id: "overlap", surchargeClp: 2000 }] })).toEqual({ kind: "requires_review", reason: "ambiguous_rules" });
  });
  it("rechaza errores de configuración y montos que no sean enteros seguros", () => {
    expect(calculateOpticalQuote(input, { ...policy, bands: [{ ...policy.bands[0], sphereMin: 4, sphereMax: 1 }] })).toEqual({ kind: "requires_review", reason: "invalid_policy" });
    expect(calculateOpticalQuote({ ...input, basePairClp: null }, policy)).toEqual({ kind: "requires_review", reason: "frame_price_missing" });
    expect(calculateOpticalQuote({ ...input, basePairClp: 20000 }, policy)).toEqual({ kind: "requires_review", reason: "frame_price_missing" });
    expect(calculateOpticalQuote({ ...input, basePairClp: Number.MAX_SAFE_INTEGER, treatment: "blue" }, policy)).toEqual({ kind: "requires_review", reason: "invalid_total" });
  });
});
