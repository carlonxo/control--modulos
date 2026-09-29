-- Recepciona una devolucion y suma sus materiales al inventario en una sola transaccion.
-- Ejecutar este archivo completo en el SQL Editor de Supabase antes de usar el boton.

create or replace function public.recepcionar_devolucion_bodega(
  p_vale_id uuid,
  p_inventario_id uuid,
  p_actualizaciones jsonb,
  p_items_esperados jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_rol text;
  v_nombre text;
  v_vale public.vales_bodega%rowtype;
  v_actualizacion record;
  v_inventario_item public.bodega_inventario_items%rowtype;
  v_cantidad numeric;
  v_fecha_recepcion timestamp with time zone;
  v_total_items integer;
  v_total_referencias integer;
  v_referencias_unicas integer;
  v_items_actualizados integer := 0;
begin
  if v_usuario_id is null then
    raise exception using errcode = '42501', message = 'Debes iniciar sesion para recepcionar una devolucion.';
  end if;

  select p.rol, p.nombre
  into v_rol, v_nombre
  from public.perfiles p
  where p.id = v_usuario_id;

  if coalesce(v_rol, '') not in ('admin', 'bodega', 'analista') then
    raise exception using errcode = '42501', message = 'Tu rol no tiene permiso para recepcionar devoluciones.';
  end if;

  select v.*
  into v_vale
  from public.vales_bodega v
  where v.id = p_vale_id
  for update;

  if not found then
    raise exception 'No se encontro la devolucion solicitada.';
  end if;

  -- Una repeticion (doble clic, reintento de red, etc.) no vuelve a sumar stock.
  if lower(coalesce(v_vale.estado_bodega, '')) = 'entregado' then
    return jsonb_build_object(
      'ok', true,
      'ya_recepcionada', true,
      'id', v_vale.id,
      'estado_bodega', v_vale.estado_bodega,
      'fecha_entrega_bodega', v_vale.fecha_entrega_bodega,
      'entregado_por', v_vale.entregado_por,
      'items_actualizados', 0
    );
  end if;

  if coalesce(v_vale.tipo_ingreso, '') <> 'devolucion_app' then
    raise exception 'Solo se pueden recepcionar devoluciones creadas desde la aplicacion.';
  end if;

  if lower(coalesce(v_vale.estado_bodega, '')) <> 'pendiente' then
    raise exception 'La devolucion ya fue cerrada. Estado actual: %.', coalesce(v_vale.estado_bodega, 'sin estado');
  end if;

  if p_inventario_id is null or not exists (
    select 1 from public.bodega_inventarios inventario where inventario.id = p_inventario_id
  ) then
    raise exception 'No se encontro el inventario seleccionado.';
  end if;

  if jsonb_typeof(coalesce(p_items_esperados, 'null'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_actualizaciones, 'null'::jsonb)) <> 'array' then
    raise exception 'El detalle de la devolucion no tiene un formato valido.';
  end if;

  perform item.id
  from public.vales_bodega_items item
  where item.vale_id = p_vale_id
  order by item.id
  for update;

  select count(*) into v_total_items
  from public.vales_bodega_items item
  where item.vale_id = p_vale_id;

  if v_total_items = 0 then
    raise exception 'La devolucion no contiene materiales.';
  end if;

  if v_total_items <> jsonb_array_length(p_items_esperados) or exists (
    select 1
    from public.vales_bodega_items item
    where item.vale_id = p_vale_id
      and not exists (
        select 1
        from jsonb_array_elements(p_items_esperados) esperado
        where esperado->>'id' = item.id::text
          and coalesce((esperado->>'cantidad')::numeric, 0) = item.cantidad
          and coalesce(esperado->>'material_vale', '') = item.material_vale
          and coalesce(esperado->>'material_balance', '') = item.material_balance
      )
  ) then
    raise exception using errcode = 'P0001', message = 'DEVOLUCION_MODIFICADA: los materiales o cantidades cambiaron.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_actualizaciones) actualizacion
    where jsonb_typeof(actualizacion) <> 'object'
      or nullif(actualizacion->>'inventario_item_id', '') is null
      or jsonb_typeof(coalesce(actualizacion->'vale_item_ids', 'null'::jsonb)) <> 'array'
      or jsonb_array_length(actualizacion->'vale_item_ids') = 0
  ) then
    raise exception 'El detalle de recepcion contiene filas incompletas.';
  end if;

  select count(*), count(distinct referencia.valor)
  into v_total_referencias, v_referencias_unicas
  from jsonb_array_elements(p_actualizaciones) actualizacion
  cross join lateral jsonb_array_elements_text(actualizacion->'vale_item_ids') referencia(valor);

  if v_total_referencias <> v_referencias_unicas or v_total_referencias <> v_total_items then
    raise exception 'Cada material de la devolucion debe recepcionarse exactamente una vez.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_actualizaciones) actualizacion
    cross join lateral jsonb_array_elements_text(actualizacion->'vale_item_ids') referencia(valor)
    left join public.vales_bodega_items item
      on item.id::text = referencia.valor and item.vale_id = p_vale_id
    where item.id is null
  ) then
    raise exception 'La recepcion contiene materiales que no pertenecen a la devolucion.';
  end if;

  for v_actualizacion in
    select
      (actualizacion->>'inventario_item_id')::uuid as inventario_item_id,
      array_agg(referencia.valor::uuid order by referencia.valor) as vale_item_ids
    from jsonb_array_elements(p_actualizaciones) actualizacion
    cross join lateral jsonb_array_elements_text(actualizacion->'vale_item_ids') referencia(valor)
    group by (actualizacion->>'inventario_item_id')::uuid
    order by (actualizacion->>'inventario_item_id')::uuid
  loop
    select item.*
    into v_inventario_item
    from public.bodega_inventario_items item
    where item.id = v_actualizacion.inventario_item_id
      and item.inventario_id = p_inventario_id
    for update;

    if not found then
      raise exception 'No se encontro uno de los materiales en el inventario seleccionado.';
    end if;

    if exists (
      select 1
      from public.vales_bodega_items item_devolucion
      where item_devolucion.id = any(v_actualizacion.vale_item_ids)
        and upper(regexp_replace(coalesce(item_devolucion.material_vale, ''), '[^A-Za-z0-9]', '', 'g'))
          <> upper(regexp_replace(coalesce(v_inventario_item.codigo_bodega, ''), '[^A-Za-z0-9]', '', 'g'))
        and upper(regexp_replace(coalesce(item_devolucion.material_balance, ''), '[^A-Za-z0-9]', '', 'g'))
          <> upper(regexp_replace(coalesce(v_inventario_item.descripcion, ''), '[^A-Za-z0-9]', '', 'g'))
    ) then
      raise exception 'El codigo del material devuelto no coincide con el material de inventario.';
    end if;

    select coalesce(sum(item.cantidad), 0)
    into v_cantidad
    from public.vales_bodega_items item
    where item.vale_id = p_vale_id and item.id = any(v_actualizacion.vale_item_ids);

    if v_cantidad <= 0 then
      raise exception 'La cantidad a recepcionar debe ser mayor que cero.';
    end if;

    update public.bodega_inventario_items
    set entradas = coalesce(entradas, 0) + v_cantidad,
        saldo_final = coalesce(saldo_final, 0) + v_cantidad
    where id = v_inventario_item.id;

    v_items_actualizados := v_items_actualizados + 1;
  end loop;

  v_fecha_recepcion := clock_timestamp();

  update public.vales_bodega
  set estado_bodega = 'entregado',
      fecha_entrega_bodega = v_fecha_recepcion,
      entregado_por = coalesce(nullif(trim(v_nombre), ''), v_usuario_id::text)
  where id = p_vale_id;

  return jsonb_build_object(
    'ok', true,
    'ya_recepcionada', false,
    'id', p_vale_id,
    'estado_bodega', 'entregado',
    'fecha_entrega_bodega', v_fecha_recepcion,
    'entregado_por', coalesce(nullif(trim(v_nombre), ''), v_usuario_id::text),
    'items_actualizados', v_items_actualizados
  );
end;
$$;

revoke all on function public.recepcionar_devolucion_bodega(uuid, uuid, jsonb, jsonb) from public;
revoke all on function public.recepcionar_devolucion_bodega(uuid, uuid, jsonb, jsonb) from anon;
grant execute on function public.recepcionar_devolucion_bodega(uuid, uuid, jsonb, jsonb) to authenticated;

select
  p.proname as funcion,
  pg_get_function_identity_arguments(p.oid) as parametros,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'recepcionar_devolucion_bodega';
