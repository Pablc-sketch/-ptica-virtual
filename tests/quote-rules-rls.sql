-- Pruebas de supabase/pendientes/03_reglas_cotizador.sql (rollback forzado). Resultado: "RULES_OK" / "RULES_FALLOS: ...".
-- Usa bandas con valores sintéticos SOLO para probar restricciones; no son rangos ni precios reales.
do $$
declare adm uuid := gen_random_uuid(); u uuid := gen_random_uuid(); p uuid := gen_random_uuid(); n integer; t text; fails text[] := '{}';
begin
  insert into auth.users (id, email) values (adm, 'qradm@test.invalid'), (u, 'qru@test.invalid');
  update public.profiles set role = 'admin' where id = adm;
  insert into public.products (id, slug, name, price_clp, status) values (p, 'qr-test', 'Marco prueba', 15000, 'draft');

  -- price_clp intacto y base del par opcional
  select pair_base_price_clp::text into t from public.products where id = p;
  if t is not null then fails := fails || 'pair_base no es NULL por defecto'; end if;
  begin update public.products set pair_base_price_clp = 0 where id = p; fails := fails || 'pair_base 0 aceptado'; exception when others then null; end;
  update public.products set pair_base_price_clp = 31000 where id = p;
  select price_clp into n from public.products where id = p;
  if n <> 15000 then fails := fails || 'price_clp cambió'; end if;

  -- tratamientos confirmados y alternativos
  select count(*) into n from public.lens_treatments where (code, surcharge_clp) in (('blanco', 0), ('antirreflejo', 10000), ('filtro_azul', 20000)) and status = 'published';
  if n <> 3 then fails := fails || 'recargos de tratamiento distintos a 0/10000/20000'; end if;

  -- configuración: política sin confirmar, valores inválidos rechazados, fila única
  select coalesce(surcharge_policy, 'NULL') into t from public.quote_engine_settings;
  if t <> 'NULL' then fails := fails || 'política de recargo preconfigurada'; end if;
  begin update public.quote_engine_settings set surcharge_policy = 'promedio', confirmed_at = current_date; fails := fails || 'política inválida aceptada'; exception when others then null; end;
  begin update public.quote_engine_settings set surcharge_policy = 'max_per_pair'; fails := fails || 'política sin fecha de confirmación aceptada'; exception when others then null; end;
  begin insert into public.quote_engine_settings (id) values (false); fails := fails || 'segunda fila de configuración'; exception when others then null; end;

  -- bandas: pasos de 0,25, cilindro negativo, sin solape entre publicadas
  insert into public.rx_surcharge_bands (component, min_value, max_value, surcharge_clp, status, confirmed_source, confirmed_at)
    values ('sph', -2.00, 2.00, 0, 'published', 'prueba', current_date);
  begin insert into public.rx_surcharge_bands (component, min_value, max_value, surcharge_clp, status, confirmed_source, confirmed_at) values ('sph', 1.75, 4.00, 5000, 'published', 'prueba', current_date); fails := fails || 'solape entre bandas publicadas'; exception when others then null; end;
  insert into public.rx_surcharge_bands (component, min_value, max_value, surcharge_clp, status, confirmed_source, confirmed_at)
    values ('sph', 1.75, 4.00, 5000, 'draft', 'prueba', current_date);
  begin update public.rx_surcharge_bands set status = 'published' where min_value = 1.75; fails := fails || 'se publicó un borrador solapado'; exception when others then null; end;
  insert into public.rx_surcharge_bands (component, min_value, max_value, surcharge_clp, status, confirmed_source, confirmed_at)
    values ('cyl', -2.00, 0.00, 0, 'published', 'prueba', current_date);
  begin insert into public.rx_surcharge_bands (component, min_value, max_value, surcharge_clp, confirmed_source, confirmed_at) values ('sph', -1.10, 0.00, 0, 'prueba', current_date); fails := fails || 'paso distinto de 0,25 aceptado'; exception when others then null; end;
  begin insert into public.rx_surcharge_bands (component, min_value, max_value, surcharge_clp, confirmed_source, confirmed_at) values ('cyl', 0.25, 1.00, 0, 'prueba', current_date); fails := fails || 'cilindro positivo aceptado'; exception when others then null; end;
  begin insert into public.rx_surcharge_bands (component, min_value, max_value, surcharge_clp, confirmed_source, confirmed_at) values ('sph', 2.00, -2.00, 0, 'prueba', current_date); fails := fails || 'banda invertida aceptada'; exception when others then null; end;

  -- anon: solo publicado, sin escribir
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into n from public.rx_surcharge_bands;
  if n <> 2 then fails := fails || format('anon ve %s bandas (esperado 2 publicadas)', n); end if;
  select count(*) into n from public.quote_engine_settings;
  if n <> 1 then fails := fails || 'anon no lee la configuración'; end if;
  begin insert into public.rx_surcharge_bands (component, min_value, max_value, surcharge_clp, confirmed_source, confirmed_at) values ('sph', 5.00, 6.00, 0, 'x', current_date); fails := fails || 'anon creó banda'; exception when others then null; end;
  begin update public.quote_engine_settings set surcharge_policy = 'sum_per_eye', confirmed_at = current_date; fails := fails || 'anon editó política'; exception when others then null; end;
  reset role;

  -- cliente: no edita reglas
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.lens_treatments set surcharge_clp = 1 where code = 'filtro_azul';
  get diagnostics n = row_count;
  if n <> 0 then fails := fails || 'cliente editó recargo'; end if;
  update public.quote_engine_settings set surcharge_policy = 'sum_per_eye', confirmed_at = current_date, confirmed_source = 'cliente';
  get diagnostics n = row_count;
  if n <> 0 then fails := fails || 'cliente editó política'; end if;
  reset role;

  -- admin: confirma política y ve borradores
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.quote_engine_settings set surcharge_policy = 'max_per_pair', confirmed_at = current_date, confirmed_source = 'prueba admin';
  get diagnostics n = row_count;
  if n <> 1 then fails := fails || 'admin no pudo confirmar política'; end if;
  select count(*) into n from public.rx_surcharge_bands;
  if n <> 3 then fails := fails || 'admin no ve el borrador'; end if;
  reset role;

  if array_length(fails, 1) is null then raise exception 'RULES_OK'; end if;
  raise exception 'RULES_FALLOS: %', array_to_string(fails, ' | ');
end;
$$;
