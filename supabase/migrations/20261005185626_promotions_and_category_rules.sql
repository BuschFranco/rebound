-- Promociones por cantidad (NxM) con vigencia de fechas fijas, iguales para todos los clientes
-- (Ley 22.802 de Lealtad Comercial: condiciones y plazo claros). El sitio usa la promo activa
-- vigente o la próxima a empezar.

create table public.promotions (
  id          text primary key check (id ~ '^[a-z0-9-]+$'),
  -- Nombre corto que se muestra en el sitio, ej. "3x2".
  label       text not null,
  -- Por cada `buy` unidades se pagan `pay` (las más baratas de cada grupo salen gratis).
  buy         integer not null check (buy >= 2),
  pay         integer not null check (pay >= 1),
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint promotions_pay_lt_buy check (pay < buy),
  constraint promotions_dates check (ends_at > starts_at)
);

create index promotions_window_idx on public.promotions (starts_at, ends_at) where active;

alter table public.promotions enable row level security;

create policy "Promociones activas visibles para todos"
on public.promotions for select
to anon, authenticated
using (active);

grant select on public.promotions to anon, authenticated;

-- Reglas por categoría (antes estaban en el código).
alter table public.categories
  -- Qué guía de talles muestra la ficha: ropa (altura/peso), calzado (largo de pie) o ninguna.
  add column size_guide text not null default 'none' check (size_guide in ('apparel', 'shoes', 'none')),
  -- Categorías que se sugieren en "Completá el look" cuando hay un producto de esta en el carrito.
  add column complements text[] not null default '{}';
