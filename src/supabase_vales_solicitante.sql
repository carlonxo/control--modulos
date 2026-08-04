alter table public.vales_bodega
add column if not exists serie text,
add column if not exists solicitante_id uuid null,
add column if not exists solicitante_nombre text,
add column if not exists tipo_ingreso text default 'archivo',
add column if not exists observacion text;

alter table public.vales_bodega_items
add column if not exists serie text,
add column if not exists solicitante_id uuid null,
add column if not exists solicitante_nombre text,
add column if not exists tipo_ingreso text default 'archivo';

update public.vales_bodega
set
  solicitante_nombre = coalesce(nullif(solicitante_nombre, ''), 'No asignado'),
  tipo_ingreso = coalesce(nullif(tipo_ingreso, ''), 'archivo')
where solicitante_nombre is null
   or solicitante_nombre = ''
   or tipo_ingreso is null
   or tipo_ingreso = '';

update public.vales_bodega_items i
set
  serie = coalesce(nullif(i.serie, ''), nullif(v.serie, '')),
  solicitante_id = coalesce(i.solicitante_id, v.solicitante_id),
  solicitante_nombre = coalesce(nullif(i.solicitante_nombre, ''), nullif(v.solicitante_nombre, ''), 'No asignado'),
  tipo_ingreso = coalesce(nullif(i.tipo_ingreso, ''), nullif(v.tipo_ingreso, ''), 'archivo')
from public.vales_bodega v
where i.vale_id = v.id
  and (
    i.solicitante_nombre is null
    or i.solicitante_nombre = ''
    or i.tipo_ingreso is null
    or i.tipo_ingreso = ''
    or i.serie is null
    or i.serie = ''
  );
