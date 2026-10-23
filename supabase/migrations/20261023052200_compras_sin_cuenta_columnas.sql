-- Compras sin cuenta: datos de quien compra, cristal elegido (ópticos) y token de acceso al estado de la compra.
alter table public.store_orders
  alter column user_id drop not null,
  add column lens_option text check (lens_option is null or lens_option in ('basico','antirreflejo','filtro-azul')),
  add column needs_prescription boolean not null default false,
  add column buyer_name text not null default '' check (char_length(buyer_name) <= 120),
  add column buyer_email text not null default '' check (char_length(buyer_email) <= 254),
  add column buyer_phone text not null default '' check (char_length(buyer_phone) <= 30),
  add column access_token text not null default encode(extensions.gen_random_bytes(18), 'hex');
create index store_orders_email_idx on public.store_orders (lower(buyer_email), created_at desc);
