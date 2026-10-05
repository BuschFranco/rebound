-- "Nuevo" deja de ser un tilde manual: se calcula con la fecha de publicación.
-- Un producto se muestra como nuevo durante los primeros días desde `published_at`
-- (el plazo se configura en el código: NEW_PRODUCT_DAYS en src/data/business.ts).

alter table public.products
  add column published_at timestamptz not null default now();

-- Conservar lo que había: los marcados como nuevos quedan publicados hace poco, el resto antes.
update public.products
set published_at = case when is_new then now() - interval '7 days' else now() - interval '120 days' end;

alter table public.products drop column is_new;

create index products_published_idx on public.products (published_at desc) where active;
