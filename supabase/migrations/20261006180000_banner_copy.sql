-- Textos e imagen de los banners de la home, editables desde el panel.
-- Vacío (null) = se usa el texto automático del sitio. Se pueden usar variables:
--   promos:  {etiqueta} {vigencia}
--   ofertas: {descuento} {cantidad}

alter table public.promotions
  add column banner_eyebrow text,
  add column banner_title text,
  add column banner_text text,
  add column banner_cta text,
  add column banner_image_url text;

-- Banners que no dependen de una promo (por ahora, el de ofertas). Una fila por banner.
create table public.site_banners (
  id         text primary key check (id in ('offers')),
  eyebrow    text,
  title      text,
  text       text,
  cta        text,
  image_url  text,
  updated_at timestamptz not null default now()
);

alter table public.site_banners enable row level security;

create policy "Banners visibles para todos"
on public.site_banners for select
to anon, authenticated
using (true);

grant select on public.site_banners to anon, authenticated;

insert into public.site_banners (id) values ('offers') on conflict do nothing;
