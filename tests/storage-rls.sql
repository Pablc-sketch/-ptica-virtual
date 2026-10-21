-- Synthetic metadata-only permission fixtures. Entire test rolls back.
-- No emails sent, no real prescriptions or customer records.
begin;
insert into auth.users(id,email) values
 ('71000000-0000-4000-8000-000000000001','qa-owner@example.invalid'),
 ('71000000-0000-4000-8000-000000000002','qa-other@example.invalid'),
 ('71000000-0000-4000-8000-000000000003','qa-admin@example.invalid');
update public.profiles set role='admin' where id='71000000-0000-4000-8000-000000000003';
insert into public.quotes(id,customer_name,email,user_id) values
 ('72000000-0000-4000-8000-000000000001','Synthetic QA Owner','qa-owner@example.invalid','71000000-0000-4000-8000-000000000001'),
 ('72000000-0000-4000-8000-000000000002','Synthetic QA Other','qa-other@example.invalid','71000000-0000-4000-8000-000000000002');
insert into storage.objects(bucket_id,name) values
 ('prescriptions','71000000-0000-4000-8000-000000000001/qa-owner.pdf'),
 ('prescriptions','71000000-0000-4000-8000-000000000002/qa-other.pdf');
insert into public.prescriptions(id,user_id,quote_id,path,consent_version) values
 ('73000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001/qa-owner.pdf','qa-rollback'),
 ('73000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000002/qa-other.pdf','qa-rollback');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
do $$ begin
 if public.is_admin() then raise exception 'Customer became admin'; end if;
 if (select count(*) from public.prescriptions where id in ('73000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000002')) <> 1 then raise exception 'Cross-customer prescription read'; end if;
 if (select count(*) from storage.objects where bucket_id='prescriptions' and name in ('71000000-0000-4000-8000-000000000001/qa-owner.pdf','71000000-0000-4000-8000-000000000002/qa-other.pdf')) <> 1 then raise exception 'Cross-customer file read'; end if;
 if (select count(*) from public.quotes where id in ('72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002')) <> 1 then raise exception 'Cross-customer quote read'; end if;
 begin
  insert into storage.objects(bucket_id,name) values ('prescriptions','71000000-0000-4000-8000-000000000002/qa-forged.pdf');
  raise exception 'Cross-folder upload was allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.prescriptions(user_id,path,consent_version) values ('71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001/missing.pdf','qa-rollback');
  raise exception 'Missing file registration was allowed';
 exception when insufficient_privilege then null; end;
end $$;

-- Own-folder insertion succeeds; association to another customer's quote fails.
insert into storage.objects(bucket_id,name) values ('prescriptions','71000000-0000-4000-8000-000000000001/qa-new.pdf');
do $$ begin
 begin
  insert into public.prescriptions(user_id,quote_id,path,consent_version) values ('71000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001/qa-new.pdf','qa-rollback');
  raise exception 'Cross-customer quote association was allowed';
 exception when insufficient_privilege then null; end;
end $$;
insert into public.prescriptions(user_id,quote_id,path,consent_version) values ('71000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001/qa-new.pdf','qa-rollback');

reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if public.is_admin() then raise exception 'Anonymous became admin'; end if;
 begin
  perform count(*) from public.prescriptions;
  raise exception 'Anonymous prescription table access was allowed';
 exception when insufficient_privilege then null; end;
 if exists(select 1 from storage.objects where bucket_id='prescriptions' and name like '71000000-%') then raise exception 'Anonymous file read'; end if;
 if exists(select 1 from public.quotes where id in ('72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002')) then raise exception 'Anonymous quote read'; end if;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000003',true);
do $$ begin
 if not public.is_admin() then raise exception 'Administrator role unavailable'; end if;
 if (select count(*) from public.prescriptions where user_id in ('71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002')) <> 3 then raise exception 'Admin cannot review prescriptions'; end if;
 if (select count(*) from storage.objects where bucket_id='prescriptions' and name in ('71000000-0000-4000-8000-000000000001/qa-owner.pdf','71000000-0000-4000-8000-000000000002/qa-other.pdf','71000000-0000-4000-8000-000000000001/qa-new.pdf')) <> 3 then raise exception 'Admin cannot access files'; end if;
end $$;
reset role;
select 'PASS: customer isolation, own upload, quote ownership, missing-file rejection, anon denial and admin review; all fixtures rolled back' as test_result;
rollback;
