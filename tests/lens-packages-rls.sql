-- Pruebas de supabase/pendientes/03_paquetes_cristales.sql (rollback forzado). Resultado: "LENS_OK" / "LENS_FALLOS: ...".
do $$
declare adm uuid := gen_random_uuid(); u uuid := gen_random_uuid(); n integer; fails text[] := '{}';
begin
  insert into auth.users (id, email) values (adm, 'lpadm@test.invalid'), (u, 'lpu@test.invalid');
  update public.profiles set role = 'admin' where id = adm;
  insert into public.lens_packages (code, name, price_from_clp, usages, status, confirmed_source, confirmed_at)
    values ('borrador_test', 'Borrador', 1000, array['lejos'], 'draft', 'prueba', current_date);

  -- precios confirmados exactos y modelo excluyente
  select count(*) into n from public.lens_packages where (code, price_from_clp) in (('blanco', 28000), ('antirreflejo', 38000), ('filtro_azul', 48000)) and status = 'published';
  if n <> 3 then fails := fails || 'precios iniciales distintos a los confirmados'; end if;
  if exists (select 1 from public.lens_packages where code ilike '%foto%' or 'progresivo' = any(usages)) then fails := fails || 'hay fotocromático o progresivo sin precio confirmado'; end if;

  -- restricciones
  begin insert into public.lens_packages (code, name, price_from_clp, usages, confirmed_source, confirmed_at) values ('gratis', 'Gratis', 0, array['lejos'], 'x', current_date); fails := fails || 'precio 0 aceptado'; exception when others then null; end;
  begin insert into public.lens_packages (code, name, price_from_clp, usages, confirmed_source, confirmed_at) values ('prog', 'Prog', 90000, array['progresivo'], 'x', current_date); fails := fails || 'uso progresivo aceptado'; exception when others then null; end;
  begin insert into public.lens_packages (code, name, price_from_clp, usages, price_basis, confirmed_source, confirmed_at) values ('final', 'Final', 9000, array['lejos'], 'precio_final', 'x', current_date); fails := fails || 'precio no referencial aceptado'; exception when others then null; end;

  -- anon: solo publicados, sin escribir
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into n from public.lens_packages;
  if n <> 3 then fails := fails || format('anon ve %s paquetes (esperado 3)', n); end if;
  begin update public.lens_packages set price_from_clp = 1 where code = 'blanco'; fails := fails || 'anon editó precio'; exception when others then null; end;
  reset role;

  -- cliente: no edita
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.lens_packages set price_from_clp = 1 where code = 'blanco';
  get diagnostics n = row_count;
  if n <> 0 then fails := fails || 'cliente editó precio'; end if;
  begin insert into public.lens_packages (code, name, price_from_clp, usages, confirmed_source, confirmed_at) values ('cliente', 'Cliente', 5000, array['lejos'], 'x', current_date); fails := fails || 'cliente creó paquete'; exception when others then null; end;
  reset role;

  -- admin: ve borradores y edita
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.lens_packages;
  if n <> 4 then fails := fails || 'admin no ve borradores'; end if;
  update public.lens_packages set description = 'ok' where code = 'borrador_test';
  get diagnostics n = row_count;
  if n <> 1 then fails := fails || 'admin no pudo editar'; end if;
  reset role;

  if array_length(fails, 1) is null then raise exception 'LENS_OK'; end if;
  raise exception 'LENS_FALLOS: %', array_to_string(fails, ' | ');
end;
$$;
