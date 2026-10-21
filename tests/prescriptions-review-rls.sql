-- Pruebas de la revisión documental de recetas (migración APLICADA supabase/migrations/20261021192923_revision_documental_recetas.sql).
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
  -- 4b. Regresión (hallazgo de Codex): versión o estado destino NULL no deben aceptarse
  begin perform public.review_prescription(rx1, null, 'pending', null); fails := fails || 'NULL_VERSION_ACCEPTED'; exception when others then null; end;
  begin perform public.review_prescription(rx1, 1, null, null); fails := fails || 'NULL_STATUS_ACCEPTED'; exception when others then null; end;
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
