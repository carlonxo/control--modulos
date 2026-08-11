-- Permisos para que la app pueda marcar pedidos de bodega como entregados.
-- Ejecutar completo en Supabase SQL Editor.

alter table public.vales_bodega
add column if not exists estado_bodega text not null default 'pendiente',
add column if not exists fecha_entrega_bodega timestamp with time zone,
add column if not exists entregado_por text not null default '';

create index if not exists idx_vales_bodega_estado_fecha
on public.vales_bodega (estado_bodega, fecha);

drop policy if exists vales_bodega_select_authenticated
on public.vales_bodega;

create policy vales_bodega_select_authenticated
on public.vales_bodega
for select
to authenticated
using (true);

drop policy if exists vales_bodega_update_estado_authenticated
on public.vales_bodega;

create policy vales_bodega_update_estado_authenticated
on public.vales_bodega
for update
to authenticated
using (true)
with check (true);

