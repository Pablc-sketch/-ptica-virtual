import { describe, expect, it } from "vitest";
import { parseQuote } from "../src/lib/quotes";

const id = "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b";
const base = { name: "Ana Pérez", email: "ana@correo.cl", items: [{ product_id: id, quantity: 1 }] };

describe("parseQuote", () => {
  it("acepta una cotización válida", () => {
    expect(parseQuote(base)).toMatchObject({ ok: true });
  });
  it("exige email o teléfono", () => {
    expect(parseQuote({ ...base, email: "" })).toMatchObject({ ok: false });
  });
  it("rechaza email inválido, producto no UUID y cantidad fuera de rango", () => {
    expect(parseQuote({ ...base, email: "x" })).toMatchObject({ ok: false });
    expect(parseQuote({ ...base, items: [{ product_id: "1", quantity: 1 }] })).toMatchObject({ ok: false });
    expect(parseQuote({ ...base, items: [{ product_id: id, quantity: 11 }] })).toMatchObject({ ok: false });
  });
  it("rechaza listas vacías y cuerpos no objeto", () => {
    expect(parseQuote({ ...base, items: [] })).toMatchObject({ ok: false });
    expect(parseQuote(null)).toMatchObject({ ok: false });
  });
});
