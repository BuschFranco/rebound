-- Registro anónimo de pedidos enviados por WhatsApp (para saber qué se vende), sin datos personales:
-- solo productos, talles, colores, cantidades, montos, zona de envío y partido.
-- Se guarda cuando el cliente toca "Comprar por WhatsApp" (después de verificar el pedido en el servidor).

create table public.order_intents (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  -- [{ "product_id", "name", "size", "color", "quantity", "price" }]
  items        jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  units        integer not null check (units > 0),
  total        integer not null check (total >= 0),
  promo_label  text,
  zone_name    text,
  partido      text
);

create index order_intents_created_idx on public.order_intents (created_at desc);

-- Nadie lee ni modifica desde el sitio (sin políticas): solo el panel, con la secret key.
alter table public.order_intents enable row level security;

-- El sitio solo puede INSERTAR a través de esta función, que valida y limita lo que entra.
create function public.log_order_intent(
  p_items jsonb,
  p_total integer,
  p_promo_label text default null,
  p_zone_name text default null,
  p_partido text default null
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

  insert into public.order_intents (items, units, total, promo_label, zone_name, partido)
  values (p_items, v_units, p_total, left(p_promo_label, 120), left(p_zone_name, 80), left(p_partido, 80));
end;
$$;

revoke all on function public.log_order_intent(jsonb, integer, text, text, text) from public;
grant execute on function public.log_order_intent(jsonb, integer, text, text, text) to anon, authenticated;
