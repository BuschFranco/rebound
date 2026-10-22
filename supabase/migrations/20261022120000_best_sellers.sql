-- "Más vendido": el sitio recibe solo qué productos están en el top de ventas de los últimos 30 días,
-- nunca cantidades ni montos (las ventas siguen siendo privadas). Sin parámetros, para que no se pueda
-- pedir el ranking completo. Hace falta un mínimo de unidades para que una venta suelta no cuente.
create function public.best_sellers() returns table (product_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select i.product_id
  from public.sales s
  cross join lateral jsonb_to_recordset(s.items) as i(product_id text, quantity integer)
  join public.products p on p.id = i.product_id and p.active
  where s.cancelled_at is null
    and s.sold_at >= now() - interval '30 days'
  group by i.product_id
  having sum(i.quantity) >= 3
  order by sum(i.quantity) desc, i.product_id
  limit 3
$$;

revoke all on function public.best_sellers() from public;
grant execute on function public.best_sellers() to anon, authenticated;
