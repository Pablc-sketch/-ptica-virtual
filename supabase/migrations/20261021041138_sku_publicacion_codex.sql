-- Product identity belongs to this storefront; no writes to Lentia.
begin;
alter table public.products add column sku text;
alter table public.products add constraint products_sku_length
  check (sku is null or char_length(btrim(sku)) between 1 and 80);
create unique index products_sku_unique_idx on public.products(lower(btrim(sku))) where sku is not null;
create or replace function public.enforce_publishable()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status = 'published' then
    if tg_op = 'INSERT' then raise exception 'Un producto nuevo debe crearse como borrador'; end if;
    if new.price_clp <= 0 then raise exception 'No se puede publicar sin precio'; end if;
    if btrim(new.name) = '' then raise exception 'No se puede publicar sin nombre'; end if;
    if new.sku is null or btrim(new.sku) = '' then raise exception 'No se puede publicar sin código/SKU real'; end if;
    if not exists (select 1 from public.product_images i where i.product_id = new.id and i.verified) then
      raise exception 'No se puede publicar sin una foto real verificada';
    end if;
  end if;
  return new;
end; $$;
commit;



