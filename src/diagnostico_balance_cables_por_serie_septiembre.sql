-- Cruza los retiros de bodega de septiembre de 2026 con las cantidades
-- registradas en protocolos, usando la serie y sin depender de precios.
with parametros as (
  select date '2026-09-01' as inicio, date '2026-10-01' as fin
),
protocolos as (
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
    p.*,
    upper(regexp_replace(trim(coalesce(p.serie, p.protocolo_entrega->>'serie', '')), '\s+', '', 'g')) as serie_normalizada,
    case
      when p.protocolo_entrega->>'fecha' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        then (p.protocolo_entrega->>'fecha')::date
      else p.fecha_prueba_electrica::date
    end as fecha_protocolo
  from protocolos p
),
existencia_protocolos as (
  select
    p.serie_normalizada,
    count(*) filter (where p.fecha_protocolo >= x.inicio and p.fecha_protocolo < x.fin) as protocolos_mes,
    count(*) filter (where p.fecha_protocolo < x.inicio or p.fecha_protocolo >= x.fin) as protocolos_otro_mes,
    string_agg(distinct p.fecha_protocolo::text, ', ' order by p.fecha_protocolo::text)
      filter (where p.fecha_protocolo >= x.inicio and p.fecha_protocolo < x.fin) as fechas_protocolos_mes,
    string_agg(distinct p.fecha_protocolo::text, ', ' order by p.fecha_protocolo::text)
      filter (where p.fecha_protocolo < x.inicio or p.fecha_protocolo >= x.fin) as fechas_protocolos_otro_mes
  from protocolos_con_fecha p
  cross join parametros x
  where p.serie_normalizada <> ''
  group by p.serie_normalizada
),
cables(material, clave_json) as (
  values
    ('Cable RZ1 2,5mm', 'Cable RZ1 2,5mm'),
    ('Cable RZ1 4mm',   'Cable RZ1 4mm'),
    ('Cable RZ1 6mm',   'Cable RZ1 6mm')
),
campos_protocolo as (
  select
    p.origen,
    p.id,
    p.serie_normalizada,
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
),
cantidades_protocolo as (
  select
    c.origen,
    c.id,
    c.serie_normalizada,
    c.fecha_protocolo,
    c.material,
    (coincidencia.numero)[1]::numeric as cantidad
  from campos_protocolo c
  cross join lateral regexp_matches(
    replace(c.valor, ',', '.'),
    '-?[0-9]+(?:\.[0-9]+)?',
    'g'
  ) as coincidencia(numero)
),
protocolos_por_serie as (
  select
    c.material,
    c.serie_normalizada,
    coalesce(sum(c.cantidad) filter (
      where c.fecha_protocolo >= x.inicio and c.fecha_protocolo < x.fin
    ), 0) as cantidad_protocolo_mes,
    coalesce(sum(c.cantidad) filter (
      where c.fecha_protocolo < x.inicio or c.fecha_protocolo >= x.fin
    ), 0) as cantidad_protocolo_otro_mes
  from cantidades_protocolo c
  cross join parametros x
  group by c.material, c.serie_normalizada
),
retiros_base as (
  select
    i.id,
    i.fecha,
    upper(regexp_replace(trim(coalesce(nullif(i.serie, ''), nullif(v.serie, ''), '')), '\s+', '', 'g')) as serie_normalizada,
    i.material_vale,
    i.material_balance,
    i.cantidad::numeric as cantidad,
    coalesce(i.tipo_ingreso, v.tipo_ingreso, '') as tipo_ingreso,
    v.estado_bodega
  from public.vales_bodega_items i
  left join public.vales_bodega v on v.id = i.vale_id
  cross join parametros x
  where i.fecha >= x.inicio
    and i.fecha < x.fin
    and coalesce(i.tipo_ingreso, v.tipo_ingreso, '') = 'pedido_app'
    and coalesce(v.estado_bodega, 'entregado') = 'entregado'
),
retiros_cables as (
  select
    r.*,
    case
      when r.material_balance ~* 'CABLE.*RZ[ -]*1.*2[,.]5[[:space:]]*MM' then 'Cable RZ1 2,5mm'
      when r.material_balance ~* 'CABLE.*RZ[ -]*1.*4([,.]0)?[[:space:]]*MM'
        and r.material_balance !~ '\*' then 'Cable RZ1 4mm'
      when r.material_balance ~* 'CABLE.*RZ[ -]*1.*6([,.]0)?[[:space:]]*MM'
        and r.material_balance !~ '\*' then 'Cable RZ1 6mm'
      else null
    end as material
  from retiros_base r
),
retiros_por_serie as (
  select
    material,
    serie_normalizada,
    sum(cantidad) as cantidad_retirada
  from retiros_cables
  where material is not null
  group by material, serie_normalizada
),
balance as (
  select
    coalesce(r.material, p.material) as material,
    coalesce(nullif(r.serie_normalizada, ''), nullif(p.serie_normalizada, ''), '(SIN SERIE)') as serie,
    coalesce(r.cantidad_retirada, 0) as cantidad_retirada,
    coalesce(p.cantidad_protocolo_mes, 0) as cantidad_protocolo_mes,
    coalesce(r.cantidad_retirada, 0) - coalesce(p.cantidad_protocolo_mes, 0) as diferencia,
    coalesce(p.cantidad_protocolo_otro_mes, 0) as cantidad_protocolo_otro_mes,
    coalesce(e.protocolos_mes, 0) as protocolos_mes,
    coalesce(e.protocolos_otro_mes, 0) as protocolos_otro_mes,
    e.fechas_protocolos_mes,
    e.fechas_protocolos_otro_mes,
    case
      when r.material is null and coalesce(p.cantidad_protocolo_mes, 0) <> 0
        then 'PROTOCOLO SIN RETIRO DEL MES'
      when r.serie_normalizada = '' then 'SIN SERIE UTILIZABLE'
      when coalesce(p.cantidad_protocolo_mes, 0) = r.cantidad_retirada then 'COINCIDE'
      when coalesce(p.cantidad_protocolo_mes, 0) > r.cantidad_retirada then 'PROTOCOLO SUPERIOR AL RETIRO'
      when coalesce(p.cantidad_protocolo_mes, 0) > 0 then 'PROTOCOLO INFERIOR AL RETIRO'
      when coalesce(e.protocolos_mes, 0) > 0 then 'PROTOCOLO DEL MES SIN ESTE CABLE'
      when coalesce(p.cantidad_protocolo_otro_mes, 0) > 0 then 'CABLE REGISTRADO EN OTRO MES'
      when coalesce(e.protocolos_otro_mes, 0) > 0 then 'PROTOCOLO SOLO EN OTRO MES'
      else 'SIN PROTOCOLO'
    end as clasificacion
  from retiros_por_serie r
  full outer join protocolos_por_serie p
    on p.material = r.material
   and p.serie_normalizada = r.serie_normalizada
  left join existencia_protocolos e
    on e.serie_normalizada = coalesce(r.serie_normalizada, p.serie_normalizada)
  where r.material is not null
     or coalesce(p.cantidad_protocolo_mes, 0) <> 0
)
select
  material,
  clasificacion,
  count(*) as series_afectadas,
  sum(cantidad_retirada) as total_retirado,
  sum(cantidad_protocolo_mes) as total_protocolo_mes,
  sum(diferencia) as diferencia,
  sum(cantidad_protocolo_otro_mes) as total_protocolo_otro_mes,
  string_agg(
    serie || ' (ret ' || cantidad_retirada || ', prot ' || cantidad_protocolo_mes || ')',
    ' | ' order by diferencia desc, serie
  ) as detalle_series
from balance
group by material, clasificacion
order by material, diferencia desc;
