-- Tipos de promoción. Pueden convivir varias a la vez:
--   nxm            llevá N, pagá M (las más baratas de cada grupo, en toda la tienda)
--   nth_discount   % de descuento en la N-ésima unidad: del mismo producto o dentro de categorías elegidas
--   free_shipping  envío gratis: en productos elegidos, desde un monto o llevando X unidades
-- Las de envío gratis se suman a las de descuento; si hay varios descuentos vigentes no se acumulan:
-- el carrito aplica el que más ahorra (eso lo calcula el sitio, src/lib/promo.ts).

alter table public.promotions
  add column kind text not null default 'nxm' check (kind in ('nxm', 'nth_discount', 'free_shipping')),
  add column nth integer,
  add column percent integer,
  add column scope text,
  add column category_slugs text[] not null default '{}',
  add column shipping_rule text,
  add column product_ids text[] not null default '{}',
  add column min_amount integer,
  add column min_units integer,
  alter column buy drop not null,
  alter column pay drop not null,
  drop constraint promotions_pay_lt_buy,
  drop constraint promotions_buy_check,
  drop constraint promotions_pay_check;

alter table public.promotions
  add constraint promotions_nxm check (
    kind <> 'nxm' or (buy >= 2 and pay >= 1 and pay < buy)
  ),
  add constraint promotions_nth_discount check (
    kind <> 'nth_discount' or (
      nth >= 2 and percent between 1 and 100
      and scope in ('same_product', 'categories')
      and (scope <> 'categories' or cardinality(category_slugs) > 0)
    )
  ),
  add constraint promotions_free_shipping check (
    kind <> 'free_shipping' or (
      (shipping_rule = 'products' and cardinality(product_ids) > 0)
      or (shipping_rule = 'min_amount' and min_amount > 0)
      or (shipping_rule = 'min_units' and min_units >= 1)
    )
  );
