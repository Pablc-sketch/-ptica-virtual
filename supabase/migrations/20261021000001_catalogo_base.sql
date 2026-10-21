-- Óptica virtual: esquema base (catálogo, 3D verificado, cotizaciones, roles).
-- Proyecto Supabase propio e independiente de Lentia. No contiene pacientes ni ventas.

create extension if not exists pgcrypto;

-- ---------- Roles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'customer');
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create policy "perfil propio o admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
-- Nadie sube su propio rol: solo se edita desde el servidor con service role.

-- ---------- Catálogo ----------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);
alter table public.brands enable row level security;
create policy "marcas visibles" on public.brands for select to anon, authenticated using (true);
create policy "admin gestiona marcas" on public.brands for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand_id uuid references public.brands (id) on delete set null,
  description text,
  price_clp integer not null check (price_clp >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  frame_shape text,
  material text,
  color text,
  gender text,
  lens_width_mm numeric(4, 1),
  bridge_mm numeric(4, 1),
  temple_mm numeric(4, 1),
  source text not null default 'manual',      -- 'manual' | 'lentia_import'
  source_ref text,                             -- id/código en el sistema de origen
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_status_idx on public.products (status);
create index products_brand_idx on public.products (brand_id);
create unique index products_source_ref_idx on public.products (source, source_ref) where source_ref is not null;
alter table public.products enable row level security;
create policy "productos publicados visibles" on public.products for select to anon, authenticated
  using (status = 'published' or public.is_admin());
create policy "admin gestiona productos" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- Fotos reales de producto (archivo en Storage, bucket product-images).
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path text not null,
  alt text,
  position integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, position);
create unique index product_images_one_primary on public.product_images (product_id) where is_primary;
alter table public.product_images enable row level security;
create policy "fotos de productos publicados" on public.product_images for select to anon, authenticated
  using (public.is_admin() or exists (
    select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "admin gestiona fotos" on public.product_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Modelos 3D: solo se muestran los GLB marcados como verificados por un admin.
create table public.product_models (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products (id) on delete cascade,
  glb_path text not null check (glb_path ~* '\.glb$'),
  size_bytes bigint,
  verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  check (not verified or verified_at is not null)
);
alter table public.product_models enable row level security;
create policy "modelos 3d verificados" on public.product_models for select to anon, authenticated
  using (public.is_admin() or (verified and exists (
    select 1 from public.products p where p.id = product_id and p.status = 'published')));
create policy "admin gestiona modelos" on public.product_models for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Cotizaciones ----------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed', 'cancelled')),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or char_length(phone) between 6 and 30),
  notes text check (notes is null or char_length(notes) <= 2000),
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);
alter table public.quotes enable row level security;
create policy "cliente ve sus cotizaciones" on public.quotes for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "admin gestiona cotizaciones" on public.quotes for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin borra cotizaciones" on public.quotes for delete to authenticated
  using (public.is_admin());
-- Sin policy de insert: las cotizaciones se crean solo con create_quote().

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity between 1 and 10),
  unit_price_clp integer not null check (unit_price_clp >= 0)
);
create index quote_items_quote_idx on public.quote_items (quote_id);
alter table public.quote_items enable row level security;
create policy "items de mis cotizaciones" on public.quote_items for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.quotes q where q.id = quote_id and q.user_id = (select auth.uid())));

-- Crea una cotización validando productos publicados y fijando el precio vigente.
create or replace function public.create_quote(
  p_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote uuid;
  v_item jsonb;
  v_prod public.products;
  v_qty integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 10 then
    raise exception 'La cotización debe tener entre 1 y 10 productos';
  end if;

  insert into public.quotes (customer_name, email, phone, notes, user_id)
  values (trim(p_name), nullif(trim(p_email), ''), nullif(trim(p_phone), ''),
          nullif(trim(p_notes), ''), (select auth.uid()))
  returning id into v_quote;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item ->> 'quantity')::integer, 1);
    select * into v_prod from public.products
      where id = (v_item ->> 'product_id')::uuid and status = 'published';
    if not found then
      raise exception 'Producto no disponible';
    end if;
    insert into public.quote_items (quote_id, product_id, product_name, quantity, unit_price_clp)
    values (v_quote, v_prod.id, v_prod.name, v_qty, v_prod.price_clp);
  end loop;

  return v_quote;
end;
$$;
revoke all on function public.create_quote(text, text, text, text, jsonb) from public;
grant execute on function public.create_quote(text, text, text, text, jsonb) to anon, authenticated;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('product-models', 'product-models', true, 31457280, array['model/gltf-binary', 'application/octet-stream'])
on conflict (id) do nothing;

create policy "admin sube fotos y modelos" on storage.objects for insert to authenticated
  with check (bucket_id in ('product-images', 'product-models') and public.is_admin());
create policy "admin actualiza fotos y modelos" on storage.objects for update to authenticated
  using (bucket_id in ('product-images', 'product-models') and public.is_admin());
create policy "admin borra fotos y modelos" on storage.objects for delete to authenticated
  using (bucket_id in ('product-images', 'product-models') and public.is_admin());
