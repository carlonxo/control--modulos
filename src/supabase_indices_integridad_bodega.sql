-- Paso posterior a la limpieza de duplicados.
-- Impide repetir un codigo dentro del mismo inventario y acelera la carga
-- de los materiales asociados a cada pedido.

begin;

do $$
begin
  if exists (
    select 1
    from public.bodega_inventario_items item
    group by
      item.inventario_id,
      upper(btrim(item.codigo_bodega))
    having count(*) > 1
  ) then
    raise exception 'Todavia existen codigos duplicados en un inventario. No se crearon los indices.';
  end if;
end;
$$;

create unique index if not exists uq_bodega_inventario_items_inventario_codigo_normalizado
on public.bodega_inventario_items (
  inventario_id,
  upper(btrim(codigo_bodega))
);

create index if not exists idx_vales_bodega_items_vale_id
on public.vales_bodega_items (vale_id);

commit;

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'uq_bodega_inventario_items_inventario_codigo_normalizado',
    'idx_vales_bodega_items_vale_id'
  )
order by indexname;
