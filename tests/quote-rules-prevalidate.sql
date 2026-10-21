-- PREVALIDACIÓN de 03_reglas_cotizador.sql + pruebas en UNA transacción con ROLLBACK. Esperado: error "RULES_OK".
begin;
-- PROPUESTA (no aplicada): almacenamiento de reglas para el motor de cotización óptica (src/lib/optical-quote-engine.ts, de Codex).
-- Reemplaza la propuesta anterior de "paquetes de cristales" (que trataba 28/38/48 como precio de cristales: era incorrecto).
--
-- Confirmado (Pablo, 21/10/2026, vía Codex):
--   * $28.000 / $38.000 / $48.000 son precios DESDE de un PAR COMPLETO (marco + cristales) para blanco / antirreflejo / filtro azul.
--   * Los tratamientos son alternativos (se elige uno): recargo 0 / 10.000 / 20.000 sobre la base del par.
-- NO confirmado (se deja vacío; el motor responde requires_review): base del par de cada marco, bandas ESF/CIL y sus
-- recargos, y política de recargo (máximo por par o suma por ojo).
--
-- products.price_clp NO cambia: sigue siendo SOLO el marco. La base del par va en una columna nueva y nullable.
-- No abre cotizaciones, no toca create_quote ni pagos, no valida límites clínicos ni transpone cilindros.

-- 1) Base del par por marco: marco + cristal blanco monofocal, sin recargos por graduación. NULL = no definido.
alter table public.products
  add column pair_base_price_clp integer check (pair_base_price_clp is null or pair_base_price_clp > 0);
comment on column public.products.pair_base_price_clp is
  'Precio del PAR COMPLETO (marco + cristal blanco monofocal) sin recargos por graduación. NULL = no definido: el motor pide revisión. price_clp sigue siendo solo el marco.';

-- 2) Tratamientos alternativos (uno por par).
create table public.lens_treatments (
  code text primary key check (code ~ '^[a-z_]{3,40}$'),
  name text not null check (char_length(name) between 3 and 60),
  surcharge_clp integer not null check (surcharge_clp >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort integer not null default 0,
  confirmed_source text not null check (char_length(confirmed_source) between 3 and 120),
  confirmed_at date not null,
  updated_at timestamptz not null default now()
);

-- 3) Bandas de recargo por graduación. Valores FIRMADOS en dioptrías, pasos de 0,25. Cilindro en notación NEGATIVA
--    (max_value <= 0): el motor no transpone; una receta con cilindro positivo va a revisión.
create table public.rx_surcharge_bands (
  id uuid primary key default gen_random_uuid(),
  component text not null check (component in ('sph', 'cyl')),
  min_value numeric(5, 2) not null check (min_value between -40 and 40),
  max_value numeric(5, 2) not null check (max_value between -40 and 40),
  surcharge_clp integer not null check (surcharge_clp >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  confirmed_source text not null check (char_length(confirmed_source) between 3 and 120),
  confirmed_at date not null,
  created_at timestamptz not null default now(),
  check (min_value <= max_value),
  check (min_value * 4 = trunc(min_value * 4) and max_value * 4 = trunc(max_value * 4)),
  check (component <> 'cyl' or max_value <= 0)
);
create index rx_surcharge_bands_lookup on public.rx_surcharge_bands (component, status, min_value);

-- Las bandas PUBLICADAS de un mismo componente no pueden solaparse (el motor igual trata "varias bandas" como revisión).
create or replace function public.rx_bands_no_overlap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and exists (
    select 1 from public.rx_surcharge_bands b
    where b.id <> new.id and b.status = 'published' and b.component = new.component
      and b.min_value <= new.max_value and new.min_value <= b.max_value
  ) then
    raise exception 'band_overlap' using errcode = '23P01';
  end if;
  return new;
end;
$$;
create trigger rx_surcharge_bands_no_overlap before insert or update on public.rx_surcharge_bands
  for each row execute function public.rx_bands_no_overlap();

-- 4) Configuración única del motor. La política empieza NULL (no confirmada) => requires_review.
create table public.quote_engine_settings (
  id boolean primary key default true check (id),
  surcharge_policy text check (surcharge_policy in ('max_per_pair', 'sum_per_eye')),
  confirmed_source text check (confirmed_source is null or char_length(confirmed_source) between 3 and 120),
  confirmed_at date,
  updated_at timestamptz not null default now(),
  check ((surcharge_policy is null) = (confirmed_at is null))
);
insert into public.quote_engine_settings (id) values (true);

-- RLS: reglas publicadas legibles por todos (son precios públicos); escritura solo admin.
alter table public.lens_treatments enable row level security;
alter table public.rx_surcharge_bands enable row level security;
alter table public.quote_engine_settings enable row level security;
revoke all on public.lens_treatments, public.rx_surcharge_bands, public.quote_engine_settings from anon, authenticated;
grant select on public.lens_treatments, public.rx_surcharge_bands, public.quote_engine_settings to anon, authenticated;
grant insert, update, delete on public.lens_treatments, public.rx_surcharge_bands to authenticated;
grant update on public.quote_engine_settings to authenticated;

create policy "tratamientos publicados" on public.lens_treatments for select to anon, authenticated
  using (status = 'published' or public.is_admin());
create policy "admin gestiona tratamientos" on public.lens_treatments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "bandas publicadas" on public.rx_surcharge_bands for select to anon, authenticated
  using (status = 'published' or public.is_admin());
create policy "admin gestiona bandas" on public.rx_surcharge_bands for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "configuración legible" on public.quote_engine_settings for select to anon, authenticated using (true);
create policy "admin edita configuración" on public.quote_engine_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create trigger lens_treatments_touch before update on public.lens_treatments
  for each row execute function public.touch_updated_at();
create trigger quote_engine_settings_touch before update on public.quote_engine_settings
  for each row execute function public.touch_updated_at();

insert into public.lens_treatments (code, name, surcharge_clp, status, sort, confirmed_source, confirmed_at) values
  ('blanco', 'Cristal blanco', 0, 'published', 1, 'Pablo (vía Codex)', '2026-10-21'),
  ('antirreflejo', 'Antirreflejo', 10000, 'published', 2, 'Pablo (vía Codex)', '2026-10-21'),
  ('filtro_azul', 'Filtro de luz azul', 20000, 'published', 3, 'Pablo (vía Codex)', '2026-10-21');


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

rollback;
