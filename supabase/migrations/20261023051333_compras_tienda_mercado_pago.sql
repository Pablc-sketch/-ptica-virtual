-- Compras directas (lentes de sol) pagadas con Mercado Pago. El precio lo pone la base, nunca el cliente.
-- Aplicada el 23/10/2026 (compras_tienda_mercado_pago). El secreto de pagos se genera en la base y NO se versiona.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.app_settings (key text primary key, value text not null);
revoke all on private.app_settings from public, anon, authenticated;

create table public.store_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  product_id uuid not null references public.products (id),
  variant_id uuid references public.product_variants (id),
  quantity integer not null default 1 check (quantity between 1 and 5),
  unit_price_clp integer not null check (unit_price_clp > 0),
  total_clp integer not null check (total_clp > 0),
  product_name text not null,
  color_name text,
  ship_to jsonb not null,
  status text not null default 'pending_payment' check (status in ('pending_payment','paid','rejected','cancelled','ordered','shipped','delivered')),
  mp_preference_id text,
  mp_payment_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index store_orders_user_idx on public.store_orders (user_id, created_at desc);
alter table public.store_orders enable row level security;
revoke all on public.store_orders from public, anon, authenticated;
grant select on public.store_orders to authenticated;
grant update (status) on public.store_orders to authenticated;
create policy "cada persona ve sus compras" on public.store_orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "administracion actualiza estado" on public.store_orders for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create trigger store_orders_touch before update on public.store_orders for each row execute function public.touch_updated_at();

-- Crea la compra con precio y dirección leídos de la base.
create or replace function public.create_store_order(p_product uuid, p_variant uuid, p_address uuid, p_quantity integer default 1)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p record; v record; a record; oid uuid;
begin
  if uid is null then raise exception 'login_required' using errcode = '28000'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 5 then raise exception 'invalid_quantity' using errcode = '22023'; end if;
  select id, name, use, status, pair_base_price_clp into p from public.products where id = p_product;
  if not found or p.status <> 'published' or p.use <> 'solar' or coalesce(p.pair_base_price_clp,0) <= 0 then
    raise exception 'product_not_available' using errcode = '22023'; end if;
  if p_variant is not null then
    select id, color_name into v from public.product_variants where id = p_variant and product_id = p_product and status = 'published';
    if not found then raise exception 'variant_not_available' using errcode = '22023'; end if;
  end if;
  select recipient, phone, region, comuna, street, street_number, unit, notes into a
    from public.customer_addresses where id = p_address and user_id = uid;
  if not found then raise exception 'address_required' using errcode = '22023'; end if;
  if (select count(*) from public.store_orders o where o.user_id = uid and o.status = 'pending_payment' and o.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too_many_pending' using errcode = '22023'; end if;
  insert into public.store_orders (user_id, product_id, variant_id, quantity, unit_price_clp, total_clp, product_name, color_name, ship_to)
  values (uid, p.id, v.id, p_quantity, p.pair_base_price_clp, p.pair_base_price_clp * p_quantity, p.name, v.color_name, to_jsonb(a))
  returning id into oid;
  return oid;
end; $$;
revoke all on function public.create_store_order(uuid, uuid, uuid, integer) from public, anon;
grant execute on function public.create_store_order(uuid, uuid, uuid, integer) to authenticated;

-- El servidor guarda la preferencia creada en Mercado Pago (solo para compras propias pendientes).
create or replace function public.set_store_order_preference(p_order uuid, p_preference text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.store_orders set mp_preference_id = p_preference
   where id = p_order and user_id = auth.uid() and status = 'pending_payment';
end; $$;
revoke all on function public.set_store_order_preference(uuid, text) from public, anon;
grant execute on function public.set_store_order_preference(uuid, text) to authenticated;

-- Confirmación de pago: solo el servidor (conoce el secreto) y tras consultar el pago en la API de Mercado Pago.
create or replace function public.confirm_store_order_payment(p_secret text, p_order uuid, p_payment text, p_status text, p_amount integer)
returns text language plpgsql security definer set search_path = '' as $$
declare s text; o record;
begin
  select value into s from private.app_settings where key = 'payments_secret';
  if s is null or p_secret is null or p_secret <> s then raise exception 'forbidden' using errcode = '42501'; end if;
  select id, total_clp, status into o from public.store_orders where id = p_order for update;
  if not found then return 'not_found'; end if;
  if o.status not in ('pending_payment', 'rejected') then return o.status; end if;
  if p_status = 'approved' then
    if p_amount is distinct from o.total_clp then raise exception 'amount_mismatch' using errcode = '22023'; end if;
    update public.store_orders set status = 'paid', mp_payment_id = p_payment, paid_at = now() where id = p_order;
    return 'paid';
  elsif p_status in ('rejected', 'cancelled') then
    update public.store_orders set status = 'rejected', mp_payment_id = p_payment where id = p_order;
    return 'rejected';
  end if;
  return o.status;
end; $$;
revoke all on function public.confirm_store_order_payment(text, uuid, text, text, integer) from public;
grant execute on function public.confirm_store_order_payment(text, uuid, text, text, integer) to anon, authenticated;

insert into private.app_settings (key, value) values ('payments_secret', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;
