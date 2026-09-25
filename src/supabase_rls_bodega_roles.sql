-- Endurecimiento de permisos para perfiles, pedidos e inventario de bodega.
-- Sustituye politicas abiertas por permisos basados en el rol del usuario.

begin;

create or replace function public.usuario_tiene_rol(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles perfil
    where perfil.id = auth.uid()
      and perfil.rol = any(p_roles)
  );
$$;

revoke all on function public.usuario_tiene_rol(text[]) from public;
revoke all on function public.usuario_tiene_rol(text[]) from anon;
grant execute on function public.usuario_tiene_rol(text[]) to authenticated;

alter table public.perfiles enable row level security;
alter table public.vales_bodega enable row level security;
alter table public.vales_bodega_items enable row level security;
alter table public.bodega_inventarios enable row level security;
alter table public.bodega_inventario_items enable row level security;

-- Elimina las politicas abiertas o redundantes detectadas en el diagnostico.
drop policy if exists perfiles_select_authenticated on public.perfiles;
drop policy if exists perfiles_update_admin on public.perfiles;
drop policy if exists "Usuarios actualizan su perfil" on public.perfiles;
drop policy if exists "Usuarios autenticados pueden leer perfiles" on public.perfiles;
drop policy if exists "Usuarios leen su perfil" on public.perfiles;

drop policy if exists "Usuarios autenticados pueden insertar vales bodega" on public.vales_bodega;
drop policy if exists "Usuarios autenticados pueden ver vales bodega" on public.vales_bodega;
drop policy if exists vales_bodega_select_authenticated on public.vales_bodega;
drop policy if exists vales_bodega_update_estado_authenticated on public.vales_bodega;
drop policy if exists vales_bodega_insert_roles on public.vales_bodega;
drop policy if exists vales_bodega_update_gestion on public.vales_bodega;

drop policy if exists "Usuarios autenticados pueden insertar items vales bodega" on public.vales_bodega_items;
drop policy if exists "Usuarios autenticados pueden ver items vales bodega" on public.vales_bodega_items;
drop policy if exists vales_bodega_items_delete_admin_bodega on public.vales_bodega_items;
drop policy if exists vales_bodega_items_delete_analista on public.vales_bodega_items;
drop policy if exists vales_bodega_items_insert_admin_bodega on public.vales_bodega_items;
drop policy if exists vales_bodega_items_insert_analista on public.vales_bodega_items;
drop policy if exists vales_bodega_items_select_admin_bodega on public.vales_bodega_items;
drop policy if exists vales_bodega_items_update_admin_bodega on public.vales_bodega_items;
drop policy if exists vales_bodega_items_select_authenticated on public.vales_bodega_items;
drop policy if exists vales_bodega_items_insert_gestion on public.vales_bodega_items;
drop policy if exists vales_bodega_items_update_gestion on public.vales_bodega_items;
drop policy if exists vales_bodega_items_delete_gestion on public.vales_bodega_items;

drop policy if exists "ver bodega inventarios" on public.bodega_inventarios;
drop policy if exists "insertar bodega inventarios" on public.bodega_inventarios;
drop policy if exists "actualizar bodega inventarios" on public.bodega_inventarios;
drop policy if exists "eliminar bodega inventarios" on public.bodega_inventarios;
drop policy if exists bodega_inventarios_select_roles on public.bodega_inventarios;
drop policy if exists bodega_inventarios_insert_admin on public.bodega_inventarios;
drop policy if exists bodega_inventarios_update_admin on public.bodega_inventarios;
drop policy if exists bodega_inventarios_delete_admin on public.bodega_inventarios;

drop policy if exists "ver bodega items" on public.bodega_inventario_items;
drop policy if exists "insertar bodega items" on public.bodega_inventario_items;
drop policy if exists "actualizar bodega items" on public.bodega_inventario_items;
drop policy if exists "eliminar bodega items" on public.bodega_inventario_items;
drop policy if exists bodega_inventario_items_select_roles on public.bodega_inventario_items;
drop policy if exists bodega_inventario_items_insert_roles on public.bodega_inventario_items;
drop policy if exists bodega_inventario_items_update_roles on public.bodega_inventario_items;
drop policy if exists bodega_inventario_items_delete_admin on public.bodega_inventario_items;

-- Perfiles: todos los usuarios autenticados pueden resolver nombres y roles.
-- Solo admin puede modificar perfiles, evitando que un usuario cambie su rol.
create policy perfiles_select_authenticated
on public.perfiles
for select
to authenticated
using (true);

create policy perfiles_update_admin
on public.perfiles
for update
to authenticated
using (public.usuario_tiene_rol(array['admin']))
with check (public.usuario_tiene_rol(array['admin']));

-- Cabeceras de inventario: lectura para los roles que usan la vista de bodega;
-- administracion completa solamente para admin.
create policy bodega_inventarios_select_roles
on public.bodega_inventarios
for select
to authenticated
using (public.usuario_tiene_rol(array['admin', 'operador', 'analista', 'bodega', 'electrico']));

create policy bodega_inventarios_insert_admin
on public.bodega_inventarios
for insert
to authenticated
with check (public.usuario_tiene_rol(array['admin']));

create policy bodega_inventarios_update_admin
on public.bodega_inventarios
for update
to authenticated
using (public.usuario_tiene_rol(array['admin']))
with check (public.usuario_tiene_rol(array['admin']));

