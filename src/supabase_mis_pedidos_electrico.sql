-- Habilita "Mis pedidos" y restringe al rol electrico a sus propios pedidos.
-- Ejecutar completo en Supabase SQL Editor.

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

alter table public.vales_bodega enable row level security;
alter table public.vales_bodega_items enable row level security;

drop policy if exists "Usuarios autenticados pueden ver vales bodega" on public.vales_bodega;
drop policy if exists vales_bodega_select_authenticated on public.vales_bodega;
drop policy if exists vales_bodega_select_por_rol_o_propietario on public.vales_bodega;

create policy vales_bodega_select_por_rol_o_propietario
on public.vales_bodega
for select
to authenticated
using (
  public.usuario_tiene_rol(array['admin', 'operador', 'analista', 'bodega', 'visor'])
  or (
    public.usuario_tiene_rol(array['electrico'])
    and solicitante_id = auth.uid()
  )
);

drop policy if exists "Usuarios autenticados pueden ver items vales bodega" on public.vales_bodega_items;
drop policy if exists vales_bodega_items_select_authenticated on public.vales_bodega_items;
drop policy if exists vales_bodega_items_select_por_rol_o_propietario on public.vales_bodega_items;

create policy vales_bodega_items_select_por_rol_o_propietario
on public.vales_bodega_items
for select
to authenticated
using (
  public.usuario_tiene_rol(array['admin', 'operador', 'analista', 'bodega', 'visor'])
  or (
    public.usuario_tiene_rol(array['electrico'])
    and exists (
      select 1
      from public.vales_bodega vale
      where vale.id = vales_bodega_items.vale_id
        and vale.solicitante_id = auth.uid()
    )
  )
);

commit;

select policyname, tablename
from pg_policies
where schemaname = 'public'
  and tablename in ('vales_bodega', 'vales_bodega_items')
order by tablename, policyname;
