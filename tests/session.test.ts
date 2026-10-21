import { describe, expect, it } from "vitest";
import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError } from "@supabase/supabase-js";
import { classifyAuthError, getSession } from "../src/lib/session";

type GetUser = () => Promise<unknown>;
const client = (getUser: GetUser) => ({ auth: { getUser } }) as unknown as Parameters<typeof getSession>[0];
const USER = { id: "u1", email: "a@b.cl" };

describe("classifyAuthError", () => {
  it("sin sesión / sesión inválida -> anonymous", () => {
    expect(classifyAuthError(new AuthSessionMissingError())).toBe("anonymous");
    expect(classifyAuthError(new AuthApiError("jwt expired", 401, "bad_jwt"))).toBe("anonymous");
    expect(classifyAuthError(new AuthApiError("forbidden", 403, "session_not_found"))).toBe("anonymous");
    expect(classifyAuthError(new AuthApiError("Invalid Refresh Token", 400, "refresh_token_not_found"))).toBe("anonymous");
  });
  it("429 y 5xx -> unavailable (servicio saturado o caído, no sesión inválida)", () => {
    expect(classifyAuthError(new AuthApiError("rate limit", 429, "over_request_rate_limit"))).toBe("unavailable");
    expect(classifyAuthError(new AuthApiError("too many", 429, undefined))).toBe("unavailable");
    expect(classifyAuthError(new AuthApiError("bad gateway", 502, undefined))).toBe("unavailable");
    expect(classifyAuthError(new AuthApiError("down", 503, undefined))).toBe("unavailable");
    expect(classifyAuthError(new AuthRetryableFetchError("net", 0))).toBe("unavailable");
  });
  it("errores de red lanzados -> unavailable", () => {
    expect(classifyAuthError(new TypeError("fetch failed"))).toBe("unavailable");
    expect(classifyAuthError(Object.assign(new Error("t"), { name: "AbortError" }))).toBe("unavailable");
  });
  it("cookie corrupta conocida -> anonymous", () => {
    expect(classifyAuthError(new Error("Invalid UTF-8 sequence"))).toBe("anonymous");
    expect(classifyAuthError(new SyntaxError("Unexpected token } in JSON at position 3"))).toBe("anonymous");
    expect(classifyAuthError(new Error("Invalid JWT structure"))).toBe("anonymous");
  });
  it("lo desconocido no se clasifica como anónimo", () => {
    expect(classifyAuthError(new Error("boom"))).toBe("unknown");
    expect(classifyAuthError(new AuthApiError("raro", 400, "validation_failed"))).toBe("unknown");
    expect(classifyAuthError(null)).toBe("unknown");
    expect(classifyAuthError("texto")).toBe("unknown");
  });
});

describe("getSession", () => {
  it("devuelve la persona cuando hay sesión", async () => {
    expect(await getSession(client(async () => ({ data: { user: USER }, error: null })))).toEqual({ status: "user", user: USER });
  });
  it("sin sesión (sin error o AuthSessionMissingError) -> anonymous", async () => {
    expect(await getSession(client(async () => ({ data: { user: null }, error: null })))).toEqual({ status: "anonymous" });
    expect(await getSession(client(async () => ({ data: { user: null }, error: new AuthSessionMissingError() })))).toEqual({ status: "anonymous" });
  });
  it("401/403 -> anonymous", async () => {
    for (const status of [401, 403]) {
      expect(await getSession(client(async () => ({ data: { user: null }, error: new AuthApiError("x", status, "bad_jwt") })))).toEqual({ status: "anonymous" });
    }
  });
  it("429 -> unavailable, no anonymous", async () => {
    expect(await getSession(client(async () => ({ data: { user: null }, error: new AuthApiError("rate", 429, "over_request_rate_limit") })))).toEqual({ status: "unavailable" });
  });
  it("503 -> unavailable", async () => {
    expect(await getSession(client(async () => ({ data: { user: null }, error: new AuthApiError("down", 503, undefined) })))).toEqual({ status: "unavailable" });
  });
  it("excepción de red -> unavailable", async () => {
    expect(await getSession(client(async () => { throw new TypeError("fetch failed"); }))).toEqual({ status: "unavailable" });
  });
  it("excepción por cookie inválida conocida -> anonymous", async () => {
    expect(await getSession(client(async () => { throw new Error("Invalid UTF-8 sequence"); }))).toEqual({ status: "anonymous" });
  });
  it("errores desconocidos NO se ocultan: se relanzan (lanzados o devueltos)", async () => {
    await expect(getSession(client(async () => { throw new Error("boom"); }))).rejects.toThrow("boom");
    await expect(getSession(client(async () => ({ data: { user: null }, error: new AuthApiError("raro", 400, "validation_failed") })))).rejects.toThrow("raro");
    await expect(getSession(client(async () => ({ data: { user: null }, error: { name: "Raro" } })))).rejects.toThrow();
  });
});
