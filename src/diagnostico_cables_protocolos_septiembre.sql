-- Suma exclusivamente las cantidades registradas en protocolos de septiembre de 2026.
-- Incluye mantencion y modificacion, material nuevo y reutilizado, sin depender del precio.
with protocolos as (
  select 'modulos'::text as origen, id::text, serie, fecha_prueba_electrica, protocolo_entrega, materiales
  from public.modulos

  union all

  select 'historial_modulos'::text, id::text, serie, fecha_prueba_electrica, protocolo_entrega, materiales
  from public.historial_modulos

  union all

  select 'protocolos_manuales'::text, id::text, serie, fecha_prueba_electrica, protocolo_entrega, materiales
  from public.protocolos_manuales
),
protocolos_con_fecha as (
  select
    *,
    case
      when protocolo_entrega->>'fecha' ~ '^\d{4}-\d{2}-\d{2}$'
        then (protocolo_entrega->>'fecha')::date
      else fecha_prueba_electrica::date
    end as fecha_protocolo
  from protocolos
),
cables(material, clave_json) as (
  values
    ('Cable RZ1 2,5mm', 'Cable RZ1 2,5mm'),
    ('Cable RZ1 4mm',   'Cable RZ1 4mm'),
    ('Cable RZ1 6mm',   'Cable RZ1 6mm')
),
campos as (
  select
    p.origen,
    p.id,
    p.serie,
    p.fecha_protocolo,
    c.material,
    v.tipo,
    case
      when coalesce(p.protocolo_entrega->'detalleMateriales'->c.clave_json->>'mantencion', '') <> ''
        or coalesce(p.protocolo_entrega->'detalleMateriales'->c.clave_json->>'modificacion', '') <> ''
        then coalesce(p.protocolo_entrega->'detalleMateriales'->c.clave_json->>v.tipo, '')
      when v.tipo = 'mantencion' and jsonb_typeof(p.materiales->c.clave_json) = 'object'
        then concat_ws(
          ' / ',
          nullif(p.materiales->c.clave_json->>'nuevo', ''),
          case
            when nullif(p.materiales->c.clave_json->>'reutilizado', '') is not null
              then (p.materiales->c.clave_json->>'reutilizado') || ' R'
          end
        )
      when v.tipo = 'mantencion'
        then coalesce(p.materiales->>c.clave_json, '')
      else ''
    end as valor
  from protocolos_con_fecha p
  cross join cables c
  cross join (values ('mantencion'), ('modificacion')) as v(tipo)
  where p.fecha_protocolo >= date '2026-09-01'
    and p.fecha_protocolo < date '2026-10-01'
),
cantidades as (
  select
    c.*,
    (coincidencia.numero)[1]::numeric as cantidad
  from campos c
  cross join lateral regexp_matches(
    replace(c.valor, ',', '.'),
    '-?[0-9]+(?:\.[0-9]+)?',
    'g'
  ) as coincidencia(numero)
)
select
  material,
  coalesce(sum(cantidad), 0) as cantidad_total_protocolos,
  count(distinct origen || ':' || id) as protocolos_con_cantidad,
  count(distinct serie) as series_con_cantidad
from cantidades
group by material
order by material;
