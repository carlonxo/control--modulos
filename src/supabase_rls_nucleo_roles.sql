-- Endurecimiento por rol para el núcleo de módulos y protocolos.
-- Requiere la función public.usuario_tiene_rol(text[]) instalada en la etapa de bodega.
-- Ejecutar completo en Supabase SQL Editor y luego probar una cuenta por rol.

begin;

-- Quita políticas antiguas permisivas de las tablas que serán reemplazadas.
do $$
declare
  v_politica record;
begin
  for v_politica in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'modulos',
        'historial_modulos',
        'protocolos_manuales',
        'material_precios',
        'material_equivalencias',
        'registro_acciones_modulos',
        'balance_materiales_config'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      v_politica.policyname,
      v_politica.schemaname,
      v_politica.tablename
    );
  end loop;
end;
$$;

alter table public.modulos enable row level security;
alter table public.historial_modulos enable row level security;
alter table public.protocolos_manuales enable row level security;
alter table public.material_precios enable row level security;
alter table public.material_equivalencias enable row level security;
alter table public.registro_acciones_modulos enable row level security;
alter table public.balance_materiales_config enable row level security;

-- MÓDULOS ACTIVOS
create policy modulos_select_autenticados
on public.modulos for select to authenticated
using (auth.uid() is not null);

create policy modulos_insert_gestion
on public.modulos for insert to authenticated
with check (public.usuario_tiene_rol(array['admin', 'operador', 'colaborador']));

create policy modulos_update_operacion
on public.modulos for update to authenticated
using (public.usuario_tiene_rol(array[
  'admin', 'operador', 'colaborador', 'control_calidad', 'electrico', 'analista'
]))
with check (public.usuario_tiene_rol(array[
  'admin', 'operador', 'colaborador', 'control_calidad', 'electrico', 'analista'
]));

create policy modulos_delete_finalizacion
on public.modulos for delete to authenticated
using (public.usuario_tiene_rol(array['admin', 'colaborador']));

-- HISTORIAL DE MÓDULOS
create policy historial_modulos_select_autenticados
on public.historial_modulos for select to authenticated
using (auth.uid() is not null);

create policy historial_modulos_insert_finalizacion
on public.historial_modulos for insert to authenticated
with check (public.usuario_tiene_rol(array['admin', 'colaborador']));

create policy historial_modulos_update_gestion
on public.historial_modulos for update to authenticated
using (public.usuario_tiene_rol(array['admin', 'operador', 'analista', 'colaborador']))
with check (public.usuario_tiene_rol(array['admin', 'operador', 'analista', 'colaborador']));

create policy historial_modulos_delete_gestion
on public.historial_modulos for delete to authenticated
using (public.usuario_tiene_rol(array['admin', 'operador', 'analista', 'colaborador']));

-- PROTOCOLOS MANUALES
create policy protocolos_manuales_select_autenticados
on public.protocolos_manuales for select to authenticated
using (auth.uid() is not null);

create policy protocolos_manuales_insert_gestion
on public.protocolos_manuales for insert to authenticated
with check (public.usuario_tiene_rol(array['admin', 'operador', 'analista']));

create policy protocolos_manuales_update_gestion
on public.protocolos_manuales for update to authenticated
using (public.usuario_tiene_rol(array['admin', 'operador', 'analista']))
with check (public.usuario_tiene_rol(array['admin', 'operador', 'analista']));

create policy protocolos_manuales_delete_gestion
on public.protocolos_manuales for delete to authenticated
using (public.usuario_tiene_rol(array['admin', 'operador', 'analista']));

-- CATÁLOGO DE PRECIOS
create policy material_precios_select_roles
on public.material_precios for select to authenticated
using (public.usuario_tiene_rol(array['admin', 'operador', 'analista']));

create policy material_precios_insert_roles
on public.material_precios for insert to authenticated
with check (public.usuario_tiene_rol(array['admin', 'analista']));

create policy material_precios_update_roles
on public.material_precios for update to authenticated
using (public.usuario_tiene_rol(array['admin', 'analista']))
with check (public.usuario_tiene_rol(array['admin', 'analista']));

create policy material_precios_delete_roles
on public.material_precios for delete to authenticated
using (public.usuario_tiene_rol(array['admin', 'analista']));

-- EQUIVALENCIAS: se consultan durante la operación de bodega; solo admin las administra.
create policy material_equivalencias_select_autenticados
on public.material_equivalencias for select to authenticated
using (auth.uid() is not null);

create policy material_equivalencias_insert_admin
on public.material_equivalencias for insert to authenticated
with check (public.usuario_tiene_rol(array['admin']));

