import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CLIENT_LABEL, REVIEW_STATUSES, allowedTransitions, canTransition, isReviewStatus, reviewErrorToResponse, validateReason,
} from "../src/lib/prescription-review";

describe("transiciones de revisión", () => {
  it("solo las permitidas", () => {
    expect(canTransition("pending", "in_review")).toBe(true);
    expect(canTransition("pending", "reviewed")).toBe(false);
    expect(canTransition("in_review", "needs_new_file")).toBe(true);
    expect(allowedTransitions("reviewed")).toEqual([]);
    expect(allowedTransitions("needs_new_file")).toEqual([]);
  });
  it("coinciden exactamente con la migración SQL aplicada", () => {
    const sql = readFileSync("supabase/migrations/20261021192923_revision_documental_recetas.sql", "utf8");
    const block = sql.slice(sql.indexOf("select (p_from, p_to) in ("), sql.indexOf(");", sql.indexOf("select (p_from, p_to) in (")));
    const pairs = [...block.matchAll(/\('(\w+)', '(\w+)'\)/g)].map((m) => `${m[1]}->${m[2]}`).sort();
    const ts = REVIEW_STATUSES.flatMap((f) => allowedTransitions(f).map((t) => `${f}->${t}`)).sort();
    expect(pairs).toEqual(ts);
  });
  it("valida el tipo de estado", () => {
    expect(isReviewStatus("reviewed")).toBe(true);
    expect(isReviewStatus("approved")).toBe(false);
  });
});

describe("motivo y textos", () => {
  it("el motivo solo se exige para pedir nuevo archivo", () => {
    expect(validateReason("reviewed", "")).toBeNull();
    expect(validateReason("needs_new_file", "  ab ")).toMatch(/mínimo/);
    expect(validateReason("needs_new_file", "x".repeat(301))).toMatch(/300/);
    expect(validateReason("needs_new_file", "Falta el eje del ojo derecho")).toBeNull();
  });
  it("el texto de 'revisada' aclara que no es evaluación médica ni valida la graduación ni es compra", () => {
    expect(CLIENT_LABEL.reviewed.detail).toMatch(/no es una evaluación médica/i);
    expect(CLIENT_LABEL.reviewed.detail).toMatch(/no valida ni corrige tu graduación/);
    expect(CLIENT_LABEL.reviewed.detail).toMatch(/no confirma una compra/);
    expect(Object.values(CLIENT_LABEL).map((l) => l.title + l.detail).join(" ")).not.toMatch(/aprobad|aprueba|apta|válida|correcta|pago|compra confirmada/i);
  });
  it("traduce errores de la función a HTTP", () => {
    expect(reviewErrorToResponse("version_conflict").status).toBe(409);
    expect(reviewErrorToResponse("not_admin").status).toBe(403);
    expect(reviewErrorToResponse("algo raro").status).toBe(502);
  });
});
