-- Endurecimiento de privilegios de tabla (defensa en profundidad). Supabase concede por defecto ALL a anon y authenticated
-- en tablas nuevas de public; la protección real es RLS, pero TRUNCATE no pasa por RLS y las escrituras sin policy no se usan.
-- Se conservan exactamente los privilegios que las policies actuales necesitan. No toca storage ni funciones.
begin;

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- anon solo lee catálogo público (las cotizaciones se crean por RPC SECURITY DEFINER, hoy revocado).
revoke insert, update, delete on all tables in schema public from anon;
revoke select on public.profiles, public.quotes, public.quote_items from anon;

-- authenticated: sin policies de escritura en estas tablas.
revoke insert, update, delete on public.profiles, public.quote_items from authenticated;
revoke insert on public.quotes from authenticated;

commit;
