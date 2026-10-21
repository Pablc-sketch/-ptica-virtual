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
begin;

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

commit;
