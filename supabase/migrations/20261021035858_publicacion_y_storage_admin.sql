alter table public.product_images
  add column verified boolean not null default false,
  add column verified_at timestamptz,
  add check (not verified or verified_at is not null);

create or replace function public.enforce_publishable()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status = 'published' then
    if tg_op = 'INSERT' then raise exception 'Un producto nuevo debe crearse como borrador'; end if;
    if new.price_clp <= 0 then raise exception 'No se puede publicar sin precio'; end if;
    if btrim(new.name) = '' then raise exception 'No se puede publicar sin nombre'; end if;
    if not exists (select 1 from public.product_images i where i.product_id = new.id and i.verified) then
      raise exception 'No se puede publicar sin una foto real verificada';
    end if;
  end if;
  return new;
end; $$;
create trigger products_enforce_publishable before insert or update on public.products
  for each row execute function public.enforce_publishable();

create or replace function public.guard_published_images()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if old.verified
     and (tg_op = 'DELETE' or not new.verified or new.product_id <> old.product_id)
     and exists (select 1 from public.products p where p.id = old.product_id and p.status = 'published')
     and not exists (select 1 from public.product_images i where i.product_id = old.product_id and i.verified and i.id <> old.id) then
    raise exception 'El producto publicado necesita al menos una foto real verificada';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end; $$;
create trigger product_images_guard before update or delete on public.product_images
  for each row execute function public.guard_published_images();

