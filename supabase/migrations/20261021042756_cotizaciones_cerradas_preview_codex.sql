-- Vista previa: cierre efectivo incluso al invocar RPC directamente.
-- Abrir requiere una nueva migración explícita y QUOTES_OPEN=true en Vercel.
revoke execute on function public.create_quote(text, text, text, text, jsonb) from public, anon, authenticated;
