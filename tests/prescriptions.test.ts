import { describe, expect, it } from "vitest";
import { prescriptionFileType, readLimitedFormData, sameOrigin, validQuoteId } from "../src/lib/prescriptions";

describe("private prescription upload boundaries", () => {
  it("detects content rather than trusting a filename or declared MIME", () => {
    expect(prescriptionFileType(new TextEncoder().encode("<svg onload='alert(1)'>"))).toBeNull();
    expect(prescriptionFileType(new TextEncoder().encode("%PDF-1.7\nqa test"))).toEqual({ mime:"application/pdf", extension:"pdf" });
    expect(prescriptionFileType(new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]))).toEqual({ mime:"image/png", extension:"png" });
    expect(prescriptionFileType(new Uint8Array([255,216,255,224,0,0,0,0,0,0,0,0]))).toEqual({ mime:"image/jpeg", extension:"jpg" });
    expect(prescriptionFileType(new TextEncoder().encode("RIFF0000WEBP"))).toEqual({ mime:"image/webp", extension:"webp" });
    expect(prescriptionFileType(new Uint8Array(2))).toBeNull();
  });
  it("rejects requests from another origin and requests without an origin", () => {
    expect(sameOrigin(new Request("https://optica.test/api/recetas", {headers:{origin:"https://optica.test"}}))).toBe(true);
    expect(sameOrigin(new Request("https://optica.test/api/recetas", {headers:{origin:"https://evil.test"}}))).toBe(false);
    expect(sameOrigin(new Request("https://optica.test/api/recetas"))).toBe(false);
  });
  it("rejects arbitrary quote identifiers before any query", () => {
    expect(validQuoteId("../../other-user")).toBe(false);
    expect(validQuoteId("72000000-0000-4000-8000-000000000001")).toBe(true);
  });
  it("bounds streamed input even when content-length is absent", async () => {
    const body = new FormData(); body.set("consent", "true"); body.set("file", new Blob(["%PDF-1.7 synthetic fixture"]), "qa.pdf");
    const encoded = new Response(body);
    const contentType = encoded.headers.get("content-type")!;
    const bytes = new Uint8Array(await encoded.arrayBuffer());
    const request = new Request("https://optica.test/api/recetas", { method: "POST", body: bytes, headers: { "content-type": contentType } });
    expect(request.headers.has("content-length")).toBe(false);
    await expect(readLimitedFormData(request, 10)).rejects.toBeInstanceOf(RangeError);
    const valid = new Request("https://optica.test/api/recetas", { method:"POST", body: bytes, headers: { "content-type": contentType } });
    expect((await readLimitedFormData(valid, 2048)).get("consent")).toBe("true");
  });
});