create policy material_equivalencias_update_admin
on public.material_equivalencias for update to authenticated
using (public.usuario_tiene_rol(array['admin']))
with check (public.usuario_tiene_rol(array['admin']));

create policy material_equivalencias_delete_admin
on public.material_equivalencias for delete to authenticated
using (public.usuario_tiene_rol(array['admin']));

-- CONFIGURACIÓN DEL BALANCE
create policy balance_config_select_autenticados
on public.balance_materiales_config for select to authenticated
using (auth.uid() is not null);

create policy balance_config_insert_roles
on public.balance_materiales_config for insert to authenticated
with check (public.usuario_tiene_rol(array['admin', 'analista']));

create policy balance_config_update_roles
on public.balance_materiales_config for update to authenticated
using (public.usuario_tiene_rol(array['admin', 'analista']))
with check (public.usuario_tiene_rol(array['admin', 'analista']));

create policy balance_config_delete_roles
on public.balance_materiales_config for delete to authenticated
using (public.usuario_tiene_rol(array['admin', 'analista']));

-- REGISTRO OPERACIONAL: todos los roles que operan módulos pueden registrar; solo admin consulta y deshace.
create policy registro_acciones_select_admin
on public.registro_acciones_modulos for select to authenticated
using (public.usuario_tiene_rol(array['admin']));

create policy registro_acciones_insert_operacion
on public.registro_acciones_modulos for insert to authenticated
with check (public.usuario_tiene_rol(array[
  'admin', 'operador', 'colaborador', 'control_calidad', 'electrico', 'analista'
]));

create policy registro_acciones_update_admin
on public.registro_acciones_modulos for update to authenticated
using (public.usuario_tiene_rol(array['admin']))
with check (public.usuario_tiene_rol(array['admin']));

-- Privilegios SQL: RLS decide qué filas y operaciones acepta para cada rol.
revoke all on table public.modulos from authenticated;
revoke all on table public.historial_modulos from authenticated;
revoke all on table public.protocolos_manuales from authenticated;
revoke all on table public.material_precios from authenticated;
revoke all on table public.material_equivalencias from authenticated;
revoke all on table public.registro_acciones_modulos from authenticated;
revoke all on table public.balance_materiales_config from authenticated;

grant select, insert, update, delete on table public.modulos to authenticated;
grant select, insert, update, delete on table public.historial_modulos to authenticated;
grant select, insert, update, delete on table public.protocolos_manuales to authenticated;
grant select, insert, update, delete on table public.material_precios to authenticated;
grant select, insert, update, delete on table public.material_equivalencias to authenticated;
grant select, insert, update on table public.registro_acciones_modulos to authenticated;
grant select, insert, update, delete on table public.balance_materiales_config to authenticated;

-- La vista debe aplicar las políticas de las tablas subyacentes, no los privilegios de su propietario.
do $$
begin
  if to_regclass('public.tablero') is not null then
    execute 'alter view public.tablero set (security_invoker = true)';
    execute 'revoke all on table public.tablero from anon';
    execute 'revoke all on table public.tablero from public';
    execute 'grant select on table public.tablero to authenticated';
  end if;
end;
$$;

-- Amplía la auditoría ya instalada hacia el núcleo operativo.
do $$
declare
  v_tabla text;
begin
  if to_regprocedure('public.registrar_evento_auditoria()') is not null then
    foreach v_tabla in array array[
      'modulos',
      'historial_modulos',
      'protocolos_manuales',
      'material_precios',
      'material_equivalencias',
      'registro_acciones_modulos',
      'balance_materiales_config'
    ] loop
      if to_regclass(format('public.%I', v_tabla)) is not null then
        execute format('drop trigger if exists trigger_auditoria_cambios on public.%I', v_tabla);
        execute format(
          'create trigger trigger_auditoria_cambios after insert or update or delete on public.%I for each row execute function public.registrar_evento_auditoria()',
          v_tabla
        );
      end if;
    end loop;
  end if;
end;
$$;

commit;

-- Deben aparecer políticas sin roles anon y RLS habilitado en las siete tablas.
select
  p.tablename as tabla,
  p.policyname as politica,
  p.cmd as operacion,
  p.roles
from pg_policies p
where p.schemaname = 'public'
  and p.tablename in (
    'modulos',
    'historial_modulos',
    'protocolos_manuales',
    'material_precios',
    'material_equivalencias',
    'registro_acciones_modulos',
    'balance_materiales_config'
  )
order by p.tablename, p.cmd, p.policyname;
