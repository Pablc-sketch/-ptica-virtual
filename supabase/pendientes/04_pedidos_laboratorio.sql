-- PROPUESTA (no aplicada): borradores de pedido de laboratorio para Fides, SOLO administración.
-- Prepara un flujo verificable; NO envía nada a Fides, NO tiene estados de pago/fabricación y NO autoriza fabricar
-- sin revisión profesional. La RX la transcribe manualmente un admin desde el archivo original; nada se calcula:
-- no se autodiagnostica, no se convierte ADD en graduación de cerca y no se mide con selfie.
--
-- Reglas para VALIDAR (draft -> validated), en la base:
--   * receta con revisión documental completada (prescriptions.status = 'reviewed') y contexto de selección;
--   * referencia de proveedor CONFIRMADA para el marco (product_procurement.confirmed); nunca en products.sku;
--   * por ojo: ESF y CIL; EJE obligatorio si CIL <> 0; DP monocular de ambos ojos;
--   * Monofocal: uso confirmado (lejos/cerca) y SIN ADD (no se convierte);
--   * Bifocal/Multifocal: ADD de ambos ojos, alturas de ambos ojos y medición profesional sobre marco ajustado
--     (fuente, responsable y fecha). Si falta algo, queda bloqueado en borrador.
-- Concurrencia: cada UPDATE debe llevar version = anterior + 1 (la app filtra por la versión vista).
-- Privacidad: si la persona borra su receta, el borrador se borra con ella (ON DELETE CASCADE).
begin;

create table public.lab_orders (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null check (char_length(product_name) between 1 and 120),
  family text not null check (family in ('Monofocal', 'Bifocal', 'Multifocal')),
  requested_use text check (requested_use in ('distance', 'near')),
  treatment text not null check (char_length(treatment) between 1 and 100),
  status text not null default 'draft' check (status in ('draft', 'validated', 'cancelled')),
  version integer not null default 0 check (version >= 0),
  od_sph numeric(5, 2) check (od_sph between -30 and 30 and od_sph * 4 = trunc(od_sph * 4)),
  od_cyl numeric(5, 2) check (od_cyl between -10 and 10 and od_cyl * 4 = trunc(od_cyl * 4)),
  od_axis smallint check (od_axis between 0 and 180),
  od_add numeric(4, 2) check (od_add between 0.5 and 4 and od_add * 4 = trunc(od_add * 4)),
  oi_sph numeric(5, 2) check (oi_sph between -30 and 30 and oi_sph * 4 = trunc(oi_sph * 4)),
  oi_cyl numeric(5, 2) check (oi_cyl between -10 and 10 and oi_cyl * 4 = trunc(oi_cyl * 4)),
  oi_axis smallint check (oi_axis between 0 and 180),
  oi_add numeric(4, 2) check (oi_add between 0.5 and 4 and oi_add * 4 = trunc(oi_add * 4)),
  od_pd numeric(4, 1) check (od_pd between 20 and 40 and od_pd * 2 = trunc(od_pd * 2)),
  oi_pd numeric(4, 1) check (oi_pd between 20 and 40 and oi_pd * 2 = trunc(oi_pd * 2)),
  od_height numeric(4, 1) check (od_height between 8 and 40 and od_height * 2 = trunc(od_height * 2)),
  oi_height numeric(4, 1) check (oi_height between 8 and 40 and oi_height * 2 = trunc(oi_height * 2)),
  measurement_source text check (measurement_source = 'professional_on_fitted_frame'),
  measured_by text check (measured_by is null or char_length(btrim(measured_by)) between 2 and 120),
  measured_at date,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  validated_by uuid references auth.users (id) on delete set null,
  validated_at timestamptz,
  check ((status = 'validated') = (validated_at is not null))
);
-- Un solo pedido activo (no cancelado) por receta.
create unique index lab_orders_one_active on public.lab_orders (prescription_id) where status <> 'cancelled';
create index lab_orders_status_idx on public.lab_orders (status, created_at);

create table public.lab_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.lab_orders (id) on delete cascade,
  from_status text not null,
  to_status text not null,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index lab_order_events_order_idx on public.lab_order_events (order_id, created_at);

-- Completitud para validar. Devuelve el primer motivo de bloqueo o NULL.
create or replace function public.lab_order_blocker(o public.lab_orders)
returns text
language plpgsql
stable
set search_path = ''
as $$
begin
  if not exists (select 1 from public.prescriptions p where p.id = o.prescription_id and p.status = 'reviewed') then
    return 'prescription_not_reviewed';
  end if;
  if o.product_id is null or not exists (
    select 1 from public.product_procurement r where r.product_id = o.product_id and r.confirmed
  ) then
    return 'procurement_not_confirmed';
  end if;
  if o.od_sph is null or o.od_cyl is null or o.oi_sph is null or o.oi_cyl is null then return 'rx_incomplete'; end if;
  if (o.od_cyl <> 0 and o.od_axis is null) or (o.oi_cyl <> 0 and o.oi_axis is null) then return 'axis_required'; end if;
  if o.od_pd is null or o.oi_pd is null then return 'pd_required'; end if;
  if o.family = 'Monofocal' then
    if o.requested_use is null then return 'use_unconfirmed'; end if;
    if o.od_add is not null or o.oi_add is not null then return 'add_not_allowed_for_single_vision'; end if;
  else
    if o.od_add is null or o.oi_add is null then return 'add_required'; end if;
    if o.od_height is null or o.oi_height is null then return 'heights_required'; end if;
    if o.measurement_source is distinct from 'professional_on_fitted_frame' or o.measured_by is null or o.measured_at is null then
      return 'professional_measurement_required';
    end if;
  end if;
  return null;
