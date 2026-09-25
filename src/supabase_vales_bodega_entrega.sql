-- Paso 1 de endurecimiento de bodega.
-- Entrega un pedido y descuenta su inventario en una sola transaccion.
-- Ejecutar este archivo completo en Supabase antes de publicar la app que lo utiliza.

alter table public.vales_bodega
add column if not exists estado_bodega text not null default 'pendiente',
add column if not exists fecha_entrega_bodega timestamp with time zone,
add column if not exists entregado_por text not null default '';

create index if not exists idx_vales_bodega_estado_fecha
on public.vales_bodega (estado_bodega, fecha);

create or replace function public.entregar_pedido_bodega(
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
  v_fecha_entrega timestamp with time zone;
  v_total_items integer;
  v_total_referencias integer;
  v_referencias_unicas integer;
  v_items_actualizados integer := 0;
begin
  if v_usuario_id is null then
    raise exception using
      errcode = '42501',
      message = 'Debes iniciar sesion para entregar un pedido.';
  end if;

  select p.rol, p.nombre
  into v_rol, v_nombre
  from public.perfiles p
  where p.id = v_usuario_id;

  if coalesce(v_rol, '') not in ('admin', 'bodega', 'analista') then
    raise exception using
      errcode = '42501',
      message = 'Tu rol no tiene permiso para entregar pedidos de bodega.';
  end if;

  select v.*
  into v_vale
  from public.vales_bodega v
  where v.id = p_vale_id
  for update;

  if not found then
    raise exception 'No se encontro el pedido solicitado.';
  end if;

  -- La repeticion de la misma solicitud no vuelve a descontar inventario.
  if lower(coalesce(v_vale.estado_bodega, '')) = 'entregado' then
    return jsonb_build_object(
      'ok', true,
      'ya_entregado', true,
      'id', v_vale.id,
      'estado_bodega', v_vale.estado_bodega,
      'fecha_entrega_bodega', v_vale.fecha_entrega_bodega,
      'entregado_por', v_vale.entregado_por,
      'items_actualizados', 0
    );
  end if;

  if coalesce(v_vale.tipo_ingreso, '') <> 'pedido_app' then
    raise exception 'Solo se pueden entregar pedidos creados desde la aplicacion.';
  end if;

  if lower(coalesce(v_vale.estado_bodega, '')) <> 'pendiente' then
    raise exception 'El pedido no esta aprobado o ya fue cerrado. Estado actual: %.',
      coalesce(v_vale.estado_bodega, 'sin estado');
  end if;

  if p_inventario_id is null or not exists (
    select 1
    from public.bodega_inventarios inventario
    where inventario.id = p_inventario_id
  ) then
    raise exception 'No se encontro el inventario seleccionado.';
  end if;

  if jsonb_typeof(coalesce(p_items_esperados, 'null'::jsonb)) <> 'array' then
    raise exception 'El detalle esperado del pedido no tiene un formato valido.';
  end if;

  if jsonb_typeof(coalesce(p_actualizaciones, 'null'::jsonb)) <> 'array' then
    raise exception 'El detalle de descuento no tiene un formato valido.';
  end if;

  -- Impide que un cambio hecho por admin/operador mientras bodega escanea
  -- termine descontando una version antigua del pedido.
  perform item.id
  from public.vales_bodega_items item
  where item.vale_id = p_vale_id
  order by item.id
  for update;

  select count(*)
  into v_total_items
  from public.vales_bodega_items item
  where item.vale_id = p_vale_id;

  if v_total_items = 0 then
    raise exception 'El pedido no contiene materiales.';
  end if;

  if v_total_items <> jsonb_array_length(p_items_esperados) then
    raise exception using
      errcode = 'P0001',
      message = 'PEDIDO_MODIFICADO: la cantidad de materiales cambio. Actualiza el pedido antes de entregarlo.';
  end if;

  if exists (
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
    raise exception using
      errcode = 'P0001',
      message = 'PEDIDO_MODIFICADO: los materiales o cantidades cambiaron. Actualiza el pedido antes de entregarlo.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_actualizaciones) actualizacion
    where jsonb_typeof(actualizacion) <> 'object'
      or nullif(actualizacion->>'inventario_item_id', '') is null
      or jsonb_typeof(coalesce(actualizacion->'vale_item_ids', 'null'::jsonb)) <> 'array'
      or jsonb_array_length(actualizacion->'vale_item_ids') = 0
  ) then
    raise exception 'El detalle de descuento contiene filas incompletas.';
  end if;

  select count(*), count(distinct referencia.valor)
  into v_total_referencias, v_referencias_unicas
  from jsonb_array_elements(p_actualizaciones) actualizacion
  cross join lateral jsonb_array_elements_text(actualizacion->'vale_item_ids') referencia(valor);

  if v_total_referencias <> v_referencias_unicas then
    raise exception 'Un material del pedido aparece mas de una vez en el descuento.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_actualizaciones) actualizacion
    cross join lateral jsonb_array_elements_text(actualizacion->'vale_item_ids') referencia(valor)
    left join public.vales_bodega_items item
      on item.id::text = referencia.valor
     and item.vale_id = p_vale_id
    where item.id is null
  ) then
    raise exception 'El descuento contiene materiales que no pertenecen al pedido.';
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
      from public.vales_bodega_items item_pedido
      where item_pedido.id = any(v_actualizacion.vale_item_ids)
        and upper(regexp_replace(coalesce(item_pedido.material_vale, ''), '[^A-Za-z0-9]', '', 'g'))
          <> upper(regexp_replace(coalesce(v_inventario_item.codigo_bodega, ''), '[^A-Za-z0-9]', '', 'g'))
    ) then
      raise exception 'El codigo del material solicitado no coincide con el material de inventario.';
    end if;

    select coalesce(sum(item.cantidad), 0)
    into v_cantidad
    from public.vales_bodega_items item
    where item.vale_id = p_vale_id
      and item.id = any(v_actualizacion.vale_item_ids);

    if v_cantidad <= 0 then
      raise exception 'La cantidad a descontar debe ser mayor que cero.';
    end if;

    if coalesce(v_inventario_item.saldo_final, 0) < v_cantidad then
      raise exception 'Stock insuficiente para %: disponible %, solicitado %.',
        v_inventario_item.descripcion,
        coalesce(v_inventario_item.saldo_final, 0),
        v_cantidad;
    end if;

    update public.bodega_inventario_items
    set salidas = coalesce(salidas, 0) + v_cantidad,
        saldo_final = coalesce(saldo_final, 0) - v_cantidad
    where id = v_inventario_item.id;

    v_items_actualizados := v_items_actualizados + 1;
  end loop;

  v_fecha_entrega := clock_timestamp();

  update public.vales_bodega
  set estado_bodega = 'entregado',
      fecha_entrega_bodega = v_fecha_entrega,
      entregado_por = coalesce(nullif(trim(v_nombre), ''), v_usuario_id::text)
  where id = p_vale_id;

  return jsonb_build_object(
    'ok', true,
    'ya_entregado', false,
    'id', p_vale_id,
    'estado_bodega', 'entregado',
    'fecha_entrega_bodega', v_fecha_entrega,
    'entregado_por', coalesce(nullif(trim(v_nombre), ''), v_usuario_id::text),
    'items_actualizados', v_items_actualizados
  );
end;
$$;

revoke all on function public.entregar_pedido_bodega(uuid, uuid, jsonb, jsonb) from public;
revoke all on function public.entregar_pedido_bodega(uuid, uuid, jsonb, jsonb) from anon;
grant execute on function public.entregar_pedido_bodega(uuid, uuid, jsonb, jsonb) to authenticated;

select
  p.proname as funcion,
  pg_get_function_identity_arguments(p.oid) as parametros,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'entregar_pedido_bodega';
