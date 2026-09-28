-- Agrega la linea a las series con retiros de cable RZ1 6 mm en septiembre de 2026.
with balance(serie, retirado, protocolizado) as (
  values
    ('202148318',  400::numeric, 20::numeric),
    ('201528832',  300::numeric, 20::numeric),
    ('202255935',  300::numeric, 20::numeric),
    ('202148958',  300::numeric, 22::numeric),
    ('1402361307', 300::numeric, 25::numeric),
    ('202666636',  200::numeric,  0::numeric),
    ('102360685',  200::numeric, 20::numeric),
    ('20076810',   200::numeric, 20::numeric),
    ('202151829',  100::numeric,  0::numeric),
    ('102360656',  100::numeric, 20::numeric),
    ('102360681',  100::numeric, 20::numeric),
    ('102360701',  100::numeric, 20::numeric)
),
ubicaciones as (
  select
    upper(regexp_replace(trim(coalesce(serie, protocolo_entrega->>'serie', '')), '\s+', '', 'g')) as serie,
    coalesce(nullif(linea::text, ''), nullif(protocolo_entrega->>'linea', '')) as linea
  from public.modulos

  union all

  select
    upper(regexp_replace(trim(coalesce(serie, protocolo_entrega->>'serie', '')), '\s+', '', 'g')),
    coalesce(nullif(linea::text, ''), nullif(protocolo_entrega->>'linea', ''))
  from public.historial_modulos

  union all

  select
    upper(regexp_replace(trim(coalesce(serie, protocolo_entrega->>'serie', '')), '\s+', '', 'g')),
    nullif(protocolo_entrega->>'linea', '')
  from public.protocolos_manuales
),
lineas_por_serie as (
  select
    serie,
    string_agg(distinct linea, ', ' order by linea) filter (where linea is not null) as linea
  from ubicaciones
  group by serie
)
select
  b.serie,
  coalesce(l.linea, 'SIN LINEA REGISTRADA') as linea,
  b.retirado,
  b.protocolizado,
  b.retirado - b.protocolizado as diferencia
from balance b
left join lineas_por_serie l on l.serie = b.serie
order by diferencia desc, b.serie;
