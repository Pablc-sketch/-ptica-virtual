-- ONLY optica-virtual (zezqhjikapaelbjavjms). No connection to Lentia.
-- Product uploads remain public; prescriptions are isolated and private.
begin;

create policy "admin lee fotos y modelos" on storage.objects
for select to authenticated
using (bucket_id in ('product-images', 'product-models') and public.is_admin());

alter policy "admin actualiza fotos y modelos" on storage.objects
using (bucket_id in ('product-images', 'product-models') and public.is_admin())
with check (bucket_id in ('product-images', 'product-models') and public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prescriptions', 'prescriptions', false, 5242880,
        array['image/jpeg','image/png','image/webp','application/pdf']);

create policy "receta: dueño sube en su carpeta" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'prescriptions'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and name ~* ('^' || (select auth.uid())::text || '/[a-z0-9_-]{1,100}\.(pdf|png|jpe?g|webp)$')
);
create policy "receta: dueño o admin lee" on storage.objects
for select to authenticated
using (bucket_id = 'prescriptions' and (
  (storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()
));
create policy "receta: dueño o admin borra" on storage.objects
for delete to authenticated
using (bucket_id = 'prescriptions' and (
  (storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()
));

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  path text not null unique,
  consent_at timestamptz not null default now(),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  created_at timestamptz not null default now(),
  check (path ~* ('^' || user_id::text || '/[a-z0-9_-]{1,100}\.(pdf|png|jpe?g|webp)$'))
);
create index prescriptions_user_idx on public.prescriptions(user_id);
create index prescriptions_quote_idx on public.prescriptions(quote_id) where quote_id is not null;
alter table public.prescriptions enable row level security;
revoke all on public.prescriptions from anon;
grant select, insert, delete on public.prescriptions to authenticated;
grant all on public.prescriptions to service_role;

create policy "receta propia o admin" on public.prescriptions
for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

create policy "receta: registra archivo propio con consentimiento" on public.prescriptions
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and consent_at between now() - interval '10 minutes' and now() + interval '1 minute'
  and (quote_id is null or exists (
    select 1 from public.quotes q
    where q.id = quote_id and q.user_id = (select auth.uid())
  ))
  and exists (
    select 1 from storage.objects o
    where o.bucket_id = 'prescriptions' and o.name = path
      and (storage.foldername(o.name))[1] = (select auth.uid())::text
  )
);
create policy "receta: borra propia o admin" on public.prescriptions
for delete to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

commit;

