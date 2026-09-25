-- Elimina las filas duplicadas conocidas del inventario.
-- Criterio:
--   1. Conserva primero la fila que tenga actividad o saldo distinto de cero.
--   2. Si todas estan en cero, conserva la de menor fila_excel.
--   3. Nunca elimina automaticamente una segunda fila con valores distintos de cero.

begin;

with filas_ordenadas as (
  select
    item.id,
    item.inventario_id,
    item.codigo_bodega,
    row_number() over (
      partition by item.inventario_id, item.codigo_bodega
      order by
        case when
          coalesce(item.entradas, 0) <> 0
          or coalesce(item.salidas, 0) <> 0
          or coalesce(item.saldo_inicial, 0) <> 0
          or coalesce(item.stock_container, 0) <> 0
          or coalesce(item.saldo_final, 0) <> 0
        then 0 else 1 end,
        item.fila_excel asc nulls last,
        item.creado_en asc,
        item.id asc
    ) as posicion
  from public.bodega_inventario_items item
  where item.codigo_bodega in (
    'MHMHER0153',
    'MHMHER0289',
    'MMSMSA0023',
    'MMSMSB0029',
    'MMZMZD0013',
    'OOAOAB0036'
  )
), filas_eliminables as (
  select ordenada.id
  from filas_ordenadas ordenada
  join public.bodega_inventario_items item on item.id = ordenada.id
  where ordenada.posicion > 1
    and coalesce(item.entradas, 0) = 0
    and coalesce(item.salidas, 0) = 0
    and coalesce(item.saldo_inicial, 0) = 0
    and coalesce(item.stock_container, 0) = 0
    and coalesce(item.saldo_final, 0) = 0
)
delete from public.bodega_inventario_items item
using filas_eliminables eliminable
where item.id = eliminable.id;

do $$
begin
  if exists (
    select 1
    from public.bodega_inventario_items item
    group by item.inventario_id, item.codigo_bodega
    having count(*) > 1
  ) then
    raise exception 'Aun existen codigos duplicados. No se aplicaron cambios.';
  end if;
end;
$$;

commit;

select
  item.codigo_bodega,
  item.descripcion,
  item.entradas,
  item.salidas,
  item.saldo_final,
  item.fila_excel
from public.bodega_inventario_items item
where item.codigo_bodega in (
  'MHMHER0153',
  'MHMHER0289',
  'MMSMSA0023',
  'MMSMSB0029',
  'MMZMZD0013',
  'OOAOAB0036'
)
order by item.codigo_bodega;
