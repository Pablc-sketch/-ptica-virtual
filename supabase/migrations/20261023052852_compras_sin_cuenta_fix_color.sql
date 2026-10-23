-- Compra con o sin cuenta. Precio, color y disponibilidad salen de la base; datos y dirección se validan aquí.
-- Ópticos: exige cristal (básico +0, antirreflejo +10.000, filtro azul +20.000) y marca que falta la receta.
create or replace function public.place_store_order(
  p_product uuid, p_variant uuid, p_lens text, p_quantity integer,
  p_name text, p_email text, p_phone text,
  p_region text, p_comuna text, p_street text, p_number text, p_unit text, p_notes text)
returns table (order_id uuid, access_token text) language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p record; v_id uuid; v_color text; extra integer := 0; unit integer; new_id uuid; new_token text;
  email text := lower(btrim(coalesce(p_email,'')));
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > 5 then raise exception 'invalid_quantity' using errcode = '22023'; end if;
  if char_length(btrim(coalesce(p_name,''))) not between 2 and 120 then raise exception 'invalid_name' using errcode = '22023'; end if;
  if email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' or char_length(email) > 254 then raise exception 'invalid_email' using errcode = '22023'; end if;
  if btrim(coalesce(p_phone,'')) !~ '^[+0-9][0-9 -]{5,29}$' then raise exception 'invalid_phone' using errcode = '22023'; end if;
  if char_length(btrim(coalesce(p_region,''))) not between 2 and 60 or char_length(btrim(coalesce(p_comuna,''))) not between 2 and 60
     or char_length(btrim(coalesce(p_street,''))) not between 2 and 120 or char_length(btrim(coalesce(p_number,''))) not between 1 and 20
     or char_length(coalesce(p_unit,'')) > 40 or char_length(coalesce(p_notes,'')) > 300 then
    raise exception 'invalid_address' using errcode = '22023'; end if;
  select id, name, use, status, pair_base_price_clp into p from public.products where id = p_product;
  if not found or p.status <> 'published' or coalesce(p.pair_base_price_clp,0) <= 0 then
    raise exception 'product_not_available' using errcode = '22023'; end if;
  if p.use = 'optical' then
    if p_lens is null or p_lens not in ('basico','antirreflejo','filtro-azul') then raise exception 'lens_required' using errcode = '22023'; end if;
    extra := case p_lens when 'antirreflejo' then 10000 when 'filtro-azul' then 20000 else 0 end;
  elsif p_lens is not null then raise exception 'lens_not_applicable' using errcode = '22023';
  end if;
  if p_variant is not null then
    select pv.id, pv.color_name into v_id, v_color from public.product_variants pv where pv.id = p_variant and pv.product_id = p_product and pv.status = 'published';
    if v_id is null then raise exception 'variant_not_available' using errcode = '22023'; end if;
  end if;
  -- Freno a abusos: máximo 5 compras pendientes por correo por hora.
  if (select count(*) from public.store_orders s where lower(s.buyer_email) = email and s.status = 'pending_payment' and s.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too_many_pending' using errcode = '22023'; end if;
  unit := p.pair_base_price_clp + extra;
  insert into public.store_orders (user_id, product_id, variant_id, quantity, unit_price_clp, total_clp, product_name, color_name, ship_to,
    lens_option, needs_prescription, buyer_name, buyer_email, buyer_phone)
  values (uid, p.id, v_id, p_quantity, unit, unit * p_quantity, p.name, v_color,
    jsonb_build_object('recipient', btrim(p_name), 'phone', btrim(p_phone), 'region', btrim(p_region), 'comuna', btrim(p_comuna),
      'street', btrim(p_street), 'street_number', btrim(p_number), 'unit', nullif(btrim(coalesce(p_unit,'')),''), 'notes', nullif(btrim(coalesce(p_notes,'')),'')),
    case when p.use = 'optical' then p_lens end, p.use = 'optical', btrim(p_name), email, btrim(p_phone))
  returning store_orders.id, store_orders.access_token into new_id, new_token;
  return query select new_id, new_token;
end; $$;
revoke all on function public.place_store_order(uuid, uuid, text, integer, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.place_store_order(uuid, uuid, text, integer, text, text, text, text, text, text, text, text, text) to anon, authenticated;
