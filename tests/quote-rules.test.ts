import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { findGaps, findOverlaps, parseDiopter, validateBand, type BandInput } from "../src/lib/quote-rules";

// Valores sintéticos solo para probar validaciones: NO son rangos ni recargos reales.
const b = (o: Partial<BandInput>): BandInput => ({ component: "sph", min: 0, max: 0, surchargeClp: 0, status: "published", ...o });

describe("parseDiopter", () => {
  it("acepta coma, punto, signo y pasos de 0,25", () => {
    expect(parseDiopter("-1,75")).toBe(-1.75);
    expect(parseDiopter("+2.00")).toBe(2);
    expect(parseDiopter("-0")).toBe(0);
  });
  it("rechaza pasos no válidos, texto y fuera de rango", () => {
    expect(parseDiopter("-1.10")).toBeNull();
    expect(parseDiopter("abc")).toBeNull();
    expect(parseDiopter("45")).toBeNull();
    expect(parseDiopter("")).toBeNull();
  });
});

describe("validateBand", () => {
  it("exige orden, pasos, cilindro negativo y recargo entero", () => {
    expect(validateBand(b({ min: 2, max: -2 }))).toMatch(/mínimo/);
    expect(validateBand(b({ min: -1.1 }))).toMatch(/0,25/);
    expect(validateBand(b({ component: "cyl", min: 0.25, max: 1 }))).toMatch(/negativa/);
    expect(validateBand(b({ surchargeClp: 10.5 }))).toMatch(/entero/);
    expect(validateBand(b({ min: -2, max: 2 }))).toBeNull();
  });
});

describe("solapes y huecos (igual que el trigger)", () => {
  it("detecta solapes solo entre publicadas del mismo componente, con bordes incluidos", () => {
    const set = [b({ min: -2, max: 2 }), b({ min: 2, max: 4 }), b({ min: 1, max: 3, status: "draft" }), b({ component: "cyl", min: -2, max: 0 })];
    expect(findOverlaps(set)).toHaveLength(1);
  });
  it("informa huecos entre bandas publicadas", () => {
    expect(findGaps([b({ min: -2, max: 0 }), b({ min: 1, max: 3 })], "sph")).toEqual([{ from: 0.25, to: 0.75 }]);
    expect(findGaps([b({ min: -2, max: 0 }), b({ min: 0.25, max: 3 })], "sph")).toEqual([]);
  });
  it("coincide con el trigger SQL: misma condición de solape", () => {
    const sql = readFileSync("supabase/pendientes/03_reglas_cotizador.sql", "utf8");
    expect(sql).toContain("b.min_value <= new.max_value and new.min_value <= b.max_value");
  });
});
