-- Separación comercial solicitada por Pablo. No borra productos, fotos ni códigos.
-- Kensington: las referencias importadas comparten un código NO confirmado;
-- se conservan privadas y se separan los diseños identificados por el propietario.
-- Cannes café: referencia distinta; lectura de etiqueta aún no confirmada.
begin;
do $$
declare item record; original public.products%rowtype; target_id uuid;
begin
 for item in select * from (values
  ('optico-kensington','7d32bb2b-2a61-4519-875a-1dab16eb851c'::uuid,'optico-camden','Camden','Bronce','OG-OPT-CAMDEN'),
  ('optico-kensington','06ecbba5-bc47-4ccb-a012-2ac7144f3af1'::uuid,'optico-chelsea','Chelsea','Negro','OG-OPT-CHELSEA'),
  ('sol-cannes','4ec4929e-3859-4ada-8862-5e461c1f0458'::uuid,'sol-monaco','Monaco','Dorado con café degradado','OG-SOL-MONACO')
 ) as t(old_slug,variant_id,new_slug,new_name,new_color,new_sku)
 loop
  select * into strict original from public.products where slug=item.old_slug;
  select id into target_id from public.products where slug=item.new_slug;
  if target_id is null then
   insert into public.products(slug,name,brand_id,description,price_clp,status,frame_shape,material,color,gender,lens_width_mm,bridge_mm,temple_mm,source,source_ref,sku,pair_base_price_clp,is_sample,use)
   values(item.new_slug,item.new_name,original.brand_id,'Un diseño con identidad propia. Acabado '||lower(item.new_color)||' y detalles que acompañan tu estilo.',original.price_clp,'draft',original.frame_shape,original.material,item.new_color,original.gender,original.lens_width_mm,original.bridge_mm,original.temple_mm,original.source,original.source_ref,item.new_sku,original.pair_base_price_clp,original.is_sample,original.use)
   returning id into target_id;
   insert into public.product_procurement(product_id,supplier_name,supplier_code,color_code,confirmed,notes)
    select target_id,p.supplier_name,v.supplier_code,v.color_code,false,
     left('Publicación independiente. Referencia importada pendiente de confirmar. '||coalesce(v.notes,''),1000)
    from public.product_procurement p join public.product_variant_procurement v on v.variant_id=item.variant_id where p.product_id=original.id;
  end if;
  if not exists(select 1 from public.product_variants where id=item.variant_id and product_id in (original.id,target_id)) then raise exception 'variant_source_mismatch'; end if;
  update public.product_variants set product_id=target_id,position=0 where id=item.variant_id;
  update public.product_images set product_id=target_id where variant_id=item.variant_id;
  update public.products set status=original.status where id=target_id;
 end loop;
 update public.products set color='Azul' where slug='optico-kensington';
 update public.products set color='Dorado con gris degradado' where slug='sol-cannes';
end $$;
commit;
