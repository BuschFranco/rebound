-- Stock por talle y color, compras, ventas reales y costos (para calcular la ganancia en el panel).
--
-- Privado: las tablas nuevas tienen RLS sin políticas, así que solo el panel (secret key) las lee.
-- Al sitio le llega únicamente products.stock_status: qué variantes están en 0 o en 1, nunca cantidades ni costos.

-- ---------- Ventas ----------
create table public.sales (
  id               bigint generated always as identity primary key,
  created_at       timestamptz not null default now(),
  sold_at          timestamptz not null default now(),
  source           text not null check (source in ('web', 'manual')),
  order_intent_id  bigint references public.order_intents (id) on delete set null,
  -- [{ "product_id", "name", "color", "size", "quantity", "price", "unit_cost" }]
  -- price = cobrado por unidad (con la promo ya descontada); unit_cost = costo promedio al momento de vender.
  items            jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  -- Cobrado por productos, sin envío.
  revenue          integer not null check (revenue >= 0),
  cost             integer not null check (cost >= 0),
  note             text,
  cancelled_at     timestamptz
);

create index sales_sold_at_idx on public.sales (sold_at desc);
alter table public.sales enable row level security;

-- ---------- Movimientos de stock (el stock de cada variante es la suma) ----------
create table public.inventory_movements (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  happened_at  timestamptz not null default now(),
  product_id   text not null references public.products (id) on delete cascade on update cascade,
  color        text not null,
  size         text not null,
  -- Positivo entra (compra, devolución), negativo sale (venta, rotura).
  quantity     integer not null check (quantity <> 0),
  kind         text not null check (kind in ('purchase', 'sale', 'adjust', 'return')),
  -- Costo por unidad: en compras es lo que pagaste; en ventas, el costo promedio de ese momento.
  unit_cost    integer check (unit_cost is null or unit_cost >= 0),
  sale_id      bigint references public.sales (id) on delete cascade,
  note         text,
  constraint inventory_movements_purchase_cost check (kind <> 'purchase' or (unit_cost is not null and quantity > 0))
);

create index inventory_movements_product_idx on public.inventory_movements (product_id, happened_at);
alter table public.inventory_movements enable row level security;

-- ---------- Pedidos de la web: estado y montos separados ----------
alter table public.order_intents
  add column status   text not null default 'pending' check (status in ('pending', 'sold', 'cancelled')),
  add column subtotal integer check (subtotal is null or subtotal >= 0),
  add column discount integer check (discount is null or discount >= 0),
  add column shipping integer check (shipping is null or shipping >= 0),
  add column sale_id  bigint references public.sales (id) on delete set null;

drop function public.log_order_intent(jsonb, integer, text, text, text);

