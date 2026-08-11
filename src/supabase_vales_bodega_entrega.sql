alter table public.vales_bodega
add column if not exists estado_bodega text not null default 'pendiente',
add column if not exists fecha_entrega_bodega timestamp with time zone,
add column if not exists entregado_por text not null default '';

create index if not exists idx_vales_bodega_estado_fecha
on public.vales_bodega (estado_bodega, fecha);
