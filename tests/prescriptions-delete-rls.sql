-- Prueba RLS de borrado de recetas, con fixtures sintéticos y ROLLBACK forzado (termina siempre en excepción).
-- Resultado: "DELETE_RLS_OK" o "DELETE_RLS_FALLOS: ...". No toca archivos reales: los objetos son filas sintéticas en una
-- transacción que se revierte. NOTA: el borrado real de objetos debe hacerse por la API de Storage, no por SQL.
-- Ejecutar con rol postgres sobre el proyecto de la óptica virtual (zezqhjikapaelbjavjms).
do $$
declare
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); adm uuid := gen_random_uuid();
  p1 text; p2 text; rx1 uuid; rx2 uuid; n integer; fails text[] := '{}';
begin
  insert into auth.users (id, email) values (u1, 'rx1@test.invalid'), (u2, 'rx2@test.invalid'), (adm, 'rxadm@test.invalid');
  update public.profiles set role = 'admin' where id = adm;
  p1 := u1::text || '/aaaa1111.png';
  p2 := u2::text || '/bbbb2222.png';
  insert into storage.objects (bucket_id, name, owner) values ('prescriptions', p1, u1), ('prescriptions', p2, u2);
  insert into public.prescriptions (user_id, path, consent_version) values (u1, p1, 'test') returning id into rx1;
  insert into public.prescriptions (user_id, path, consent_version) values (u2, p2, 'test') returning id into rx2;

  -- u2 no puede borrar la fila ni el objeto de u1
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.prescriptions where id = rx1;
  get diagnostics n = row_count;
  if n <> 0 then fails := fails || 'u2 borró la receta de u1'; end if;
  delete from storage.objects where bucket_id = 'prescriptions' and name = p1;
  get diagnostics n = row_count;
  if n <> 0 then fails := fails || 'u2 borró el objeto de u1'; end if;
  reset role;

  -- anónimo no puede borrar nada
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin delete from public.prescriptions where id = rx1; fails := fails || 'anon pudo ejecutar delete sobre prescriptions'; exception when others then null; end;
  reset role;

  -- u1 borra lo suyo: objeto y luego registro; borrar de nuevo un objeto inexistente afecta 0 filas sin error
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from storage.objects where bucket_id = 'prescriptions' and name = p1;
  get diagnostics n = row_count;
  if n <> 1 then fails := fails || format('u1 no pudo borrar su objeto (%s)', n); end if;
  delete from storage.objects where bucket_id = 'prescriptions' and name = p1;
  get diagnostics n = row_count;
  if n <> 0 then fails := fails || 'borrar un objeto inexistente no fue no-op'; end if;
  delete from public.prescriptions where id = rx1 and user_id = u1;
  get diagnostics n = row_count;
  if n <> 1 then fails := fails || format('u1 no pudo borrar su registro (%s)', n); end if;
  -- u1 no ve ni toca lo de u2
  select count(*) into n from public.prescriptions where id = rx2;
  if n <> 0 then fails := fails || 'u1 ve la receta de u2'; end if;
  reset role;

  -- la receta de u2 sigue intacta
  select count(*) into n from public.prescriptions where id = rx2;
  if n <> 1 then fails := fails || 'la receta de u2 fue afectada'; end if;
  select count(*) into n from storage.objects where bucket_id = 'prescriptions' and name = p2;
  if n <> 1 then fails := fails || 'el objeto de u2 fue afectado'; end if;

  if array_length(fails, 1) is null then raise exception 'DELETE_RLS_OK'; end if;
  raise exception 'DELETE_RLS_FALLOS: %', array_to_string(fails, ' | ');
end;
$$;