create function public.log_order_intent(
  p_items jsonb,
  p_total integer,
  p_promo_label text default null,
  p_zone_name text default null,
  p_partido text default null,
  p_subtotal integer default null,
  p_discount integer default null,
  p_shipping integer default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_units integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'items inválidos';
  end if;
  if p_total is null or p_total < 0 or p_total > 100000000 then
    raise exception 'total inválido';
  end if;
  select coalesce(sum(least(greatest((i ->> 'quantity')::integer, 0), 999)), 0)
    into v_units
    from jsonb_array_elements(p_items) as i;
  if v_units = 0 then
    raise exception 'pedido vacío';
  end if;

  insert into public.order_intents (items, units, total, promo_label, zone_name, partido, subtotal, discount, shipping)
  values (
    p_items, v_units, p_total, left(p_promo_label, 120), left(p_zone_name, 80), left(p_partido, 80),
    case when p_subtotal between 0 and 100000000 then p_subtotal end,
    case when p_discount between 0 and 100000000 then p_discount end,
    case when p_shipping between 0 and 100000000 then p_shipping end
  );
end;
$$;

revoke all on function public.log_order_intent(jsonb, integer, text, text, text, integer, integer, integer) from public;
grant execute on function public.log_order_intent(jsonb, integer, text, text, text, integer, integer, integer)
  to anon, authenticated;

-- ---------- Lo que ve el sitio: variantes en 0 o en 1 ----------
-- {"tracked": false} = el producto no usa control de stock (talles agotados a mano, como siempre).
-- {"tracked": true, "low": {"Negro|M": 0, "Negro|L": 1}} = desde su primer movimiento;
-- toda variante sin unidades cuenta como 0.
alter table public.products
  add column stock_status jsonb not null default '{"tracked": false, "low": {}}'::jsonb;

create function public.compute_stock_status(p_id text, p_sizes text[], p_colors jsonb) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with variants as (
    select c ->> 'name' as color, s as size
    from jsonb_array_elements(p_colors) as c, unnest(p_sizes) as s
  ),
  stock as (
    select v.color, v.size, coalesce(sum(m.quantity), 0) as qty
    from variants v
    left join public.inventory_movements m on m.product_id = p_id and m.color = v.color and m.size = v.size
    group by v.color, v.size
  )
  select case
    when exists (select 1 from public.inventory_movements where product_id = p_id) then
      jsonb_build_object(
        'tracked', true,
        'low', coalesce((select jsonb_object_agg(color || '|' || size, greatest(qty, 0)) from stock where qty <= 1), '{}'::jsonb)
      )
    else '{"tracked": false, "low": {}}'::jsonb
  end
$$;

revoke all on function public.compute_stock_status(text, text[], jsonb) from public, anon, authenticated;

-- Al moverse el stock, se recalcula el estado del producto.
create function public.inventory_movements_refresh() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(new.product_id, old.product_id);
begin
  update public.products p
     set stock_status = public.compute_stock_status(p.id, p.sizes, p.colors)
   where p.id = v_id;
  if tg_op = 'UPDATE' and old.product_id is distinct from new.product_id then
    update public.products p
       set stock_status = public.compute_stock_status(p.id, p.sizes, p.colors)
     where p.id = old.product_id;
  end if;
  return null;
end;
$$;

create trigger inventory_movements_refresh
after insert or update or delete on public.inventory_movements
for each row execute function public.inventory_movements_refresh();

-- Si cambian los talles o colores del producto, también (un talle nuevo arranca en 0).
create function public.products_refresh_stock_status() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.stock_status := public.compute_stock_status(new.id, new.sizes, new.colors);
  return new;
end;
$$;

create trigger products_refresh_stock_status
before update of sizes, colors on public.products
for each row
when (old.sizes is distinct from new.sizes or old.colors is distinct from new.colors)
execute function public.products_refresh_stock_status();

-- ---------- Operaciones del panel (todo o nada) ----------

-- Compra: { "happened_at", "product_id", "unit_cost", "note", "items": [{ "color", "size", "quantity" }] }
create function public.record_purchase(p jsonb) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if jsonb_typeof(p -> 'items') <> 'array' or jsonb_array_length(p -> 'items') = 0 then
    raise exception 'La compra no tiene unidades.';
  end if;
  insert into public.inventory_movements (happened_at, product_id, color, size, quantity, kind, unit_cost, note)
  select coalesce((p ->> 'happened_at')::timestamptz, now()), p ->> 'product_id', i ->> 'color', i ->> 'size',
         (i ->> 'quantity')::integer, 'purchase', (p ->> 'unit_cost')::integer, nullif(p ->> 'note', '')
  from jsonb_array_elements(p -> 'items') as i
  where (i ->> 'quantity')::integer > 0;
end;
$$;

-- Ajuste (rotura, pérdida, conteo): { "product_id", "note", "items": [{ "color", "size", "quantity" (+/-) }] }
create function public.adjust_stock(p jsonb) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(trim(p ->> 'note'), '') = '' then
    raise exception 'El ajuste necesita un motivo.';
  end if;
  insert into public.inventory_movements (product_id, color, size, quantity, kind, note)
  select p ->> 'product_id', i ->> 'color', i ->> 'size', (i ->> 'quantity')::integer, 'adjust', p ->> 'note'
  from jsonb_array_elements(p -> 'items') as i
  where (i ->> 'quantity')::integer <> 0;
end;
$$;

-- Venta: { "sold_at", "source", "order_intent_id", "revenue", "note",
--          "items": [{ "product_id", "name", "color", "size", "quantity", "price", "unit_cost" }] }
create function public.record_sale(p jsonb) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_sold_at timestamptz := coalesce((p ->> 'sold_at')::timestamptz, now());
  v_intent bigint := (p ->> 'order_intent_id')::bigint;
begin
  if jsonb_typeof(p -> 'items') <> 'array' or jsonb_array_length(p -> 'items') = 0 then
    raise exception 'La venta no tiene productos.';
  end if;
  if v_intent is not null and exists (
    select 1 from public.order_intents where id = v_intent and status = 'sold'
  ) then
    raise exception 'Ese pedido ya está registrado como vendido.';
  end if;

  insert into public.sales (sold_at, source, order_intent_id, items, revenue, cost, note)
  values (
    v_sold_at, p ->> 'source', v_intent, p -> 'items', (p ->> 'revenue')::integer,
    (select coalesce(sum((i ->> 'quantity')::integer * coalesce((i ->> 'unit_cost')::integer, 0)), 0)
       from jsonb_array_elements(p -> 'items') as i),
    nullif(p ->> 'note', '')
  )
  returning id into v_id;

  -- Los productos que ya no existen quedan en la venta (para la ganancia) pero no mueven stock.
  insert into public.inventory_movements (happened_at, product_id, color, size, quantity, kind, unit_cost, sale_id)
  select v_sold_at, i ->> 'product_id', i ->> 'color', i ->> 'size', -(i ->> 'quantity')::integer, 'sale',
         (i ->> 'unit_cost')::integer, v_id
  from jsonb_array_elements(p -> 'items') as i
  where (i ->> 'quantity')::integer > 0
    and exists (select 1 from public.products where id = i ->> 'product_id');

  if v_intent is not null then
    update public.order_intents set status = 'sold', sale_id = v_id where id = v_intent;
  end if;
  return v_id;
end;
$$;

-- Anular una venta: el stock vuelve y el pedido de la web queda pendiente otra vez.
create function public.cancel_sale(p_id bigint) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sales set cancelled_at = now() where id = p_id and cancelled_at is null;
  if not found then
    raise exception 'La venta no existe o ya estaba anulada.';
  end if;
  insert into public.inventory_movements (product_id, color, size, quantity, kind, unit_cost, sale_id, note)
  select product_id, color, size, -quantity, 'return', unit_cost, p_id, 'Venta anulada'
  from public.inventory_movements
  where sale_id = p_id and kind = 'sale';
  update public.order_intents set status = 'pending', sale_id = null where sale_id = p_id;
end;
$$;

-- Solo el panel (secret key = service_role) puede usarlas.
revoke all on function public.record_purchase(jsonb) from public, anon, authenticated;
revoke all on function public.adjust_stock(jsonb) from public, anon, authenticated;
revoke all on function public.record_sale(jsonb) from public, anon, authenticated;
revoke all on function public.cancel_sale(bigint) from public, anon, authenticated;
revoke all on function public.inventory_movements_refresh() from public, anon, authenticated;
revoke all on function public.products_refresh_stock_status() from public, anon, authenticated;
grant execute on function public.record_purchase(jsonb) to service_role;
grant execute on function public.adjust_stock(jsonb) to service_role;
grant execute on function public.record_sale(jsonb) to service_role;
grant execute on function public.cancel_sale(bigint) to service_role;
