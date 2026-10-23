-- Pending review: guest-checkout shipping, charged by the database, not the browser.
-- Existing paid/pending orders retain their original amounts.
begin;
alter table public.store_orders add column subtotal_clp integer generated always as (unit_price_clp * quantity) stored;
alter table public.store_orders add column shipping_clp integer not null default 0 check (shipping_clp in (0,3500));
alter table public.store_orders add constraint store_orders_total_with_shipping check (total_clp = subtotal_clp + shipping_clp);
create or replace function private.set_store_order_shipping()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.shipping_clp := case when new.unit_price_clp * new.quantity >= 60000 then 0 else 3500 end;
  new.total_clp := new.unit_price_clp * new.quantity + new.shipping_clp;
  return new;
end;
$$;
revoke all on function private.set_store_order_shipping() from public,anon,authenticated;
create trigger store_orders_shipping before insert on public.store_orders for each row execute function private.set_store_order_shipping();
-- Preserve the existing token authorization and append the captured breakdown.
drop function public.get_store_order(uuid,text);
create function public.get_store_order(p_order uuid,p_token text)
returns table(status text,product_name text,color_name text,lens_option text,total_clp integer,needs_prescription boolean,created_at timestamptz,subtotal_clp integer,shipping_clp integer)
language sql stable security definer set search_path = '' as $$
 select s.status,s.product_name,s.color_name,s.lens_option,s.total_clp,s.needs_prescription,s.created_at,s.subtotal_clp,s.shipping_clp
 from public.store_orders s where s.id=p_order and s.access_token=p_token;
$$;
revoke all on function public.get_store_order(uuid,text) from public;
grant execute on function public.get_store_order(uuid,text) to anon,authenticated;
-- Customer-facing names; URLs and product/variant identifiers stay the same.
update public.products p set name=n.name from (values
 ('optico-perla','Montmartre'),('sol-leone','Bellagio'),('sol-pantera','Tribeca'),('sol-azzurra','Capri'),
 ('ovalo-negro','Soho'),('cat-eye-ambar','Riviera'),('cat-eye-mosaico','Brera')
) as n(slug,name) where p.slug=n.slug;
commit;
