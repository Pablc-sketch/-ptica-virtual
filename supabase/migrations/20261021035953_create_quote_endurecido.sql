alter table public.quotes add column contact_key text;
create index quotes_contact_key_idx on public.quotes (contact_key, created_at);
create index quotes_created_at_idx on public.quotes (created_at);

create or replace function public.create_quote(p_name text, p_email text, p_phone text, p_notes text, p_items jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(nullif(btrim(coalesce(p_email, '')), ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_key text; v_quote uuid; v_row record; v_total integer := 0;
  v_uid uuid := (select auth.uid());
begin
  if char_length(v_name) not between 2 and 120 then raise exception 'Nombre inválido'; end if;
  if v_email is null and v_phone is null then raise exception 'Indica email o teléfono'; end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email inválido'; end if;
  if v_phone is not null and char_length(v_phone) not between 6 and 30 then raise exception 'Teléfono inválido'; end if;
  if v_notes is not null and char_length(v_notes) > 2000 then raise exception 'Notas demasiado largas'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 10 then
    raise exception 'La cotización debe tener entre 1 y 10 productos';
  end if;

  v_key := coalesce(v_email, v_phone);
  if (select count(*) from public.quotes q where q.contact_key = v_key and q.created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Demasiadas cotizaciones recientes. Intenta más tarde';
  end if;
  if v_uid is not null and (select count(*) from public.quotes q where q.user_id = v_uid and q.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Demasiadas cotizaciones recientes. Intenta más tarde';
  end if;
  if (select count(*) from public.quotes q where q.created_at > now() - interval '1 hour') >= 100 then
    raise exception 'Servicio ocupado. Intenta más tarde';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where jsonb_typeof(e) <> 'object'
       or (e ->> 'product_id') is null
       or (e ->> 'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(e ->> 'quantity', '1') !~ '^[0-9]{1,2}$'
       or coalesce(e ->> 'quantity', '1')::integer not between 1 and 10
  ) then raise exception 'Productos de la cotización inválidos'; end if;

  insert into public.quotes (customer_name, email, phone, notes, user_id, contact_key)
  values (v_name, v_email, v_phone, v_notes, v_uid, v_key) returning id into v_quote;

  for v_row in
    select (e ->> 'product_id')::uuid as product_id, sum(coalesce(e ->> 'quantity', '1')::integer)::integer as qty
    from jsonb_array_elements(p_items) e group by 1
  loop
    if v_row.qty > 10 then raise exception 'Cantidad inválida'; end if;
    insert into public.quote_items (quote_id, product_id, product_name, quantity, unit_price_clp)
    select v_quote, p.id, p.name, v_row.qty, p.price_clp from public.products p
    where p.id = v_row.product_id and p.status = 'published';
    if not found then raise exception 'Producto no disponible'; end if;
    v_total := v_total + v_row.qty;
  end loop;
  if v_total > 20 then raise exception 'Demasiadas unidades en la cotización'; end if;
  return v_quote;
end; $$;
revoke all on function public.create_quote(text, text, text, text, jsonb) from public;
grant execute on function public.create_quote(text, text, text, text, jsonb) to anon, authenticated;

