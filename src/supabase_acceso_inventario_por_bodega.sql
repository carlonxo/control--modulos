-- Lectura segura del inventario según la bodega asignada al usuario.
-- Evita que políticas RLS antiguas oculten el inventario a operadores de bodega.
-- Ejecutar completo en el SQL Editor de Supabase.

create or replace function public.cargar_inventario_bodega_asignada(
  p_bodega text default null,
  p_limite integer default 1
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_rol text;
  v_bodega_perfil text;
  v_bodega_solicitada text;
  v_bodega_consulta text;
  v_limite integer := greatest(1, least(coalesce(p_limite, 1), 20));
  v_inventario record;
  v_items jsonb;
  v_movimientos integer;
  v_resultado jsonb := '[]'::jsonb;
begin
  if v_usuario_id is null then
    raise exception using errcode = '42501', message = 'Debes iniciar sesion para consultar el inventario.';
  end if;

  select
    lower(btrim(coalesce(perfil.rol, ''))),
    replace(
      regexp_replace(lower(btrim(coalesce(perfil.bodega_asignada, ''))), '^bodega\s+', ''),
      'montana',
      'montaña'
    )
  into v_rol, v_bodega_perfil
  from public.perfiles perfil
  where perfil.id = v_usuario_id;

  if coalesce(v_rol, '') not in ('admin', 'operador', 'analista', 'bodega', 'electrico') then
    raise exception using errcode = '42501', message = 'Tu rol no tiene permiso para consultar inventarios de bodega.';
  end if;

  v_bodega_solicitada := replace(
    regexp_replace(lower(btrim(coalesce(p_bodega, ''))), '^bodega\s+', ''),
    'montana',
    'montaña'
  );

  if v_rol = 'admin' then
    v_bodega_consulta := coalesce(nullif(v_bodega_solicitada, ''), 'bayona');
  else
    if nullif(v_bodega_perfil, '') is null then
      raise exception using errcode = '42501', message = 'Tu usuario no tiene una bodega asignada.';
    end if;
    if nullif(v_bodega_solicitada, '') is not null and v_bodega_solicitada <> v_bodega_perfil then
      raise exception using errcode = '42501', message = 'No puedes consultar una bodega diferente de la asignada a tu usuario.';
    end if;
    v_bodega_consulta := v_bodega_perfil;
  end if;

  if v_bodega_consulta not in ('bayona', 'rental', 'montaña') then
    raise exception 'La bodega asignada no es valida: %.', v_bodega_consulta;
  end if;

  for v_inventario in
    select inventario.*
    from public.bodega_inventarios inventario
    where replace(
      regexp_replace(lower(btrim(coalesce(inventario.bodega, ''))), '^bodega\s+', ''),
      'montana',
      'montaña'
    ) = v_bodega_consulta
    order by inventario.fecha desc, inventario.creado_en desc
    limit v_limite
  loop
    select coalesce(
      jsonb_agg(to_jsonb(item) order by item.descripcion, item.codigo_bodega),
      '[]'::jsonb
    )
    into v_items
    from public.bodega_inventario_items item
    where item.inventario_id = v_inventario.id;

    select count(*)::integer
    into v_movimientos
    from public.bodega_movimientos_excel movimiento
    where movimiento.inventario_id = v_inventario.id;

    v_resultado := v_resultado || jsonb_build_array(
      to_jsonb(v_inventario) || jsonb_build_object(
        'items', v_items,
        'movimientos', coalesce(v_movimientos, 0)
      )
    );
  end loop;

  return jsonb_build_object(
    'bodega', v_bodega_consulta,
    'inventarios', v_resultado
  );
end;
$$;

revoke all on function public.cargar_inventario_bodega_asignada(text, integer) from public;
revoke all on function public.cargar_inventario_bodega_asignada(text, integer) from anon;
grant execute on function public.cargar_inventario_bodega_asignada(text, integer) to authenticated;

select
  p.proname as funcion,
  pg_get_function_identity_arguments(p.oid) as parametros,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'cargar_inventario_bodega_asignada';