create policy bodega_inventarios_delete_admin
on public.bodega_inventarios
for delete
to authenticated
using (public.usuario_tiene_rol(array['admin']));

-- Detalle del inventario: admin carga/elimina; bodega y analista pueden ajustar
-- existencias mediante recepciones, despachos y operaciones autorizadas.
create policy bodega_inventario_items_select_roles
on public.bodega_inventario_items
for select
to authenticated
using (public.usuario_tiene_rol(array['admin', 'operador', 'analista', 'bodega', 'electrico']));

create policy bodega_inventario_items_insert_roles
on public.bodega_inventario_items
for insert
to authenticated
with check (public.usuario_tiene_rol(array['admin', 'analista', 'bodega']));

create policy bodega_inventario_items_update_roles
on public.bodega_inventario_items
for update
to authenticated
using (public.usuario_tiene_rol(array['admin', 'analista', 'bodega']))
with check (public.usuario_tiene_rol(array['admin', 'analista', 'bodega']));

create policy bodega_inventario_items_delete_admin
on public.bodega_inventario_items
for delete
to authenticated
using (public.usuario_tiene_rol(array['admin']));

-- Los vales se consultan desde varias vistas de informes y notificaciones.
create policy vales_bodega_select_authenticated
on public.vales_bodega
for select
to authenticated
using (true);

create policy vales_bodega_insert_roles
on public.vales_bodega
for insert
to authenticated
with check (
  public.usuario_tiene_rol(array['admin', 'operador', 'analista', 'bodega', 'electrico'])
);

create policy vales_bodega_update_gestion
on public.vales_bodega
for update
to authenticated
using (public.usuario_tiene_rol(array['admin', 'operador', 'analista', 'bodega']))
with check (public.usuario_tiene_rol(array['admin', 'operador', 'analista', 'bodega']));

create policy vales_bodega_items_select_authenticated
on public.vales_bodega_items
for select
to authenticated
using (true);

-- Electricos pueden agregar el detalle al crear una solicitud abierta.
-- Los pedidos cerrados solo pueden corregirse por admin.
create policy vales_bodega_items_insert_gestion
on public.vales_bodega_items
for insert
to authenticated
with check (
  public.usuario_tiene_rol(array['admin'])
  or (
    public.usuario_tiene_rol(array['operador', 'analista', 'bodega', 'electrico'])
    and exists (
      select 1
      from public.vales_bodega vale
      where vale.id = vales_bodega_items.vale_id
        and vale.estado_bodega in ('solicitado', 'pendiente')
    )
  )
);

create policy vales_bodega_items_update_gestion
on public.vales_bodega_items
for update
to authenticated
using (
  public.usuario_tiene_rol(array['admin'])
  or (
    public.usuario_tiene_rol(array['operador', 'analista', 'bodega'])
    and exists (
      select 1
      from public.vales_bodega vale
      where vale.id = vales_bodega_items.vale_id
        and vale.estado_bodega in ('solicitado', 'pendiente')
    )
  )
)
with check (
  public.usuario_tiene_rol(array['admin'])
  or (
    public.usuario_tiene_rol(array['operador', 'analista', 'bodega'])
    and exists (
      select 1
      from public.vales_bodega vale
      where vale.id = vales_bodega_items.vale_id
        and vale.estado_bodega in ('solicitado', 'pendiente')
    )
  )
);

create policy vales_bodega_items_delete_gestion
on public.vales_bodega_items
for delete
to authenticated
using (
  public.usuario_tiene_rol(array['admin'])
  or (
    public.usuario_tiene_rol(array['operador', 'analista', 'bodega'])
    and exists (
      select 1
      from public.vales_bodega vale
      where vale.id = vales_bodega_items.vale_id
        and vale.estado_bodega in ('solicitado', 'pendiente')
    )
  )
);

-- El rol anon queda sin acceso a estas tablas.
revoke all on table public.perfiles from anon;
revoke all on table public.vales_bodega from anon;
revoke all on table public.vales_bodega_items from anon;
revoke all on table public.bodega_inventarios from anon;
revoke all on table public.bodega_inventario_items from anon;

-- Reduce los privilegios de authenticated a las operaciones que usa la app.
revoke all on table public.perfiles from authenticated;
grant select, update on table public.perfiles to authenticated;

revoke all on table public.vales_bodega from authenticated;
grant select, insert, update on table public.vales_bodega to authenticated;

revoke all on table public.vales_bodega_items from authenticated;
grant select, insert, update, delete on table public.vales_bodega_items to authenticated;

revoke all on table public.bodega_inventarios from authenticated;
grant select, insert, update, delete on table public.bodega_inventarios to authenticated;

revoke all on table public.bodega_inventario_items from authenticated;
grant select, insert, update, delete on table public.bodega_inventario_items to authenticated;

commit;

select
  policy.schemaname,
  policy.tablename,
  policy.policyname,
  policy.roles,
  policy.cmd
from pg_policies policy
where policy.schemaname = 'public'
  and policy.tablename in (
    'perfiles',
    'vales_bodega',
    'vales_bodega_items',
    'bodega_inventarios',
    'bodega_inventario_items'
  )
order by policy.tablename, policy.cmd, policy.policyname;
