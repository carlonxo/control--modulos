-- Corrige registros de garantía creados con la fecha de la prueba anterior.
-- La prueba anterior se conserva como referencia y la fecha del protocolo pasa
-- a ser la fecha de ingreso del nuevo ciclo del módulo.

begin;

update public.modulos
set protocolo_entrega = jsonb_set(
      jsonb_set(
        coalesce(protocolo_entrega, '{}'::jsonb),
        '{fecha_prueba_anterior_garantia}',
        to_jsonb(coalesce(
          nullif(protocolo_entrega->>'fecha_prueba_anterior_garantia', ''),
          fecha_prueba_electrica::date::text
        )),
        true
      ),
      '{fecha}',
      to_jsonb(fecha_ingreso::date::text),
      true
    ),
    fecha_prueba_electrica = fecha_ingreso
where fecha_ingreso is not null
  and fecha_prueba_electrica is not null
  and lower(btrim(coalesce(estado, protocolo_entrega->>'estado', ''))) in ('en garantia', 'en garantía')
  and fecha_prueba_electrica::date <> fecha_ingreso::date;

update public.historial_modulos
set protocolo_entrega = jsonb_set(
      jsonb_set(
        coalesce(protocolo_entrega, '{}'::jsonb),
        '{fecha_prueba_anterior_garantia}',
        to_jsonb(coalesce(
          nullif(protocolo_entrega->>'fecha_prueba_anterior_garantia', ''),
          fecha_prueba_electrica::date::text
        )),
        true
      ),
      '{fecha}',
      to_jsonb(fecha_ingreso::date::text),
      true
    ),
    fecha_prueba_electrica = fecha_ingreso
where fecha_ingreso is not null
  and fecha_prueba_electrica is not null
  and lower(btrim(coalesce(estado, protocolo_entrega->>'estado', ''))) in ('en garantia', 'en garantía')
  and fecha_prueba_electrica::date <> fecha_ingreso::date;

commit;

select 'modulos' as origen, count(*) as garantias
from public.modulos
where lower(btrim(coalesce(estado, protocolo_entrega->>'estado', ''))) in ('en garantia', 'en garantía')
union all
select 'historial_modulos', count(*)
from public.historial_modulos
where lower(btrim(coalesce(estado, protocolo_entrega->>'estado', ''))) in ('en garantia', 'en garantía');
