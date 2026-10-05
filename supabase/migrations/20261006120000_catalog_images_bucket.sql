-- Bucket público para las fotos de productos y las portadas de categorías.
-- Se lee sin firma (URL pública); solo sube y borra el panel de administración (admin/),
-- que usa la secret key y no necesita políticas. El navegador no puede escribir.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-images', 'catalog-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
