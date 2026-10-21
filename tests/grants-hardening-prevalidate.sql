-- PREVALIDACIÓN de 02_endurecer_grants.sql en UNA transacción con ROLLBACK. Esperado: error "GRANTS_OK".
begin;
-- Endurecimiento de privilegios de tabla (defensa en profundidad). Supabase concede por defecto ALL a anon y authenticated
-- en tablas nuevas de public; la protección real es RLS, pero TRUNCATE no pasa por RLS y las escrituras sin policy no se usan.
-- Se conservan exactamente los privilegios que las policies actuales necesitan. No toca storage ni funciones.

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- anon solo lee catálogo público (las cotizaciones se crean por RPC SECURITY DEFINER, hoy revocado).
revoke insert, update, delete on all tables in schema public from anon;
revoke select on public.profiles, public.quotes, public.quote_items from anon;

-- authenticated: sin policies de escritura en estas tablas.
revoke insert, update, delete on public.profiles, public.quote_items from authenticated;
revoke insert on public.quotes from authenticated;


-- Verifica supabase/pendientes/02_endurecer_grants.sql: quita lo innecesario y CONSERVA lo que las policies usan.
-- Solo lectura de privilegios; termina en excepción con el resultado ("GRANTS_OK" / "GRANTS_FALLOS: ...").
do $$
declare fails text[] := '{}'; t text;
begin
  foreach t in array array['brands','products','product_images','product_models','profiles','quotes','quote_items','prescriptions'] loop
    if has_table_privilege('anon', 'public.' || t, 'TRUNCATE') or has_table_privilege('authenticated', 'public.' || t, 'TRUNCATE') then fails := fails || ('TRUNCATE en ' || t); end if;
    if has_table_privilege('anon', 'public.' || t, 'INSERT') or has_table_privilege('anon', 'public.' || t, 'UPDATE') or has_table_privilege('anon', 'public.' || t, 'DELETE') then fails := fails || ('anon escribe ' || t); end if;
  end loop;
  -- lo que debe seguir funcionando
  foreach t in array array['brands','products','product_images','product_models'] loop
    if not has_table_privilege('anon', 'public.' || t, 'SELECT') then fails := fails || ('anon perdió SELECT en ' || t); end if;
    if not (has_table_privilege('authenticated', 'public.' || t, 'INSERT') and has_table_privilege('authenticated', 'public.' || t, 'UPDATE') and has_table_privilege('authenticated', 'public.' || t, 'DELETE')) then fails := fails || ('admin perdió escritura en ' || t); end if;
  end loop;
  if not (has_table_privilege('authenticated', 'public.quotes', 'UPDATE') and has_table_privilege('authenticated', 'public.quotes', 'DELETE')) then fails := fails || 'admin perdió gestión de cotizaciones'; end if;
  if not (has_table_privilege('authenticated', 'public.prescriptions', 'INSERT') and has_table_privilege('authenticated', 'public.prescriptions', 'DELETE')) then fails := fails || 'cliente perdió subir/borrar recetas'; end if;
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE') then fails := fails || 'authenticated puede actualizar profiles'; end if;
  if has_table_privilege('authenticated', 'public.quotes', 'INSERT') then fails := fails || 'authenticated inserta cotizaciones directo'; end if;
  if array_length(fails, 1) is null then raise exception 'GRANTS_OK'; end if;
  raise exception 'GRANTS_FALLOS: %', array_to_string(fails, ' | ');
end;
$$;

rollback;
