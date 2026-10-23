-- Compra con o sin cuenta (place_store_order). Las funciones anteriores (con dirección guardada) quedan sin permisos.
-- La versión vigente de place_store_order está en 20261023052852_compras_sin_cuenta_fix_color.sql.
revoke execute on function public.create_store_order(uuid, uuid, uuid, integer) from authenticated;
revoke execute on function public.set_store_order_preference(uuid, text) from authenticated;

create or replace function public.set_store_order_preference(p_order uuid, p_token text, p_preference text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.store_orders set mp_preference_id = p_preference
   where id = p_order and access_token = p_token and status = 'pending_payment';
end; $$;
revoke all on function public.set_store_order_preference(uuid, text, text) from public;
grant execute on function public.set_store_order_preference(uuid, text, text) to anon, authenticated;

-- Estado de una compra para quien tiene su enlace (sin cuenta).
create or replace function public.get_store_order(p_order uuid, p_token text)
returns table (status text, product_name text, color_name text, lens_option text, total_clp integer, needs_prescription boolean, created_at timestamptz)
language sql security definer set search_path = '' stable as $$
  select s.status, s.product_name, s.color_name, s.lens_option, s.total_clp, s.needs_prescription, s.created_at
  from public.store_orders s where s.id = p_order and s.access_token = p_token;
$$;
revoke all on function public.get_store_order(uuid, text) from public;
grant execute on function public.get_store_order(uuid, text) to anon, authenticated;
