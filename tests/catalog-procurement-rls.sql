-- Prueba sintética; revierte todos los datos. Aplicar solo a la tienda independiente.
begin;
savepoint catalog_validation;

insert into public.products(id,name,slug,sku,price_clp,pair_base_price_clp,is_sample) values ('9b9c4d40-16d4-43cf-83d3-bf303afed001','QA muestra','qa-muestra-rollback','QA-ONLY',null,28000,true);
insert into public.product_images(product_id,path,kind,alt) values ('9b9c4d40-16d4-43cf-83d3-bf303afed001','site/products/ovalo.webp','retouched','QA');
insert into public.product_procurement(product_id,supplier_code) values ('9b9c4d40-16d4-43cf-83d3-bf303afed001','SYNTHETIC-ONLY');
update public.products set status='published' where id='9b9c4d40-16d4-43cf-83d3-bf303afed001';
set local role anon;
do $$ begin
 if (select count(*) from public.products where id='9b9c4d40-16d4-43cf-83d3-bf303afed001')<>1 then raise exception 'sample_not_visible';end if;
 begin perform * from public.product_procurement; raise exception 'private_code_visible_anon';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"9b9c4d40-16d4-43cf-83d3-bf303afed099","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.product_procurement)<>0 then raise exception 'private_code_visible_customer';end if;
 begin insert into public.product_procurement(product_id,supplier_code) values ('9b9c4d40-16d4-43cf-83d3-bf303afed001','FORGED');raise exception 'customer_can_insert';exception when insufficient_privilege then null;end;
 update public.product_procurement set supplier_code='FORGED';if found then raise exception 'customer_can_update';end if;
end $$;
reset role;
do $$ begin
 begin update public.products set is_sample=false where id='9b9c4d40-16d4-43cf-83d3-bf303afed001';raise exception 'sample_can_become_sale';exception when raise_exception then if sqlerrm='sample_can_become_sale' then raise;end if;end;
 if has_function_privilege('anon','public.create_quote(text,text,text,text,jsonb)','EXECUTE') or has_function_privilege('authenticated','public.create_quote(text,text,text,text,jsonb)','EXECUTE') then raise exception 'quote_open';end if;
 if position('not p.is_sample' in pg_get_functiondef('public.create_quote(text,text,text,text,jsonb)'::regprocedure))=0 then raise exception 'sample_guard_missing';end if;
end $$;


reset role;
insert into auth.users(id,email) values ('9b9c4d40-16d4-43cf-83d3-bf303afed098','catalog-qa-admin@example.invalid');
update public.profiles set role='admin' where id='9b9c4d40-16d4-43cf-83d3-bf303afed098';
select set_config('request.jwt.claims','{"sub":"9b9c4d40-16d4-43cf-83d3-bf303afed098","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.product_procurement where product_id='9b9c4d40-16d4-43cf-83d3-bf303afed001')<>1 then raise exception 'admin_cannot_read_private_code';end if;
 update public.product_procurement set supplier_code='SYNTHETIC-ADMIN' where product_id='9b9c4d40-16d4-43cf-83d3-bf303afed001';
 if not found then raise exception 'admin_cannot_update_private_code';end if;
end $$;
reset role;
rollback to savepoint catalog_validation;
release savepoint catalog_validation;
rollback;

