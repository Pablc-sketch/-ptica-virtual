-- Contexto de la selección, visible solo junto a la receta propia y en administración.
alter table public.prescriptions
 add column product_id uuid references public.products(id) on delete set null,
 add column requested_treatment text check(char_length(requested_treatment) between 1 and 100),
 add column requested_use text check(requested_use in ('distance','near')),
 add column requested_family text check(requested_family in ('Monofocal','Bifocal','Multifocal')),
 add constraint prescription_context_complete check(product_id is null or (requested_treatment is not null and requested_use is not null and requested_family is not null));
create index prescriptions_product_idx on public.prescriptions(product_id) where product_id is not null;
create function public.guard_prescription_context() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
   if new.product_id is null and (new.requested_treatment is not null or new.requested_use is not null or new.requested_family is not null) then raise exception 'context_without_product';end if;
   if new.product_id is not null and not exists(select 1 from public.products p where p.id=new.product_id and p.status='published') then raise exception 'product_not_available';end if;
 else
   if (new.product_id is distinct from old.product_id and new.product_id is not null)
    or new.requested_treatment is distinct from old.requested_treatment
    or new.requested_use is distinct from old.requested_use
    or new.requested_family is distinct from old.requested_family then raise exception 'immutable_prescription_context' using errcode='42501';end if;
 end if;
 return new;
end $$;
create trigger prescriptions_context_guard before insert or update on public.prescriptions for each row execute function public.guard_prescription_context();
revoke all on function public.guard_prescription_context() from public,anon,authenticated;
-- No grants nuevos: se conserva RLS de dueño/admin y la prohibición de UPDATE directo.
