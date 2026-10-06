-- Talles sin stock: se siguen mostrando (tachados, "Agotado") pero no se pueden pedir.
-- Se marcan y desmarcan desde el panel sin borrar el talle de `sizes`.

alter table public.products
  add column sold_out_sizes text[] not null default '{}',
  -- Solo talles que existen en el producto.
  add constraint products_sold_out_sizes_subset check (sold_out_sizes <@ sizes);
