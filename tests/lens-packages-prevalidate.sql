-- PREVALIDACIÓN de 03_paquetes_cristales.sql + pruebas en UNA transacción con ROLLBACK. Esperado: error "LENS_OK".
begin;
-- PROPUESTA (no aplicada): catálogo mínimo de paquetes de cristales con precios "DESDE, por par" confirmados por Pablo
-- (21/10/2026, vía Codex). No cambia products.price_clp (sigue siendo SOLO el marco), no abre cotizaciones ni pagos,
-- no valida graduaciones (límites no confirmados) y no incluye fotocromático (sin precio confirmado).
--
-- Modelo: paquetes EXCLUYENTES (se elige uno). "Filtro azul" = base + $20.000 = $48.000; no es antirreflejo + $10.000,
-- así que no existe combinación antirreflejo+filtro azul con precio: no se ofrece.
-- Uso: solo monofocal para LEJOS o CERCA. Progresivos/bifocales no se ofrecen hasta tener precio y criterio.

create table public.lens_packages (
  code text primary key check (code ~ '^[a-z_]{3,40}$'),
  name text not null check (char_length(name) between 3 and 60),
  description text check (description is null or char_length(description) <= 300),
  price_from_clp integer not null check (price_from_clp > 0),
  -- Siempre referencial: el valor final se confirma tras revisar la receta.
  price_basis text not null default 'desde_por_par' check (price_basis = 'desde_por_par'),
  usages text[] not null check (usages <@ array['lejos', 'cerca'] and cardinality(usages) > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort integer not null default 0,
  confirmed_source text not null check (char_length(confirmed_source) between 3 and 120),
  confirmed_at date not null,
  updated_at timestamptz not null default now()
);
alter table public.lens_packages enable row level security;
revoke all on public.lens_packages from anon, authenticated;
grant select on public.lens_packages to anon, authenticated;
grant insert, update, delete on public.lens_packages to authenticated;
create policy "paquetes publicados visibles" on public.lens_packages for select to anon, authenticated
  using (status = 'published' or public.is_admin());
create policy "admin gestiona paquetes" on public.lens_packages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create trigger lens_packages_touch before update on public.lens_packages
  for each row execute function public.touch_updated_at();

insert into public.lens_packages (code, name, description, price_from_clp, usages, status, sort, confirmed_source, confirmed_at) values
  ('blanco', 'Cristal blanco', 'Monofocal transparente, sin tratamientos adicionales.', 28000, array['lejos', 'cerca'], 'published', 1, 'Pablo (vía Codex)', '2026-10-21'),
  ('antirreflejo', 'Antirreflejo', 'Monofocal con tratamiento antirreflejo.', 38000, array['lejos', 'cerca'], 'published', 2, 'Pablo (vía Codex)', '2026-10-21'),
  ('filtro_azul', 'Filtro de luz azul', 'Monofocal con filtro de luz azul (base + $20.000).', 48000, array['lejos', 'cerca'], 'published', 3, 'Pablo (vía Codex)', '2026-10-21');


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

rollback;
