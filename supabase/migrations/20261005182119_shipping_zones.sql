-- Zonas de envío con tarifas propias.
-- Cada zona agrupa áreas de Georef (https://apis.datos.gob.ar/georef): una provincia entera
-- (departamento_id null) o un partido/comuna puntual. Se busca primero por partido y, si no hay,
-- por provincia. Fuera de todas las zonas = "todavía no llegamos".

create table public.shipping_zones (
  id          text primary key check (id ~ '^[a-z0-9-]+$'),
  name        text not null,
  -- Costo de envío en pesos (final, IVA incluido).
  price       integer not null check (price >= 0),
  -- Envío gratis desde este subtotal (null = nunca gratis).
  free_from   integer check (free_from is null or free_from > 0),
  eta_label   text not null,
  sort_order  integer not null default 0,
  active      boolean not null default true
);

create table public.shipping_zone_areas (
  id              bigint generated always as identity primary key,
  zone_id         text not null references public.shipping_zones (id) on delete cascade,
  -- Ids de Georef: provincia de 2 dígitos ("02" CABA, "06" Buenos Aires), departamento de 5.
  provincia_id    text not null check (provincia_id ~ '^[0-9]{2}$'),
  departamento_id text check (departamento_id is null or departamento_id ~ '^[0-9]{5}$'),
  constraint shipping_zone_areas_departamento_in_provincia
    check (departamento_id is null or left(departamento_id, 2) = provincia_id)
);

-- Un mismo partido (o provincia completa) no puede estar en dos zonas.
create unique index shipping_zone_areas_unique_area
  on public.shipping_zone_areas (provincia_id, coalesce(departamento_id, ''));

alter table public.shipping_zones enable row level security;
alter table public.shipping_zone_areas enable row level security;

create policy "Zonas activas visibles para todos"
on public.shipping_zones for select
to anon, authenticated
using (active);

create policy "Áreas de zonas visibles para todos"
on public.shipping_zone_areas for select
to anon, authenticated
using (true);

grant select on public.shipping_zones to anon, authenticated;
grant select on public.shipping_zone_areas to anon, authenticated;
