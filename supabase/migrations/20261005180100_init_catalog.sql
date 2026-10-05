-- Catálogo de REBOUND: categorías y productos.
-- El sitio solo lee (rol anon). Las altas, bajas y cambios se hacen desde Supabase Studio
-- o con la service role key, nunca desde el navegador.

create table public.categories (
  slug        text primary key check (slug ~ '^[a-z0-9-]+$'),
  label       text not null,
  image_url   text not null,
  sort_order  integer not null default 0
);

create table public.products (
  id               text primary key default gen_random_uuid()::text,
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name             text not null,
  description      text not null default '',
  category_slug    text not null references public.categories (slug) on update cascade,
  -- Precios en pesos argentinos, finales (IVA incluido), sin decimales.
  price            integer not null check (price > 0),
  compare_at_price integer check (compare_at_price is null or compare_at_price > price),
  images           text[] not null check (cardinality(images) > 0),
  sizes            text[] not null check (cardinality(sizes) > 0),
  -- [{ "name": "Negro", "hex": "#111111" }, ...]
  colors           jsonb not null check (jsonb_typeof(colors) = 'array' and jsonb_array_length(colors) > 0),
  -- 3 beneficios cortos que responden las dudas típicas antes de comprar.
  highlights       text[] not null default '{}',
  is_new           boolean not null default false,
  -- Ocultar un producto sin borrarlo (los carritos guardados lo ignoran).
  active           boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index products_category_idx on public.products (category_slug) where active;
create index products_sort_idx on public.products (sort_order, created_at);

-- updated_at automático.
create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- Seguridad: lectura pública de lo visible, sin escritura desde el cliente.
alter table public.categories enable row level security;
alter table public.products enable row level security;

create policy "Categorías visibles para todos"
on public.categories for select
to anon, authenticated
using (true);

create policy "Productos activos visibles para todos"
on public.products for select
to anon, authenticated
using (active);

grant select on public.categories to anon, authenticated;
grant select on public.products to anon, authenticated;
