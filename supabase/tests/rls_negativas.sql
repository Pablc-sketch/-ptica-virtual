-- Pruebas RLS negativas. Corre todo dentro de una transacción y SIEMPRE termina con
-- una excepción para hacer rollback: el resultado es el mensaje "RLS_OK" o "RLS_FALLOS: ...".
-- Ejecutar con rol postgres (SQL editor / MCP execute_sql) sobre el proyecto de la óptica virtual.
do $$
declare
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  adm uuid := gen_random_uuid();
  pub uuid := gen_random_uuid();
  drf uuid := gen_random_uuid();
  q1 uuid;
  n integer;
  r text;
  fails text[] := '{}';

begin
  insert into auth.users (id, email) values
    (u1, 'u1@test.cl'), (u2, 'u2@test.cl'), (adm, 'adm@test.cl');
  update public.profiles set role = 'admin' where id = adm;

  insert into public.products (id, slug, name, price_clp, status) values
    (pub, 'pub', 'Publicado', 50000, 'draft'),
    (drf, 'drf', 'Borrador', 40000, 'draft');
  insert into public.product_images (product_id, path, is_primary, verified, verified_at)
    values (pub, 'x/pub.jpg', true, true, now());
  update public.products set status = 'published' where id = pub;

  -- 1. publicar sin foto verificada debe fallar
  begin
    update public.products set status = 'published' where id = drf;
    fails := fails || 'se publicó sin foto verificada';
  exception when others then null; end;

  -- 2. publicar con precio 0 debe fallar
  begin
    update public.products set price_clp = 0 where id = pub;
    fails := fails || 'se publicó con precio 0';
  exception when others then null; end;

  -- 3. no se puede quitar la única foto verificada de un producto publicado
  begin
    delete from public.product_images where product_id = pub;
    fails := fails || 'se borró la única foto verificada de un publicado';
  exception when others then null; end;

  -- 4. un producto nuevo no nace publicado
  begin
    insert into public.products (slug, name, price_clp, status) values ('nuevo', 'N', 1000, 'published');
    fails := fails || 'se insertó producto ya publicado';
  exception when others then null; end;

  -- ---- anon ----
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into n from public.products;
  if n <> 1 then fails := fails || format('anon ve %s productos (esperado 1)', n); end if;
  begin
    insert into public.products (slug, name, price_clp) values ('hack', 'H', 1);
    fails := fails || 'anon insertó producto';
  exception when others then null; end;
  begin
    insert into public.quotes (customer_name, email) values ('Hack', 'h@h.cl');
    fails := fails || 'anon insertó cotización directo';
  exception when others then null; end;
  begin
    insert into public.profiles (id, role) values (gen_random_uuid(), 'admin');
    fails := fails || 'anon insertó perfil';
  exception when others then null; end;
  select count(*) into n from public.quotes;
  if n <> 0 then fails := fails || 'anon ve cotizaciones'; end if;
  reset role;

  -- create_quote público: no confía en el precio del cliente
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  q1 := public.create_quote('Ana Pérez', 'ana@correo.cl', null, null,
        jsonb_build_array(jsonb_build_object('product_id', pub, 'quantity', 2, 'unit_price_clp', 1, 'price', 1)));
  reset role;
  select unit_price_clp into n from public.quote_items where quote_id = q1;
  if n <> 50000 then fails := fails || format('create_quote usó precio %s', n); end if;

  -- producto en borrador, UUID inválido, cantidad inválida, lista vacía
  foreach r in array array[
    format('[{"product_id":"%s","quantity":1}]', drf),
    '[{"product_id":"no-uuid","quantity":1}]',
    format('[{"product_id":"%s","quantity":99}]', pub),
    format('[{"product_id":"%s","quantity":"1; drop"}]', pub),
    '[]', '{"a":1}'
  ] loop
    begin
      set local role anon;
      perform public.create_quote('Beto Gómez', 'beto@correo.cl', null, null, r::jsonb);
      reset role;
      fails := fails || 'create_quote aceptó: ' || r;
    exception when others then reset role; end;
  end loop;

  -- límite por contacto: 3 por hora (ya hay 1 de ana)
  perform public.create_quote('Ana Pérez', 'ANA@correo.cl', null, null, jsonb_build_array(jsonb_build_object('product_id', pub)));
  perform public.create_quote('Ana Pérez', 'ana@correo.cl', null, null, jsonb_build_array(jsonb_build_object('product_id', pub)));
  begin
    perform public.create_quote('Ana Pérez', 'ana@correo.cl', null, null, jsonb_build_array(jsonb_build_object('product_id', pub)));
    fails := fails || 'no se aplicó el límite por contacto';
  exception when others then null; end;

  -- ---- cliente autenticado u1 / u2 ----
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  q1 := public.create_quote('Uno Uno', 'uno@correo.cl', null, null, jsonb_build_array(jsonb_build_object('product_id', pub)));
  select count(*) into n from public.quotes where id = q1;
  if n <> 1 then fails := fails || 'u1 no ve su cotización'; end if;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.quotes;
  if n <> 0 then fails := fails || format('u2 ve %s cotizaciones ajenas', n); end if;
  select count(*) into n from public.quote_items;
  if n <> 0 then fails := fails || 'u2 ve ítems ajenos'; end if;
  update public.profiles set role = 'admin' where id = u2;
  get diagnostics n = row_count;
  if n <> 0 then fails := fails || 'u2 pudo editar su rol'; end if;
  begin
    insert into public.products (slug, name, price_clp) values ('hack2', 'H', 1);
    fails := fails || 'cliente insertó producto';
  exception when others then null; end;
  update public.quotes set status = 'closed';
  get diagnostics n = row_count;
  if n <> 0 then fails := fails || 'cliente editó cotizaciones'; end if;
  begin
    insert into storage.objects (bucket_id, name, owner) values ('product-images', 'hack.jpg', u2);
    fails := fails || 'cliente subió al bucket del catálogo';
  exception when others then null; end;
  begin
    insert into storage.objects (bucket_id, name, owner) values ('product-models', 'hack.glb', u2);
    fails := fails || 'cliente subió modelo 3d';
  exception when others then null; end;
  reset role;
  select role into r from public.profiles where id = u2;
  if r <> 'customer' then fails := fails || 'rol de u2 cambió'; end if;

  -- ---- admin ----
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.products;
  if n <> 2 then fails := fails || format('admin ve %s productos (esperado 2)', n); end if;
  select count(*) into n from public.quotes;
  if n < 4 then fails := fails || 'admin no ve todas las cotizaciones'; end if;
  begin
    insert into storage.objects (bucket_id, name, owner) values ('product-images', 'ok.jpg', adm);
  exception when others then fails := fails || 'admin no pudo subir foto: ' || sqlerrm; end;
  reset role;

  if array_length(fails, 1) is null then
    raise exception 'RLS_OK';
  end if;
  raise exception 'RLS_FALLOS: %', array_to_string(fails, ' | ');
end;
$$;
