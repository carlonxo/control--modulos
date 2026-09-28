-- Capa de endurecimiento: impedir acceso sin inicio de sesión.
-- Mantiene los permisos actuales de usuarios autenticados para no alterar la operación.
-- Ejecutar una sola vez en Supabase SQL Editor.

begin;

do $$
declare
  v_objeto text;
  v_objetos text[] := array[
    'modulos',
    'historial_modulos',
    'protocolos_manuales',
    'material_precios',
    'material_equivalencias',
    'perfiles',
    'posiciones',
    'registro_acciones_modulos',
    'balance_materiales_config',
    'resumen_operacional_mensual',
    'tablero'
  ];
begin
  foreach v_objeto in array v_objetos loop
    if to_regclass(format('public.%I', v_objeto)) is not null then
      execute format('revoke all privileges on table public.%I from anon', v_objeto);
      execute format('revoke all privileges on table public.%I from public', v_objeto);

      -- Los usuarios que ya iniciaron sesión conservan la operatividad existente.
      execute format('grant select, insert, update, delete on table public.%I to authenticated', v_objeto);
    end if;
  end loop;
end;
$$;

-- Las inserciones que usen columnas identity/serial siguen funcionando autenticadas.
do $$
declare
  v_secuencia record;
begin
  for v_secuencia in
    select n.nspname as esquema, c.relname as nombre
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'S'
  loop
    execute format('revoke all privileges on sequence %I.%I from anon', v_secuencia.esquema, v_secuencia.nombre);
    execute format('revoke all privileges on sequence %I.%I from public', v_secuencia.esquema, v_secuencia.nombre);
    execute format('grant usage, select on sequence %I.%I to authenticated', v_secuencia.esquema, v_secuencia.nombre);
  end loop;
end;
$$;

commit;

-- El resultado debe ser cero filas. Si aparece alguna, esa tabla aún tiene acceso anónimo.
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'PUBLIC')
  and table_name in (
    'modulos',
    'historial_modulos',
    'protocolos_manuales',
    'material_precios',
    'material_equivalencias',
    'perfiles',
    'posiciones',
    'registro_acciones_modulos',
    'balance_materiales_config',
    'resumen_operacional_mensual',
    'tablero'
  )
order by table_name, grantee, privilege_type;
