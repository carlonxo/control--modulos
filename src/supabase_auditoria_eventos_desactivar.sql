-- Uso de emergencia: desactiva la captura sin borrar la tabla ni su historial.

begin;

do $$
declare
  v_tabla text;
begin
  foreach v_tabla in array array[
    'perfiles',
    'vales_bodega',
    'vales_bodega_items',
    'bodega_inventarios',
    'bodega_inventario_items',
    'bodega_recepciones',
    'bodega_recepcion_items',
    'bodega_despachos',
    'bodega_despacho_items'
  ]
  loop
    if to_regclass(format('public.%I', v_tabla)) is not null then
      execute format(
        'drop trigger if exists trigger_auditoria_cambios on public.%I',
        v_tabla
      );
    end if;
  end loop;
end;
$$;

commit;

select count(*) as triggers_auditoria_activos
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name = 'trigger_auditoria_cambios';
