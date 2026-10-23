-- Cada color puede tener además una foto posterior (fondo blanco) que cambia junto con la de frente.
-- Aplicada el 23/10/2026 (versión 20261023035845).
alter table public.product_images drop constraint product_images_view_check;
alter table public.product_images add constraint product_images_view_check check (view in ('front', 'back', 'context'));
