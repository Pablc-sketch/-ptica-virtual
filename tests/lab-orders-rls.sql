-- Pruebas de supabase/pendientes/04_pedidos_laboratorio.sql. Fixtures SINTÉTICOS; termina siempre en excepción -> rollback.
-- Resultado: "LAB_OK" o "LAB_FALLOS: ...". Valores de RX inventados solo para probar restricciones (no son datos clínicos).
do $$
declare
  u uuid := gen_random_uuid(); adm uuid := gen_random_uuid(); prod uuid := gen_random_uuid();
  rxm uuid; rxf uuid; o uuid; o2 uuid; n integer; r record; fails text[] := '{}';
begin
  insert into auth.users (id, email) values (u, 'lab-u@test.invalid'), (adm, 'lab-adm@test.invalid');
  update public.profiles set role = 'admin' where id = adm;
  insert into public.products (id, slug, name, price_clp, status, sku, is_sample) values (prod, 'lab-test', 'Marco prueba lab', null, 'draft', 'TEST-LAB-1', true);
  insert into public.product_images (product_id, path, kind, verified) values (prod, 'x/lab.webp', 'retouched', false);
  update public.products set status = 'published' where id = prod;
  insert into public.product_procurement (product_id, supplier_code, confirmed) values (prod, 'PRUEBA-0001', true);

  insert into public.prescriptions (user_id, path, consent_version, product_id, requested_treatment, requested_use, requested_family)
    values (u, u::text || '/mono.png', 'test', prod, 'Orgánico Antirreflejo', 'distance', 'Monofocal') returning id into rxm;
  insert into public.prescriptions (user_id, path, consent_version, product_id, requested_treatment, requested_use, requested_family)
    values (u, u::text || '/multi.png', 'test', prod, 'Orgánico Antirreflejo', null, 'Multifocal') returning id into rxf;

  -- cliente y anónimo: sin acceso
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.lab_orders (prescription_id, product_name, family, treatment) values (rxm, 'x', 'Monofocal', 'x'); fails := fails || 'cliente creó pedido'; exception when others then null; end;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin select count(*) into n from public.lab_orders; fails := fails || 'anon puede consultar lab_orders'; exception when others then null; end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  -- receta sin revisión documental completada
  begin insert into public.lab_orders (prescription_id, product_name, family, treatment) values (rxm, 'x', 'Monofocal', 'x'); fails := fails || 'pedido desde receta no revisada'; exception when others then null; end;
  reset role;
  update public.prescriptions set status = 'in_review', version = 1 where id in (rxm, rxf);
  update public.prescriptions set status = 'reviewed', version = 2 where id in (rxm, rxf);
  set local role authenticated;

  -- el contexto sale de la receta, no del admin
  insert into public.lab_orders (prescription_id, product_name, family, treatment, status, version) values (rxm, 'inventado', 'Multifocal', 'inventado', 'validated', 9) returning id into o;
  select family, treatment, status, version, product_name into r from public.lab_orders where id = o;
  if r.family <> 'Monofocal' or r.treatment <> 'Orgánico Antirreflejo' or r.status <> 'draft' or r.version <> 0 or r.product_name <> 'Marco prueba lab' then
    fails := fails || 'el insert no tomó el contexto de la receta';
  end if;
  begin insert into public.lab_orders (prescription_id, product_name, family, treatment) values (rxm, 'x', 'Monofocal', 'x'); fails := fails || 'dos pedidos activos por receta'; exception when others then null; end;

  -- concurrencia
  begin update public.lab_orders set od_sph = -1.00 where id = o; fails := fails || 'update sin version+1'; exception when others then null; end;
  -- bloqueos de validación, en orden
  begin update public.lab_orders set status = 'validated', version = 1 where id = o; fails := fails || 'validó sin RX'; exception when others then null; end;
  update public.lab_orders set version = 1, od_sph = -1.00, od_cyl = -0.50, oi_sph = -1.25, oi_cyl = 0, od_add = 1.50, od_pd = 31.5, oi_pd = 31.0 where id = o;
  begin update public.lab_orders set status = 'validated', version = 2 where id = o; fails := fails || 'validó sin eje con cilindro'; exception when others then null; end;
  update public.lab_orders set version = 2, od_axis = 90 where id = o;
  begin update public.lab_orders set status = 'validated', version = 3 where id = o; fails := fails || 'validó monofocal con ADD (conversión)'; exception when others then null; end;
  update public.lab_orders set version = 3, od_add = null, oi_pd = null where id = o;
  begin update public.lab_orders set status = 'validated', version = 4 where id = o; fails := fails || 'validó sin DP'; exception when others then null; end;
  update public.lab_orders set version = 4, oi_pd = 31.0 where id = o;
  -- valores imposibles
  begin update public.lab_orders set version = 5, od_sph = -1.10 where id = o; fails := fails || 'ESF fuera de pasos de 0,25'; exception when others then null; end;
  begin update public.lab_orders set version = 5, od_axis = 181 where id = o; fails := fails || 'eje > 180'; exception when others then null; end;
  -- no se edita la RX en la misma operación que cambia el estado
  begin update public.lab_orders set status = 'validated', version = 5, od_sph = -2.00 where id = o; fails := fails || 'validó y editó a la vez'; exception when others then null; end;
  -- proveedor no confirmado
  reset role;
  update public.product_procurement set confirmed = false where product_id = prod;
  set local role authenticated;
  begin update public.lab_orders set status = 'validated', version = 5 where id = o; fails := fails || 'validó con proveedor no confirmado'; exception when others then null; end;
  reset role;
  update public.product_procurement set confirmed = true where product_id = prod;
  set local role authenticated;
  update public.lab_orders set status = 'validated', version = 5 where id = o;
  select status, validated_by into r from public.lab_orders where id = o;
  if r.status <> 'validated' or r.validated_by <> adm then fails := fails || 'no quedó validado con autor'; end if;
  begin update public.lab_orders set version = 6, od_sph = -3.00 where id = o; fails := fails || 'editó un validado sin reabrir'; exception when others then null; end;
  update public.lab_orders set status = 'draft', version = 6 where id = o;
  select count(*) into n from public.lab_order_events where order_id = o;
  if n <> 2 then fails := fails || format('eventos=%s (esperado 2)', n); end if;

  -- multifocal: alturas y medición profesional obligatorias
  insert into public.lab_orders (prescription_id, product_name, family, treatment) values (rxf, 'x', 'x', 'x') returning id into o2;
  update public.lab_orders set version = 1, od_sph = 1.00, od_cyl = 0, oi_sph = 1.00, oi_cyl = 0, od_add = 2.00, oi_add = 2.00, od_pd = 32, oi_pd = 32 where id = o2;
  begin update public.lab_orders set status = 'validated', version = 2 where id = o2; fails := fails || 'multifocal validado sin alturas'; exception when others then null; end;
  update public.lab_orders set version = 2, od_height = 18, oi_height = 18 where id = o2;
  begin update public.lab_orders set status = 'validated', version = 3 where id = o2; fails := fails || 'multifocal sin medición profesional'; exception when others then null; end;
  update public.lab_orders set version = 3, measurement_source = 'professional_on_fitted_frame', measured_by = 'Profesional prueba', measured_at = current_date where id = o2;
  update public.lab_orders set status = 'validated', version = 4 where id = o2;
  -- cancelar es terminal y libera la receta para un pedido nuevo
  update public.lab_orders set status = 'cancelled', version = 5 where id = o2;
  begin update public.lab_orders set status = 'draft', version = 6 where id = o2; fails := fails || 'reabrió un cancelado'; exception when others then null; end;
  insert into public.lab_orders (prescription_id, product_name, family, treatment) values (rxf, 'x', 'x', 'x');
  -- sin DELETE para nadie
  begin delete from public.lab_orders where id = o2; fails := fails || 'admin borró un pedido'; exception when others then null; end;
  reset role;

  -- el cliente no ve pedidos ni eventos
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.lab_orders;
  if n <> 0 then fails := fails || 'cliente ve pedidos'; end if;
  select count(*) into n from public.lab_order_events;
  if n <> 0 then fails := fails || 'cliente ve eventos'; end if;
  reset role;

  -- privacidad: si la persona borra su receta, el borrador se va con ella
  delete from public.prescriptions where id = rxm;
  select count(*) into n from public.lab_orders where prescription_id = rxm;
  if n <> 0 then fails := fails || 'el pedido sobrevivió al borrado de la receta'; end if;

  if array_length(fails, 1) is null then raise exception 'LAB_OK'; end if;
  raise exception 'LAB_FALLOS: %', array_to_string(fails, ' | ');
end;
$$;
