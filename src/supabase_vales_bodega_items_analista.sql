-- Permite al rol analista editar materiales de pedidos pendientes.
-- La app reemplaza las filas del pedido con DELETE seguido de INSERT.
-- Ejecutar en el SQL Editor del proyecto Supabase usado por la app.

drop policy if exists vales_bodega_items_delete_analista
on public.vales_bodega_items;

create policy vales_bodega_items_delete_analista
on public.vales_bodega_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    join public.vales_bodega v on v.id = vales_bodega_items.vale_id
    where p.id = auth.uid()
      and p.rol = 'analista'
      and v.tipo_ingreso = 'pedido_app'
      and coalesce(v.estado_bodega, 'pendiente') = 'pendiente'
  )
);

drop policy if exists vales_bodega_items_insert_analista
on public.vales_bodega_items;

create policy vales_bodega_items_insert_analista
on public.vales_bodega_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.perfiles p
    join public.vales_bodega v on v.id = vales_bodega_items.vale_id
    where p.id = auth.uid()
      and p.rol = 'analista'
      and v.tipo_ingreso = 'pedido_app'
      and coalesce(v.estado_bodega, 'pendiente') = 'pendiente'
  )
);
