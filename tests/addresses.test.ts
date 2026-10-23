import { describe, expect, it } from "vitest";
import { formatAddress, parseAddress } from "../src/lib/addresses";
import { accountReturnPath } from "../src/lib/prescription-context";

const base: Record<string, string> = { recipient: "Ana Pérez", phone: "+56 9 1234 5678", region: "Metropolitana", comuna: "Ñuñoa", street: "Irarrázaval", street_number: "1234", unit: "", notes: "" };
const parse = (o: Record<string, string>) => parseAddress((k) => o[k]);

describe("direcciones de despacho", () => {
  it("acepta una dirección completa y deja vacíos opcionales como null", () => {
    const r = parse(base);
    expect(r.ok && r.value.unit).toBeNull();
    expect(r.ok && formatAddress(r.value)).toBe("Irarrázaval 1234, Ñuñoa, Metropolitana");
  });
  it("rechaza región inventada, teléfono inválido y campos obligatorios vacíos", () => {
    expect(parse({ ...base, region: "Narnia" })).toEqual({ ok: false, error: "region" });
    expect(parse({ ...base, phone: "abc123" })).toEqual({ ok: false, error: "phone" });
    expect(parse({ ...base, street: " " })).toEqual({ ok: false, error: "street" });
    expect(parse({ ...base, notes: "x".repeat(301) })).toEqual({ ok: false, error: "notes" });
  });
  it("volver a la selección tras ingresar, sin abrir redirecciones externas", () => {
    expect(accountReturnPath("/cotizar")).toBe("/cotizar");
    expect(accountReturnPath("/cotizar?x=https://evil.example")).toBe("/cotizar");
    expect(accountReturnPath("https://evil.example/cotizar")).toBe("/mi-cuenta");
    expect(accountReturnPath("//evil.example/cotizar")).toBe("/mi-cuenta");
    expect(accountReturnPath("/admin")).toBe("/mi-cuenta");
  });
});
