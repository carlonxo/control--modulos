-- Historial trazable de correcciones administrativas de inventario.
-- Ejecutar completo en el SQL Editor de Supabase.

begin;

create table if not exists public.bodega_correcciones_inventario (
  id uuid primary key default gen_random_uuid(),
  inventario_id uuid references public.bodega_inventarios(id) on delete set null,
  inventario_item_id uuid references public.bodega_inventario_items(id) on delete set null,
  bodega text not null,
  codigo_anterior text not null default '',
  codigo_nuevo text not null default '',
  descripcion_anterior text not null default '',
  descripcion_nueva text not null default '',
  saldo_anterior numeric not null default 0,
  saldo_nuevo numeric not null default 0,
  diferencia numeric not null default 0,
  motivo text not null,
  usuario_id uuid,
  usuario_nombre text not null default '',
  usuario_rol text not null default '',
  creado_en timestamp with time zone not null default clock_timestamp()
);

create index if not exists idx_bodega_correcciones_bodega_fecha
on public.bodega_correcciones_inventario (bodega, creado_en desc);

create index if not exists idx_bodega_correcciones_item_fecha
on public.bodega_correcciones_inventario (inventario_item_id, creado_en desc);

alter table public.bodega_correcciones_inventario enable row level security;

drop policy if exists bodega_correcciones_select_admin on public.bodega_correcciones_inventario;
create policy bodega_correcciones_select_admin
on public.bodega_correcciones_inventario
for select
to authenticated
using (public.usuario_tiene_rol(array['admin']));

revoke all on table public.bodega_correcciones_inventario from public;
revoke all on table public.bodega_correcciones_inventario from anon;
revoke all on table public.bodega_correcciones_inventario from authenticated;
grant select on table public.bodega_correcciones_inventario to authenticated;

create or replace function public.corregir_item_inventario_bodega(
  p_item_id uuid,
  p_nuevo_saldo numeric,
  p_nuevo_codigo text,
  p_nueva_descripcion text,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_usuario_nombre text := '';
  v_usuario_rol text := '';
  v_item public.bodega_inventario_items%rowtype;
  v_bodega text;
  v_codigo_nuevo text := btrim(coalesce(p_nuevo_codigo, ''));
  v_descripcion_nueva text := btrim(coalesce(p_nueva_descripcion, ''));
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_delta numeric;
  v_entradas numeric;
  v_salidas numeric;
  v_correccion_id uuid;
begin
  if v_usuario_id is null then
    raise exception 'Debes iniciar sesión para corregir el inventario.';
  end if;

  select coalesce(perfil.nombre, ''), coalesce(perfil.rol, '')
  into v_usuario_nombre, v_usuario_rol
  from public.perfiles perfil
  where perfil.id = v_usuario_id;

  if v_usuario_rol <> 'admin' then
    raise exception 'Solo un administrador puede corregir el inventario.';
  end if;

  if p_item_id is null then
    raise exception 'Debes seleccionar un material.';
  end if;
  if p_nuevo_saldo is null or p_nuevo_saldo < 0 then
    raise exception 'El saldo corregido debe ser igual o mayor que cero.';
  end if;
  if length(v_codigo_nuevo) < 2 then
    raise exception 'El código debe tener al menos 2 caracteres.';
  end if;
  if length(v_descripcion_nueva) < 3 then
    raise exception 'La descripción debe tener al menos 3 caracteres.';
  end if;
  if length(v_motivo) < 5 then
    raise exception 'Debes indicar un motivo de al menos 5 caracteres.';
  end if;

  select item.*
  into v_item
  from public.bodega_inventario_items item
  where item.id = p_item_id
  for update of item;

  if not found then
    raise exception 'El material seleccionado ya no existe en el inventario.';
  end if;

  select inventario.bodega
  into v_bodega
  from public.bodega_inventarios inventario
  where inventario.id = v_item.inventario_id;

  if coalesce(v_item.saldo_final, 0) = p_nuevo_saldo
    and btrim(coalesce(v_item.codigo_bodega, '')) = v_codigo_nuevo
    and btrim(coalesce(v_item.descripcion, '')) = v_descripcion_nueva then
    raise exception 'No se detectaron cambios en el material.';
  end if;

  v_delta := p_nuevo_saldo - coalesce(v_item.saldo_final, 0);
  v_entradas := coalesce(v_item.entradas, 0) + greatest(v_delta, 0);
  v_salidas := coalesce(v_item.salidas, 0) + greatest(-v_delta, 0);

  update public.bodega_inventario_items
  set codigo_bodega = v_codigo_nuevo,
      descripcion = v_descripcion_nueva,
      entradas = v_entradas,
      salidas = v_salidas,
      saldo_final = p_nuevo_saldo
  where id = p_item_id;

  if v_delta <> 0 then
    insert into public.bodega_movimientos_excel (
      inventario_id,
      codigo_bodega,
      fecha,
      tipo,
      documento,
      contexto,
      cantidad
    ) values (
      v_item.inventario_id,
      v_codigo_nuevo,
      current_date,
      'CORRECCION INVENTARIO',
      'AJUSTE ADMIN',
      format(
        'Bodega: %s | Saldo anterior: %s | Saldo corregido: %s | Motivo: %s | Usuario: %s',
        coalesce(v_bodega, ''),
        coalesce(v_item.saldo_final, 0),
        p_nuevo_saldo,
        v_motivo,
        v_usuario_nombre
      ),
      v_delta
    );
  end if;

  insert into public.bodega_correcciones_inventario (
    inventario_id,
    inventario_item_id,
    bodega,
    codigo_anterior,
    codigo_nuevo,
    descripcion_anterior,
    descripcion_nueva,
    saldo_anterior,
    saldo_nuevo,
    diferencia,
    motivo,
    usuario_id,
    usuario_nombre,
    usuario_rol
  ) values (
    v_item.inventario_id,
    v_item.id,
    coalesce(v_bodega, ''),
    coalesce(v_item.codigo_bodega, ''),
    v_codigo_nuevo,
    coalesce(v_item.descripcion, ''),
    v_descripcion_nueva,
    coalesce(v_item.saldo_final, 0),
    p_nuevo_saldo,
    v_delta,
    v_motivo,
    v_usuario_id,
    v_usuario_nombre,
    v_usuario_rol
  )
  returning id into v_correccion_id;

  return jsonb_build_object(
    'correccion_id', v_correccion_id,
    'item_id', v_item.id,
    'codigo_anterior', coalesce(v_item.codigo_bodega, ''),
    'codigo_nuevo', v_codigo_nuevo,
    'descripcion_anterior', coalesce(v_item.descripcion, ''),
    'descripcion_nueva', v_descripcion_nueva,
    'saldo_anterior', coalesce(v_item.saldo_final, 0),
    'saldo_nuevo', p_nuevo_saldo,
    'diferencia', v_delta,
    'motivo', v_motivo,
    'usuario_nombre', v_usuario_nombre
  );
end;
$$;

revoke all on function public.corregir_item_inventario_bodega(uuid, numeric, text, text, text) from public;
revoke all on function public.corregir_item_inventario_bodega(uuid, numeric, text, text, text) from anon;
grant execute on function public.corregir_item_inventario_bodega(uuid, numeric, text, text, text) to authenticated;

commit;

select
  p.proname as funcion,
  pg_get_function_identity_arguments(p.oid) as parametros,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'corregir_item_inventario_bodega';
