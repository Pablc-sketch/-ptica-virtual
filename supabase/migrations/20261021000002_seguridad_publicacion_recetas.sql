-- Endurecimiento: storage (SELECT para upsert, UPDATE con WITH CHECK), publicación
-- solo con foto real verificada y precio, bucket privado de recetas y límites en create_quote.

-- ---------- Storage del catálogo ----------
drop policy "admin actualiza fotos y modelos" on storage.objects;
create policy "admin lee fotos y modelos" on storage.objects for select to authenticated
  using (bucket_id in ('product-images', 'product-models') and public.is_admin());
create policy "admin actualiza fotos y modelos" on storage.objects for update to authenticated
  using (bucket_id in ('product-images', 'product-models') and public.is_admin())
  with check (bucket_id in ('product-images', 'product-models') and public.is_admin());

-- ---------- Publicar solo con foto real verificada y precio ----------
alter table public.product_images
  add column verified boolean not null default false,
  add column verified_at timestamptz,
  add check (not verified or verified_at is not null);

create or replace function public.enforce_publishable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' then
    if tg_op = 'INSERT' then
      raise exception 'Un producto nuevo debe crearse como borrador';
    end if;
    if new.price_clp <= 0 then
      raise exception 'No se puede publicar sin precio';
    end if;
    if btrim(new.name) = '' then
      raise exception 'No se puede publicar sin nombre';
    end if;
    if not exists (
      select 1 from public.product_images i where i.product_id = new.id and i.verified
    ) then
      raise exception 'No se puede publicar sin una foto real verificada';
    end if;
  end if;
  return new;
end;
$$;
create trigger products_enforce_publishable before insert or update on public.products
  for each row execute function public.enforce_publishable();

-- No dejar sin foto verificada a un producto ya publicado.
create or replace function public.guard_published_images()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.verified
     and (tg_op = 'DELETE' or not new.verified or new.product_id <> old.product_id)
     and exists (select 1 from public.products p where p.id = old.product_id and p.status = 'published')
     and not exists (
       select 1 from public.product_images i
       where i.product_id = old.product_id and i.verified and i.id <> old.id
     ) then
    raise exception 'El producto publicado necesita al menos una foto real verificada';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger product_images_guard before update or delete on public.product_images
  for each row execute function public.guard_published_images();

-- ---------- Recetas: bucket PRIVADO, dueño o admin, URLs firmadas ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('prescriptions', 'prescriptions', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

-- Ruta obligatoria: <user_id>/<archivo>
create policy "receta: dueño sube en su carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'prescriptions' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "receta: dueño o admin lee" on storage.objects for select to authenticated
  using (bucket_id = 'prescriptions'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
create policy "receta: dueño o admin borra" on storage.objects for delete to authenticated
  using (bucket_id = 'prescriptions'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
-- Sin UPDATE: una receta se sube de nuevo, no se sobrescribe.

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete set null,
  path text not null unique,
  created_at timestamptz not null default now(),
  check (path like user_id::text || '/%')
);
create index prescriptions_user_idx on public.prescriptions (user_id);
alter table public.prescriptions enable row level security;
create policy "receta propia o admin" on public.prescriptions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "receta: registra la propia" on public.prescriptions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "receta: borra la propia o admin" on public.prescriptions for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- ---------- create_quote: límites anti-abuso y validación completa ----------
alter table public.quotes add column contact_key text;
create index quotes_contact_key_idx on public.quotes (contact_key, created_at);
create index quotes_created_at_idx on public.quotes (created_at);

create or replace function public.create_quote(
  p_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(nullif(btrim(coalesce(p_email, '')), ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_key text;
  v_quote uuid;
  v_row record;
  v_total integer := 0;
  v_uid uuid := (select auth.uid());
begin
  if char_length(v_name) not between 2 and 120 then
    raise exception 'Nombre inválido';
  end if;
  if v_email is null and v_phone is null then
    raise exception 'Indica email o teléfono';
  end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email inválido';
  end if;
  if v_phone is not null and char_length(v_phone) not between 6 and 30 then
    raise exception 'Teléfono inválido';
  end if;
  if v_notes is not null and char_length(v_notes) > 2000 then
    raise exception 'Notas demasiado largas';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 10 then
    raise exception 'La cotización debe tener entre 1 y 10 productos';
  end if;

  -- Límites (la identidad de red no es confiable desde el RPC público, se limita por contacto y global).
  v_key := coalesce(v_email, v_phone);
  if (select count(*) from public.quotes q
      where q.contact_key = v_key and q.created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Demasiadas cotizaciones recientes. Intenta más tarde';
  end if;
  if v_uid is not null and (select count(*) from public.quotes q
      where q.user_id = v_uid and q.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Demasiadas cotizaciones recientes. Intenta más tarde';
  end if;
  if (select count(*) from public.quotes q where q.created_at > now() - interval '1 hour') >= 100 then
    raise exception 'Servicio ocupado. Intenta más tarde';
  end if;

  -- Cada ítem debe tener product_id uuid y cantidad entera 1..10; el precio nunca viene del cliente.
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where jsonb_typeof(e) <> 'object'
       or (e ->> 'product_id') is null
       or (e ->> 'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(e ->> 'quantity', '1') !~ '^[0-9]{1,2}$'
       or coalesce(e ->> 'quantity', '1')::integer not between 1 and 10
  ) then
    raise exception 'Productos de la cotización inválidos';
  end if;

  insert into public.quotes (customer_name, email, phone, notes, user_id, contact_key)
  values (v_name, v_email, v_phone, v_notes, v_uid, v_key)
  returning id into v_quote;

  for v_row in
    select (e ->> 'product_id')::uuid as product_id,
           sum(coalesce(e ->> 'quantity', '1')::integer)::integer as qty
    from jsonb_array_elements(p_items) e
    group by 1
  loop
    if v_row.qty > 10 then
      raise exception 'Cantidad inválida';
    end if;
    insert into public.quote_items (quote_id, product_id, product_name, quantity, unit_price_clp)
    select v_quote, p.id, p.name, v_row.qty, p.price_clp
    from public.products p
    where p.id = v_row.product_id and p.status = 'published';
    if not found then
      raise exception 'Producto no disponible';
    end if;
    v_total := v_total + v_row.qty;
  end loop;

  if v_total > 20 then
    raise exception 'Demasiadas unidades en la cotización';
  end if;
  return v_quote;
end;
$$;
revoke all on function public.create_quote(text, text, text, text, jsonb) from public;
grant execute on function public.create_quote(text, text, text, text, jsonb) to anon, authenticated;
