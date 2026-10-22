import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BLOCKER_TEXT, csvCell, orderBlocker, orderErrorToResponse, parseField, toCsv, CSV_COLUMNS, type ExportRow } from "../src/lib/lab-order";

// Valores sintéticos solo para probar reglas (no son datos clínicos).
const base = {
  product_id: "p", family: "Monofocal" as const, requested_use: "distance" as const,
  od_sph: -1, od_cyl: -0.5, od_axis: 90, od_add: null, oi_sph: -1.25, oi_cyl: 0, oi_axis: null, oi_add: null,
  od_pd: 31.5, oi_pd: 31, od_height: null, oi_height: null, measurement_source: null, measured_by: null, measured_at: null,
};
const ok = { prescriptionReviewed: true, procurementConfirmed: true };

describe("parseField", () => {
  it("acepta transcripción con coma, signo y pasos válidos", () => {
    expect(parseField("od_sph", "-1,75")).toEqual({ value: -1.75 });
    expect(parseField("od_axis", "90")).toEqual({ value: 90 });
    expect(parseField("od_pd", "31,5")).toEqual({ value: 31.5 });
    expect(parseField("od_add", "")).toEqual({ value: null });
  });
  it("rechaza pasos, rangos y texto inválidos", () => {
    expect(parseField("od_sph", "-1.10")).toHaveProperty("error");
    expect(parseField("od_axis", "181")).toHaveProperty("error");
    expect(parseField("od_axis", "90.5")).toHaveProperty("error");
    expect(parseField("od_pd", "31.2")).toHaveProperty("error");
    expect(parseField("od_add", "5")).toHaveProperty("error");
    expect(parseField("od_sph", "=1+1")).toHaveProperty("error");
  });
});

describe("orderBlocker (mismo orden que la base)", () => {
  it("monofocal completo valida", () => expect(orderBlocker(base, ok)).toBeNull());
  it("bloquea por revisión, proveedor, RX, eje y DP", () => {
    expect(orderBlocker(base, { ...ok, prescriptionReviewed: false })).toBe("prescription_not_reviewed");
    expect(orderBlocker(base, { ...ok, procurementConfirmed: false })).toBe("procurement_not_confirmed");
    expect(orderBlocker({ ...base, oi_cyl: null }, ok)).toBe("rx_incomplete");
    expect(orderBlocker({ ...base, od_axis: null }, ok)).toBe("axis_required");
    expect(orderBlocker({ ...base, oi_pd: null }, ok)).toBe("pd_required");
  });
  it("monofocal: no acepta ADD (no se convierte) y exige uso", () => {
    expect(orderBlocker({ ...base, od_add: 1.5 }, ok)).toBe("add_not_allowed_for_single_vision");
    expect(orderBlocker({ ...base, requested_use: null }, ok)).toBe("use_unconfirmed");
    expect(BLOCKER_TEXT.add_not_allowed_for_single_vision).toMatch(/no se convierte/);
  });
  it("multifocal/bifocal: ADD, alturas y medición profesional sobre marco ajustado", () => {
    const mf = { ...base, family: "Multifocal" as const, requested_use: null, od_add: 2, oi_add: 2 };
    expect(orderBlocker({ ...mf, od_add: null }, ok)).toBe("add_required");
    expect(orderBlocker(mf, ok)).toBe("heights_required");
    expect(orderBlocker({ ...mf, od_height: 18, oi_height: 18 }, ok)).toBe("professional_measurement_required");
    expect(orderBlocker({ ...mf, od_height: 18, oi_height: 18, measurement_source: "professional_on_fitted_frame", measured_by: "X", measured_at: "2026-10-22" }, ok)).toBeNull();
    expect(BLOCKER_TEXT.professional_measurement_required).toMatch(/No se mide con selfie/);
  });
  it("cada código de bloqueo existe en la función SQL", () => {
    const sql = readFileSync("supabase/pendientes/04_pedidos_laboratorio.sql", "utf8");
    for (const code of Object.keys(BLOCKER_TEXT)) expect(sql).toContain(`'${code}'`);
  });
});

describe("CSV seguro", () => {
  it("neutraliza fórmulas pero conserva números negativos", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+cmd")).toBe(`"'+cmd"`);
    expect(csvCell("@SUM(A1)")).toBe(`"'@SUM(A1)"`);
    expect(csvCell("-2+3")).toBe(`"'-2+3"`);
    expect(csvCell(-2.25)).toBe("-2.25");
    expect(csvCell("-1.5")).toBe("-1.5");
    expect(csvCell(null)).toBe("");
    expect(csvCell("a,b\nc")).toBe(`"a,b c"`);
  });
  it("genera cabecera fija, BOM y CRLF", () => {
    const row = Object.fromEntries(CSV_COLUMNS.map((c) => [c, null])) as unknown as ExportRow;
    const csv = toCsv([{ ...row, pedido: "1", marco: "=malo", od_sph: -1 }]);
    expect(csv.startsWith("﻿pedido,marco,referencia_proveedor")).toBe(true);
    expect(csv).toContain(`1,"'=malo",`);
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});

describe("errores", () => {
  it("traduce bloqueos y conflictos", () => {
    expect(orderErrorToResponse("pd_required").status).toBe(422);
    expect(orderErrorToResponse("version_conflict").status).toBe(409);
    expect(orderErrorToResponse("x", "23505").status).toBe(409);
    expect(orderErrorToResponse("raro").status).toBe(502);
  });
});
