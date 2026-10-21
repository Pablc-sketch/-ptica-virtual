-- Fully synthetic fixtures; every statement is rolled back.
begin;
insert into auth.users(id,email) values
 ('75000000-0000-4000-8000-000000000001','catalog-owner@example.invalid'),
 ('75000000-0000-4000-8000-000000000002','catalog-other@example.invalid'),
 ('75000000-0000-4000-8000-000000000003','catalog-admin@example.invalid');
update public.profiles set role='admin' where id='75000000-0000-4000-8000-000000000003';
insert into public.products(id,slug,name,price_clp,status,sku) values
 ('76000000-0000-4000-8000-000000000001','qa-published-rollback','Synthetic published frame',50000,'draft','QA-CATALOG-ROLLBACK'),
 ('76000000-0000-4000-8000-000000000002','qa-draft-rollback','Synthetic draft frame',10000,'draft',null);
insert into public.product_images(product_id,path,verified,verified_at) values
 ('76000000-0000-4000-8000-000000000001','qa-metadata-only.jpg',true,now());
update public.products set status='published' where id='76000000-0000-4000-8000-000000000001';
do $$ begin
 begin update public.products set status='published' where id='76000000-0000-4000-8000-000000000002'; raise exception 'QA failure: no SKU accepted';
 exception when raise_exception then if sqlerrm not like '%sin código/SKU real%' then raise; end if; end;
 begin update public.products set price_clp=0 where id='76000000-0000-4000-8000-000000000001'; raise exception 'QA failure: zero price accepted';
 exception when raise_exception then if sqlerrm not like '%sin precio%' then raise; end if; end;
 begin delete from public.product_images where product_id='76000000-0000-4000-8000-000000000001'; raise exception 'QA failure: last verified photo removed';
 exception when raise_exception then if sqlerrm not like '%al menos una foto%' then raise; end if; end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if (select count(*) from public.products where id in ('76000000-0000-4000-8000-000000000001','76000000-0000-4000-8000-000000000002'))<>1 then raise exception 'QA failure: draft exposed'; end if;
 begin insert into public.products(slug,name,price_clp) values ('qa-forbidden','QA forbidden',100); raise exception 'QA failure: anon product write allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.quotes(customer_name,email) values ('Synthetic forbidden','qa@example.invalid'); raise exception 'QA failure: direct quote write allowed'; exception when insufficient_privilege then null; end;
 perform public.create_quote('Synthetic anonymous','catalog-anon@example.invalid',null,null,'[{"product_id":"76000000-0000-4000-8000-000000000001","quantity":2,"price_clp":1,"unit_price_clp":1}]'::jsonb);
 begin perform public.create_quote('Synthetic draft','catalog-draft@example.invalid',null,null,'[{"product_id":"76000000-0000-4000-8000-000000000002","quantity":1}]'::jsonb); raise exception 'QA failure: draft quoted';
 exception when raise_exception then if sqlerrm not like '%Producto no disponible%' then raise; end if; end;
end $$;
reset role;
do $$ begin
 if (select i.unit_price_clp from public.quote_items i join public.quotes q on q.id=i.quote_id where q.email='catalog-anon@example.invalid')<>50000 then raise exception 'QA failure: client price trusted'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"75000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','75000000-0000-4000-8000-000000000001',true);
select public.create_quote('Synthetic customer','catalog-customer@example.invalid',null,null,'[{"product_id":"76000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb);
do $$ begin if (select count(*) from public.quotes where email='catalog-customer@example.invalid')<>1 then raise exception 'QA failure: own quote unavailable'; end if; end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"75000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','75000000-0000-4000-8000-000000000002',true);
do $$ declare changed integer; begin
 if exists(select 1 from public.quotes where email='catalog-customer@example.invalid') then raise exception 'QA failure: cross-customer quote'; end if;
 update public.profiles set role='admin' where id='75000000-0000-4000-8000-000000000002'; get diagnostics changed=row_count;
 if changed<>0 or public.is_admin() then raise exception 'QA failure: role escalation'; end if;
 begin insert into storage.objects(bucket_id,name) values('product-images','qa-forbidden.jpg'); raise exception 'QA failure: customer catalogue upload'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"75000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','75000000-0000-4000-8000-000000000003',true);
do $$ begin
 if not public.is_admin() then raise exception 'QA failure: missing admin role'; end if;
 if (select count(*) from public.products where id in ('76000000-0000-4000-8000-000000000001','76000000-0000-4000-8000-000000000002'))<>2 then raise exception 'QA failure: admin draft unavailable'; end if;
 if not exists(select 1 from public.quotes where email='catalog-customer@example.invalid') then raise exception 'QA failure: admin quote unavailable'; end if;
end $$;
reset role;
select 'PASS: publication guards, draft isolation, write denial, server prices, customer isolation, role escalation denial, and admin access; fixtures rolled back' as test_result;
rollback;