end;
$$;

create or replace function public.lab_orders_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare rx public.prescriptions; prod public.products;
begin
  select * into rx from public.prescriptions p where p.id = new.prescription_id;
  if not found then raise exception 'prescription_not_found' using errcode = 'P0002'; end if;
  if rx.status <> 'reviewed' then raise exception 'prescription_not_reviewed' using errcode = '22023'; end if;
  if rx.product_id is null or rx.requested_family is null or rx.requested_treatment is null then
    raise exception 'prescription_context_missing' using errcode = '22023';
  end if;
  select * into prod from public.products p where p.id = rx.product_id;
  -- El contexto viene de la receta (lo eligió la persona); el admin no lo inventa.
  new.product_id := rx.product_id;
  new.product_name := coalesce(prod.name, 'Marco no disponible');
  new.family := rx.requested_family;
  new.requested_use := rx.requested_use;
  new.treatment := rx.requested_treatment;
  new.status := 'draft';
  new.version := 0;
  new.validated_by := null;
  new.validated_at := null;
  new.created_by := (select auth.uid());
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;
create trigger lab_orders_before_insert before insert on public.lab_orders
  for each row execute function public.lab_orders_before_insert();

create or replace function public.lab_orders_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  blocker text;
  rx_changed boolean := row(new.od_sph, new.od_cyl, new.od_axis, new.od_add, new.oi_sph, new.oi_cyl, new.oi_axis, new.oi_add,
       new.od_pd, new.oi_pd, new.od_height, new.oi_height, new.measurement_source, new.measured_by, new.measured_at, new.notes)
    is distinct from
    row(old.od_sph, old.od_cyl, old.od_axis, old.od_add, old.oi_sph, old.oi_cyl, old.oi_axis, old.oi_add,
       old.od_pd, old.oi_pd, old.od_height, old.oi_height, old.measurement_source, old.measured_by, old.measured_at, old.notes);
begin
  -- FK ON DELETE SET NULL (marco o usuarios eliminados) no cuenta como edición.
  if new.version = old.version and new.status = old.status and not rx_changed
     and (new.product_id is null or new.product_id = old.product_id) then
    return new;
  end if;
  if new.version <> old.version + 1 then raise exception 'version_conflict' using errcode = '40001'; end if;
  if new.id <> old.id or new.prescription_id <> old.prescription_id or new.product_name <> old.product_name
     or new.family <> old.family or new.requested_use is distinct from old.requested_use or new.treatment <> old.treatment
     or new.created_at <> old.created_at or new.created_by is distinct from old.created_by
     or (new.product_id is distinct from old.product_id and new.product_id is not null) then
    raise exception 'immutable_fields' using errcode = '42501';
  end if;
  if old.status = 'cancelled' then raise exception 'order_cancelled' using errcode = '22023'; end if;

  if new.status = old.status then
    -- Solo se edita la transcripción en borrador; un pedido validado se reabre primero.
    if old.status <> 'draft' then raise exception 'reopen_to_edit' using errcode = '22023'; end if;
  elsif (old.status, new.status) in (('draft', 'validated')) then
    blocker := public.lab_order_blocker(new);
    if blocker is not null then raise exception '%', blocker using errcode = '22023'; end if;
    new.validated_by := (select auth.uid());
    new.validated_at := now();
  elsif (old.status, new.status) in (('validated', 'draft'), ('draft', 'cancelled'), ('validated', 'cancelled')) then
    new.validated_by := null;
    new.validated_at := null;
  else
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  -- Lo que se valida es exactamente lo guardado: un cambio de estado no puede editar la transcripción a la vez.
  if new.status <> old.status and rx_changed then
    raise exception 'save_before_transition' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger lab_orders_before_update before update on public.lab_orders
  for each row execute function public.lab_orders_before_update();

create or replace function public.lab_orders_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> old.status then
    insert into public.lab_order_events (order_id, from_status, to_status, actor_id)
    values (new.id, old.status, new.status, (select auth.uid()));
  end if;
  return null;
end;
$$;
create trigger lab_orders_after_update after update on public.lab_orders
  for each row execute function public.lab_orders_after_update();

-- Solo administración. Clientes: sin filas (RLS) y sin DELETE (se cancela, no se borra).
alter table public.lab_orders enable row level security;
alter table public.lab_order_events enable row level security;
revoke all on public.lab_orders, public.lab_order_events from public, anon, authenticated;
grant select, insert, update on public.lab_orders to authenticated;
grant select on public.lab_order_events to authenticated;
create policy "pedidos solo admin (lectura)" on public.lab_orders for select to authenticated using ((select public.is_admin()));
create policy "pedidos solo admin (crear)" on public.lab_orders for insert to authenticated with check ((select public.is_admin()));
create policy "pedidos solo admin (editar)" on public.lab_orders for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "eventos de pedidos solo admin" on public.lab_order_events for select to authenticated using ((select public.is_admin()));
-- El trigger corre como el admin (authenticated): necesita ejecutar el verificador; sus lecturas siguen bajo RLS.
revoke all on function public.lab_order_blocker(public.lab_orders) from public, anon;
grant execute on function public.lab_order_blocker(public.lab_orders) to authenticated;
revoke all on function public.lab_orders_after_update() from public, anon, authenticated;

commit;
