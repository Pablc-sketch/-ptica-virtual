export const PRESCRIPTION_MAX_BYTES = 4 * 1024 * 1024;
export const PRESCRIPTION_CONSENT_VERSION = "2026-10-21";

export function prescriptionFileType(bytes: Uint8Array): { mime: string; extension: string } | null {
  if (bytes.length < 12) return null;
  if ([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v,i)=>bytes[i]===v)) return { mime: "image/png", extension: "png" };
  if (bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return { mime: "image/jpeg", extension: "jpg" };
  const text = new TextDecoder("ascii");
  if (text.decode(bytes.subarray(0,4))==="RIFF" && text.decode(bytes.subarray(8,12))==="WEBP") return { mime:"image/webp", extension:"webp" };
  if (text.decode(bytes.subarray(0,5))==="%PDF-") return { mime:"application/pdf", extension:"pdf" };
  return null;
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export function validQuoteId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function readLimitedFormData(request: Request, limit: number): Promise<FormData> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    size += result.value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new RangeError("Payload too large");
    }
    chunks.push(result.value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new Response(body, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
}
