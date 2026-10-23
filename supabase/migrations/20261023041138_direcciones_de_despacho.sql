-- Direcciones de despacho de cada cliente (para enviar los lentes). Solo la dueña o el dueño las ve y las edita;
-- administración puede leerlas para despachar. Tope de 5 por persona. Aplicada el 23/10/2026 (direcciones_de_despacho).
create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipient text not null check (char_length(btrim(recipient)) between 2 and 120),
  phone text not null check (char_length(btrim(phone)) between 6 and 30),
  region text not null check (char_length(btrim(region)) between 2 and 60),
  comuna text not null check (char_length(btrim(comuna)) between 2 and 60),
  street text not null check (char_length(btrim(street)) between 2 and 120),
  street_number text not null check (char_length(btrim(street_number)) between 1 and 20),
  unit text check (unit is null or char_length(unit) <= 40),
  notes text check (notes is null or char_length(notes) <= 300),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index customer_addresses_user_idx on public.customer_addresses (user_id, created_at desc);
alter table public.customer_addresses enable row level security;
revoke all on public.customer_addresses from public, anon, authenticated;
grant select, insert, update, delete on public.customer_addresses to authenticated;
create policy "cada persona ve sus direcciones" on public.customer_addresses for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "cada persona agrega sus direcciones" on public.customer_addresses for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "cada persona edita sus direcciones" on public.customer_addresses for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "cada persona borra sus direcciones" on public.customer_addresses for delete to authenticated
  using (user_id = (select auth.uid()));
-- Tope de 5 direcciones por persona.
create or replace function public.customer_addresses_limit() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.customer_addresses a where a.user_id = new.user_id) >= 5 then
    raise exception 'address_limit' using errcode = '22023';
  end if;
  return new;
end; $$;
create trigger customer_addresses_limit before insert on public.customer_addresses
  for each row execute function public.customer_addresses_limit();
