-- Solo tienda independiente. Muestras retocadas sin stock ni fabricación confirmados.
alter table public.products alter column price_clp drop not null;
alter table public.products add column pair_base_price_clp integer check (pair_base_price_clp > 0);
alter table public.products add column is_sample boolean not null default false;
alter table public.product_images add column kind text not null default 'photo' check (kind in ('photo','retouched'));
alter table public.product_images add constraint retouched_not_real_verified check (kind <> 'retouched' or not verified);

create table public.product_procurement (
  product_id uuid primary key references public.products(id) on delete cascade,
  supplier_name text check (char_length(supplier_name) <= 120),
  supplier_code text not null check (char_length(btrim(supplier_code)) between 1 and 80),
  color_code text check (char_length(color_code) <= 80),
  confirmed boolean not null default false,
  notes text check (char_length(notes) <= 1000),
  updated_at timestamptz not null default now()
);
alter table public.product_procurement enable row level security;
revoke all on public.product_procurement from public, anon, authenticated;
grant select, insert, update, delete on public.product_procurement to authenticated;
create policy "abastecimiento solo administracion" on public.product_procurement
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create trigger procurement_touch before update on public.product_procurement
  for each row execute function public.touch_updated_at();

create or replace function public.enforce_publishable()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' then
    if tg_op = 'INSERT' then raise exception 'Un producto nuevo debe crearse como borrador'; end if;
    if btrim(new.name) = '' then raise exception 'No se puede publicar sin nombre'; end if;
    if new.sku is null or btrim(new.sku) = '' then raise exception 'Falta identificador de tienda'; end if;
    if new.is_sample then
      if not exists(select 1 from public.product_images i where i.product_id=new.id and i.kind='retouched') then
        raise exception 'La muestra necesita una imagen identificada como retocada';
      end if;
    else
      -- No se confunde un paquete con el precio de solo marco. Las muestras no habilitan venta.
      if new.price_clp is null or new.price_clp <= 0 then raise exception 'No se puede publicar sin precio del marco'; end if;
      if not exists(select 1 from public.product_images i where i.product_id=new.id and i.kind='photo' and i.verified) then
        raise exception 'No se puede publicar sin una foto real verificada';
      end if;
    end if;
  end if;
  return new;
end; $$;

-- Mantiene todos los límites y validaciones de create_quote; excluye muestras incluso si se habilitara el RPC.
do $$ declare d text; needle text := 'where p.id = v_row.product_id and p.status = ''published'';';
begin
  d := pg_get_functiondef('public.create_quote(text,text,text,text,jsonb)'::regprocedure);
  if position(needle in d)=0 then raise exception 'Contrato create_quote distinto: revisar antes de aplicar'; end if;
  execute replace(d, needle, 'where p.id = v_row.product_id and p.status = ''published'' and not p.is_sample and p.price_clp > 0;');
end; $$;
-- Se preserva el cierre de recepción: esta entrega no habilita pagos ni cotizaciones.
revoke execute on function public.create_quote(text,text,text,text,jsonb) from public, anon, authenticated;
