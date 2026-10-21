import { describe, expect, it } from "vitest";
import { estimateLentiaLensSale, type LensSaleRequest } from "../src/lib/lentia-sale-engine";

const request: LensSaleRequest = { family: "Monofocal", treatment: "Orgánico Antirreflejo", source: "stock", requestedUse: "distance", prescriptionUse: "distance", right: { sphere: -2, cylinder: -2, axis: 90 }, left: { sphere: 1, cylinder: 0 } };
describe("tarifa de venta propia de Óptica Global exportada en solo lectura", () => {
  it("coincide con stock38000/48000 y laboratorio55000/68000 sin tratarlos como total del par", () => {
    expect(estimateLentiaLensSale(request)).toMatchObject({ kind: "lens_estimate", lensSubtotalClp: 38000, includesFrame: false });
    expect(estimateLentiaLensSale({ ...request, treatment: "Orgánico Filtro Azul" })).toMatchObject({ lensSubtotalClp: 48000 });
    expect(estimateLentiaLensSale({ ...request, source: "laboratory" })).toMatchObject({ lensSubtotalClp: 55000 });
    expect(estimateLentiaLensSale({ ...request, source: "laboratory", treatment: "Orgánico Filtro Azul" })).toMatchObject({ lensSubtotalClp: 68000 });
  });
  it("toma el ojo de mayor rango y cambia precio al superar cilindro2", () => {
    expect(estimateLentiaLensSale({ ...request, left: { sphere: -3, cylinder: -3, axis: 30 } })).toMatchObject({ lensSubtotalClp: 42000, range: "±4.00 / ±4.00" });
    expect(estimateLentiaLensSale({ ...request, treatment: "Orgánico Filtro Azul", left: { sphere: -3, cylinder: -3, axis: 30 } })).toMatchObject({ lensSubtotalClp: 55000 });
  });
  it("fuera de tarifa no usa la banda más cercana ni precio0", () => {
    const result = estimateLentiaLensSale({ ...request, right: { sphere: -6.25, cylinder: 0 } });
    expect(result).toEqual({ kind: "requires_review", reason: "outside_tariff" });
    expect(result).not.toHaveProperty("lensSubtotalClp");
  });
  it("precio stock nulo no se inventa ni se cambia a laboratorio silenciosamente", () => {
    expect(estimateLentiaLensSale({ ...request, treatment: "Fotocromático Café Antirreflejo" })).toEqual({ kind: "requires_review", reason: "source_not_priced" });
  });
  it("no cotiza multifocal/bifocal automáticamente sin circuito de medición", () => {
    expect(estimateLentiaLensSale({ ...request, family: "Multifocal" })).toEqual({ kind: "requires_review", reason: "measurements_required" });
    expect(estimateLentiaLensSale({ ...request, family: "Bifocal" })).toEqual({ kind: "requires_review", reason: "measurements_required" });
  });
  it("no usa receta lejana para el par de cerca ni convierte campos incompletos", () => {
    expect(estimateLentiaLensSale({ ...request, requestedUse: "near" })).toEqual({ kind: "requires_review", reason: "use_unconfirmed" });
    expect(estimateLentiaLensSale({ ...request, right: { sphere: 0, cylinder: -1 } })).toEqual({ kind: "requires_review", reason: "incomplete_prescription" });
  });
});
