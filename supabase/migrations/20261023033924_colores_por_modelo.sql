-- Colores por modelo: cada producto (modelo) tiene variantes de color. La foto de FRENTE (fondo blanco) es por color;
-- las fotos de CONTEXTO son del modelo. El código del proveedor por color es privado (solo administración).
-- Cambio aditivo: no modifica ni borra datos existentes. Aplicada el 23/10/2026 (versión 20261023033924).

alter table public.products
  add column use text not null default 'optical' check (use in ('optical', 'solar'));

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  color_name text not null check (char_length(btrim(color_name)) between 1 and 60),
  color_hex text not null check (color_hex ~ '^#[0-9a-fA-F]{6}$'),
  color_hex_2 text check (color_hex_2 is null or color_hex_2 ~ '^#[0-9a-fA-F]{6}$'),
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  unique (product_id, color_name)
);
create index product_variants_product_idx on public.product_variants (product_id, position);
alter table public.product_variants enable row level security;
revoke all on public.product_variants from anon, authenticated;
grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;
create policy "colores publicados visibles" on public.product_variants for select to anon, authenticated
  using (public.is_admin() or (status = 'published' and exists (
    select 1 from public.products p where p.id = product_id and p.status = 'published')));
create policy "admin gestiona colores" on public.product_variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table public.product_variant_procurement (
  variant_id uuid primary key references public.product_variants (id) on delete cascade,
  supplier_code text not null check (char_length(btrim(supplier_code)) between 1 and 80),
  color_code text check (color_code is null or char_length(color_code) <= 80),
  confirmed boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 1000),
  updated_at timestamptz not null default now()
);
alter table public.product_variant_procurement enable row level security;
revoke all on public.product_variant_procurement from public, anon, authenticated;
grant select, insert, update, delete on public.product_variant_procurement to authenticated;
create policy "codigo proveedor por color solo administracion" on public.product_variant_procurement
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create trigger variant_procurement_touch before update on public.product_variant_procurement
  for each row execute function public.touch_updated_at();

alter table public.product_images
  add column variant_id uuid references public.product_variants (id) on delete cascade,
  add column view text not null default 'front' check (view in ('front', 'context'));
create index product_images_variant_idx on public.product_images (variant_id) where variant_id is not null;

-- La variante de una imagen debe pertenecer al mismo modelo.
create or replace function public.product_images_variant_matches()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.variant_id is not null and not exists (
    select 1 from public.product_variants v where v.id = new.variant_id and v.product_id = new.product_id
  ) then
    raise exception 'variant_product_mismatch' using errcode = '22023';
  end if;
  return new;
end; $$;
create trigger product_images_variant_check before insert or update on public.product_images
  for each row execute function public.product_images_variant_matches();
