-- PROPUESTA (no aplicada): catálogo mínimo de paquetes de cristales con precios "DESDE, por par" confirmados por Pablo
-- (21/10/2026, vía Codex). No cambia products.price_clp (sigue siendo SOLO el marco), no abre cotizaciones ni pagos,
-- no valida graduaciones (límites no confirmados) y no incluye fotocromático (sin precio confirmado).
--
-- Modelo: paquetes EXCLUYENTES (se elige uno). "Filtro azul" = base + $20.000 = $48.000; no es antirreflejo + $10.000,
-- así que no existe combinación antirreflejo+filtro azul con precio: no se ofrece.
-- Uso: solo monofocal para LEJOS o CERCA. Progresivos/bifocales no se ofrecen hasta tener precio y criterio.
begin;

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

commit;
