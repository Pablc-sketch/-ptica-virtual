import type { SupabaseClient, User } from "@supabase/supabase-js";

export type SessionResult =
  | { status: "user"; user: User }
  | { status: "anonymous" }
  | { status: "unavailable" };

export type AuthClass = "anonymous" | "unavailable" | "unknown";

// Códigos de GoTrue que significan "esta sesión ya no sirve" (no que el servicio falle).
const SESSION_INVALID_CODES = new Set([
  "bad_jwt",
  "session_not_found",
  "session_expired",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "user_not_found",
  "no_authorization",
]);

const NETWORK_MESSAGE = /fetch failed|failed to fetch|network|econnrefused|econnreset|enotfound|etimedout|socket hang up/i;
// Fallos locales al decodificar una cookie de sesión corrupta (ocurren antes de llegar al servidor).
const COOKIE_MESSAGE = /invalid utf-8|invalid jwt|malformed|unexpected token|invalid base64|unexpected end of json/i;

/**
 * Clasifica un error de autenticación:
 * - "anonymous": no hay sesión válida (ausente, caducada, revocada o cookie corrupta conocida).
 * - "unavailable": el servicio de acceso falló o está saturado (429, 5xx, red, timeout). NO es "sin sesión".
 * - "unknown": no lo reconocemos; quien llama no debe ocultarlo.
 */
export function classifyAuthError(error: unknown): AuthClass {
  if (!error || typeof error !== "object") return "unknown";
  const e = error as { name?: string; status?: number; code?: string; message?: string };
  const status = typeof e.status === "number" ? e.status : undefined;
  const message = typeof e.message === "string" ? e.message : "";

  if (status === 429 || e.code === "over_request_rate_limit" || e.code === "request_timeout") return "unavailable";
  if (e.name === "AuthRetryableFetchError" || e.name === "AbortError" || e.name === "TimeoutError") return "unavailable";
  if (status !== undefined && status >= 500) return "unavailable";
  if (error instanceof TypeError && NETWORK_MESSAGE.test(message)) return "unavailable";

  if (e.name === "AuthSessionMissingError" || e.name === "AuthInvalidJwtError" || e.name === "AuthInvalidTokenResponseError") return "anonymous";
  if (status === 401 || status === 403) return "anonymous";
  if (e.code && SESSION_INVALID_CODES.has(e.code)) return "anonymous";
  if (error instanceof SyntaxError) return "anonymous";
  if (error instanceof Error && COOKIE_MESSAGE.test(message)) return "anonymous";
  return "unknown";
}

// Distingue "no hay sesión" de "el servicio de acceso falló". Un error desconocido NO se oculta: se relanza.
export async function getSession(supabase: Pick<SupabaseClient, "auth">): Promise<SessionResult> {
  let result: Awaited<ReturnType<SupabaseClient["auth"]["getUser"]>>;
  try {
    result = await supabase.auth.getUser();
  } catch (thrown) {
    const kind = classifyAuthError(thrown);
    if (kind === "anonymous") return { status: "anonymous" };
    if (kind === "unavailable") return { status: "unavailable" };
    throw thrown;
  }
  const { data, error } = result;
  if (data?.user) return { status: "user", user: data.user };
  if (!error) return { status: "anonymous" };
  const kind = classifyAuthError(error);
  if (kind === "anonymous") return { status: "anonymous" };
  if (kind === "unavailable") return { status: "unavailable" };
  throw error instanceof Error ? error : new Error(`auth_error: ${JSON.stringify(error)}`);
}
