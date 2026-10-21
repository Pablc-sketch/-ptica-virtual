-- Revisión DOCUMENTAL de recetas. "Revisada" significa que el equipo revisó que el documento es legible y completo para
-- cotizar: NO es una aprobación médica ni activa pagos o compras.
--
-- Estados: pending -> in_review -> (needs_new_file | reviewed); in_review -> pending (liberar).
-- * El cliente nunca cambia el estado: no hay UPDATE para authenticated; el único camino es review_prescription(),
--   SECURITY DEFINER, que exige is_admin(), valida la transición y usa concurrencia optimista (version).
-- * Un trigger de INSERT fuerza los campos de revisión a su valor inicial (aunque el cliente los envíe).
-- * Un trigger de UPDATE impide tocar campos inmutables y exige version+1 en cada cambio de revisión (defensa en profundidad).
-- * needs_new_file exige un motivo visible para la persona (5-300 caracteres). La persona sube un archivo NUEVO que
--   referencia al anterior (replaces_id); el anterior queda como registro histórico de esa fila.
-- * Historial (prescription_events) solo para admins, acotado a 50 eventos por receta; se borra con la receta.
-- No toca storage.objects.

begin;

alter table public.prescriptions
  add column status text not null default 'pending'
    check (status in ('pending', 'in_review', 'needs_new_file', 'reviewed')),
  add column version integer not null default 0 check (version >= 0),
  add column status_changed_at timestamptz not null default now(),
  add column reviewer_id uuid references auth.users (id) on delete set null,
  add column client_message text check (client_message is null or char_length(client_message) between 5 and 300),
  add column replaces_id uuid references public.prescriptions (id) on delete set null,
  add constraint prescriptions_message_iff_needs_new_file check ((status = 'needs_new_file') = (client_message is not null)),
  add constraint prescriptions_not_self_replacing check (replaces_id is null or replaces_id <> id);

-- Un archivo con problema se reemplaza una sola vez.
create unique index prescriptions_replaces_once on public.prescriptions (replaces_id) where replaces_id is not null;
create index prescriptions_status_idx on public.prescriptions (status, created_at);

-- El cliente no puede actualizar filas (antes UPDATE venía de los privilegios por defecto; sin policy RLS ya lo bloqueaba).
revoke update, truncate, references, trigger on public.prescriptions from authenticated;

create or replace function public.prescriptions_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := 'pending';
  new.version := 0;
  new.status_changed_at := now();
  new.reviewer_id := null;
  new.client_message := null;
  if new.replaces_id is not null then
    -- Solo se reemplaza una receta PROPIA marcada como "requiere nuevo archivo". Se consulta como el usuario
    -- (security invoker), así que RLS ya limita a sus filas.
    if not exists (
      select 1 from public.prescriptions p
      where p.id = new.replaces_id and p.user_id = new.user_id and p.status = 'needs_new_file'
    ) then
      raise exception 'replacement_not_allowed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger prescriptions_before_insert before insert on public.prescriptions
  for each row execute function public.prescriptions_before_insert();

create or replace function public.prescriptions_valid_transition(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_from, p_to) in (
    ('pending', 'in_review'),
    ('in_review', 'pending'),
    ('in_review', 'needs_new_file'),
    ('in_review', 'reviewed')
  );
$$;

create or replace function public.prescriptions_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  review_changed boolean := new.status is distinct from old.status
    or new.version is distinct from old.version
    or new.client_message is distinct from old.client_message
    or new.status_changed_at is distinct from old.status_changed_at;
begin
  if new.id <> old.id or new.user_id <> old.user_id or new.path <> old.path
     or new.consent_at <> old.consent_at or new.consent_version <> old.consent_version
     or new.created_at <> old.created_at then
    raise exception 'immutable_fields' using errcode = '42501';
  end if;
  -- Las FK con ON DELETE SET NULL (cotización, receta reemplazada, revisor eliminado) solo pueden pasar a NULL.
  if (new.quote_id is distinct from old.quote_id and new.quote_id is not null)
     or (new.replaces_id is distinct from old.replaces_id and new.replaces_id is not null) then
    raise exception 'immutable_fields' using errcode = '42501';
  end if;
  if review_changed then
    if new.version <> old.version + 1 then
      raise exception 'version_must_increment' using errcode = '40001';
    end if;
    if not public.prescriptions_valid_transition(old.status, new.status) then
      raise exception 'invalid_transition' using errcode = '22023';
    end if;
  elsif new.reviewer_id is distinct from old.reviewer_id and new.reviewer_id is not null then
    raise exception 'immutable_fields' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger prescriptions_before_update before update on public.prescriptions
  for each row execute function public.prescriptions_before_update();

create table public.prescription_events (
  id bigint generated always as identity primary key,
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  from_status text not null,
  to_status text not null,
  actor_id uuid references auth.users (id) on delete set null,
  message text check (message is null or char_length(message) <= 300),
  created_at timestamptz not null default now()
);
create index prescription_events_rx_idx on public.prescription_events (prescription_id, created_at);
alter table public.prescription_events enable row level security;
revoke all on public.prescription_events from anon, authenticated;
grant select on public.prescription_events to authenticated;
create policy "historial de recetas solo admin" on public.prescription_events
  for select to authenticated using (public.is_admin());

create or replace function public.review_prescription(
  p_id uuid,
  p_expected_version integer,
  p_to text,
  p_message text default null
)
returns table (status text, version integer, status_changed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.prescriptions;
  v_msg text := nullif(btrim(coalesce(p_message, '')), '');
  v_now timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  select * into v_old from public.prescriptions p where p.id = p_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_old.version <> p_expected_version then
    raise exception 'version_conflict' using errcode = '40001';
  end if;
  if not public.prescriptions_valid_transition(v_old.status, p_to) then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  if p_to = 'needs_new_file' then
    if v_msg is null or char_length(v_msg) not between 5 and 300 then
      raise exception 'reason_required' using errcode = '22023';
    end if;
  else
    v_msg := null;
  end if;
  if (select count(*) from public.prescription_events e where e.prescription_id = p_id) >= 50 then
    raise exception 'history_limit' using errcode = '54000';
  end if;

  update public.prescriptions p
    set status = p_to,
        version = v_old.version + 1,
        status_changed_at = v_now,
        reviewer_id = case when p_to = 'pending' then null else (select auth.uid()) end,
        client_message = v_msg
  where p.id = p_id;

  insert into public.prescription_events (prescription_id, from_status, to_status, actor_id, message)
  values (p_id, v_old.status, p_to, (select auth.uid()), v_msg);

  return query select p_to, v_old.version + 1, v_now;
end;
$$;
revoke all on function public.review_prescription(uuid, integer, text, text) from public, anon;
grant execute on function public.review_prescription(uuid, integer, text, text) to authenticated;
revoke all on function public.prescriptions_valid_transition(text, text) from public, anon;

commit;
