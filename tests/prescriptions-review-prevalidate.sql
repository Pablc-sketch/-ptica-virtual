-- PREVALIDACIÓN: aplica la migración pendiente 01 y ejecuta sus pruebas en UNA transacción que termina en ROLLBACK.
-- Generado a partir de supabase/pendientes/01_revision_documental_recetas.sql + tests/prescriptions-review-rls.sql.
-- Esperado: error "REVIEW_OK" (y nada persiste). Enviar como un único script.
begin;
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


-- Pruebas de la revisión documental de recetas (supabase/pendientes/01_revision_documental_recetas.sql).
-- Fixtures sintéticos; termina SIEMPRE en excepción -> rollback. Resultado: "REVIEW_OK" o "REVIEW_FALLOS: ...".
-- Inserta filas sintéticas en storage.objects SOLO dentro de esta transacción (requisito de la policy de INSERT);
-- no crea ni borra archivos reales.
do $$
declare
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); adm uuid := gen_random_uuid();
  p1 text; p1b text; p1c text; p1d text; p2 text; p2b text; rx1 uuid; rx1b uuid; rx2 uuid; n integer; r record; s text; fails text[] := '{}';
begin
  insert into auth.users (id, email) values (u1, 'rv1@test.invalid'), (u2, 'rv2@test.invalid'), (adm, 'rvadm@test.invalid');
  update public.profiles set role = 'admin' where id = adm;
  p1 := u1::text || '/rv1.png'; p1b := u1::text || '/rv1b.png'; p1c := u1::text || '/rv1c.png'; p1d := u1::text || '/rv1d.png';
  p2 := u2::text || '/rv2.png'; p2b := u2::text || '/rv2b.png';
  insert into storage.objects (bucket_id, name, owner) values ('prescriptions', p1, u1), ('prescriptions', p1b, u1), ('prescriptions', p1c, u1), ('prescriptions', p1d, u1),
    ('prescriptions', p2, u2), ('prescriptions', p2b, u2);

  -- 1. El cliente no puede fijar campos de revisión al insertar
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.prescriptions (user_id, path, consent_version, status, version, client_message, reviewer_id)
    values (u1, p1, 'test', 'reviewed', 9, 'aprobada por mí', u1) returning id into rx1;
  select status, version, client_message, reviewer_id into r from public.prescriptions where id = rx1;
  if r.status <> 'pending' or r.version <> 0 or r.client_message is not null or r.reviewer_id is not null then
    fails := fails || 'el cliente fijó campos de revisión al insertar';
  end if;
  -- 2. El cliente no puede actualizar su fila
  begin update public.prescriptions set status = 'reviewed' where id = rx1; fails := fails || 'cliente actualizó estado'; exception when others then null; end;
  -- 3. El cliente no puede usar la función de revisión
  begin perform public.review_prescription(rx1, 0, 'in_review', null); fails := fails || 'cliente ejecutó review_prescription'; exception when others then null; end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.prescriptions (user_id, path, consent_version) values (u2, p2, 'test') returning id into rx2;
  reset role;

  -- 4. anon no puede ejecutar la función
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin perform public.review_prescription(rx1, 0, 'in_review', null); fails := fails || 'anon ejecutó review_prescription'; exception when others then null; end;
  reset role;

  -- ---- admin ----
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.review_prescription(rx1, 0, 'reviewed', null); fails := fails || 'pending->reviewed directo permitido'; exception when others then null; end;
  perform public.review_prescription(rx1, 0, 'in_review', null);
  select status, version, reviewer_id into r from public.prescriptions where id = rx1;
  if r.status <> 'in_review' or r.version <> 1 or r.reviewer_id <> adm then fails := fails || 'pending->in_review no registró versión/revisor'; end if;
  -- 5. Concurrencia: versión obsoleta
  begin perform public.review_prescription(rx1, 0, 'pending', null); fails := fails || 'versión obsoleta aceptada'; exception when others then null; end;
  -- 6. needs_new_file exige motivo
  begin perform public.review_prescription(rx1, 1, 'needs_new_file', '  '); fails := fails || 'needs_new_file sin motivo'; exception when others then null; end;
  perform public.review_prescription(rx1, 1, 'needs_new_file', 'La foto está borrosa: falta el eje del ojo derecho.');
  -- 7. Estado terminal
  begin perform public.review_prescription(rx1, 2, 'in_review', null); fails := fails || 'needs_new_file no es terminal'; exception when others then null; end;
  select count(*) into n from public.prescription_events where prescription_id = rx1;
  if n <> 2 then fails := fails || format('admin ve %s eventos (esperado 2)', n); end if;
  reset role;

  -- 8. La persona ve estado y motivo, pero no el historial; otra persona no ve nada
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select status, client_message into r from public.prescriptions where id = rx1;
  if r.status <> 'needs_new_file' or r.client_message is null then fails := fails || 'la persona no ve estado/motivo'; end if;
  select count(*) into n from public.prescription_events;
  if n <> 0 then fails := fails || 'la persona ve el historial'; end if;
  -- 9. Reemplazo: propio y solo una vez
  insert into public.prescriptions (user_id, path, consent_version, replaces_id) values (u1, p1b, 'test', rx1) returning id into rx1b;
  begin insert into public.prescriptions (user_id, path, consent_version, replaces_id) values (u1, p1c, 'test', rx1); fails := fails || 'se reemplazó dos veces'; exception when others then null; end;
  begin insert into public.prescriptions (user_id, path, consent_version, replaces_id) values (u1, p1d, 'test', rx1b); fails := fails || 'se reemplazó una receta pendiente'; exception when others then null; end;
  insert into public.prescriptions (user_id, path, consent_version) values (u1, p1c, 'test');
  delete from public.prescriptions where path = p1c;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.prescriptions where user_id = u1;
  if n <> 0 then fails := fails || 'u2 ve recetas de u1'; end if;
  begin insert into public.prescriptions (user_id, path, consent_version, replaces_id) values (u2, p2b, 'test', rx1); fails := fails || 'u2 reemplazó receta ajena'; exception when others then null; end;
  reset role;

  -- 10. Defensa en profundidad: aun con privilegios de owner, el trigger exige versión+1 e inmutables
  begin update public.prescriptions set status = 'in_review', version = 7 where id = rx1b; fails := fails || 'update sin version+1 aceptado'; exception when others then null; end;
  begin update public.prescriptions set path = u1::text || '/otro.png' where id = rx1b; fails := fails || 'path mutable'; exception when others then null; end;

  -- 11. reviewed limpia el motivo
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.review_prescription(rx1b, 0, 'in_review', null);
  perform public.review_prescription(rx1b, 1, 'reviewed', 'ignorado');
  select status, client_message into r from public.prescriptions where id = rx1b;
  if r.status <> 'reviewed' or r.client_message is not null then fails := fails || 'reviewed guardó mensaje'; end if;
  -- 12. Historial acotado a 50 eventos
  perform public.review_prescription(rx2, 0, 'in_review', null);
  for n in 1..24 loop
    perform public.review_prescription(rx2, 2 * n - 1, 'pending', null);
    perform public.review_prescription(rx2, 2 * n, 'in_review', null);
  end loop;
  perform public.review_prescription(rx2, 49, 'pending', null);
  begin perform public.review_prescription(rx2, 50, 'in_review', null); fails := fails || 'historial sin límite'; exception when others then null; end;
  reset role;

  -- 13. Borrar la receta reemplazada deja la nueva con replaces_id NULL y borra su historial
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.prescriptions where id = rx1;
  get diagnostics n = row_count;
  if n <> 1 then fails := fails || 'la persona no pudo borrar su receta con reemplazo'; end if;
  reset role;
  select replaces_id::text into s from public.prescriptions where id = rx1b;
  if s is not null then fails := fails || 'replaces_id no pasó a NULL'; end if;
  select count(*) into n from public.prescription_events where prescription_id = rx1;
  if n <> 0 then fails := fails || 'historial no se borró con la receta'; end if;

  if array_length(fails, 1) is null then raise exception 'REVIEW_OK'; end if;
  raise exception 'REVIEW_FALLOS: %', array_to_string(fails, ' | ');
end;
$$;

rollback;
