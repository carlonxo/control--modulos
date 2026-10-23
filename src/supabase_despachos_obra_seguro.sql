-- Despacho seguro de materiales hacia una obra.
-- Crea cabecera, detalle y descuento de inventario en una sola transacción.

begin;

create sequence if not exists public.bodega_despachos_documento_seq
  as bigint
  start with 1
  increment by 1;

create or replace function public.asignar_numero_documento_despacho_bodega()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.documento := lpad(nextval('public.bodega_despachos_documento_seq')::text, 6, '0');
  return new;
end;
$$;

drop trigger if exists trg_asignar_numero_documento_despacho_bodega on public.bodega_despachos;
create trigger trg_asignar_numero_documento_despacho_bodega
before insert on public.bodega_despachos
for each row
execute function public.asignar_numero_documento_despacho_bodega();

create or replace function public.crear_despacho_obra_bodega(
  p_inventario_origen_id uuid,
  p_fecha date,
  p_documento text,
  p_bodega_origen text,
  p_obra_destino text,
  p_usuario_nombre text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_rol text;
  v_bodega_asignada text;
  v_bodega_origen text := replace(
    regexp_replace(lower(btrim(coalesce(p_bodega_origen, ''))), '^bodega[[:space:]]+', ''),
    'montana',
    'montaña'
  );
  v_obra_destino text := btrim(coalesce(p_obra_destino, ''));
  v_despacho_id uuid;
  v_documento text;
  v_item jsonb;
  v_inventario_item public.bodega_inventario_items%rowtype;
  v_cantidad numeric;
begin
  if v_usuario_id is null then
    raise exception using errcode = '42501', message = 'Debes iniciar sesión para crear un despacho.';
  end if;

  select
    lower(btrim(coalesce(perfil.rol, ''))),
    replace(
      regexp_replace(lower(btrim(coalesce(perfil.bodega_asignada, ''))), '^bodega[[:space:]]+', ''),
      'montana',
      'montaña'
    )
  into v_rol, v_bodega_asignada
  from public.perfiles perfil
  where perfil.id = v_usuario_id;

  if coalesce(v_rol, '') not in ('admin', 'analista', 'bodega') then
    raise exception using errcode = '42501', message = 'Tu rol no tiene permiso para crear despachos.';
  end if;

  if v_bodega_origen not in ('bayona', 'rental', 'montaña') then
    raise exception 'La bodega de origen no es válida.';
  end if;

  if v_rol <> 'admin' and v_bodega_asignada <> v_bodega_origen then
    raise exception using errcode = '42501', message = 'Solo puedes despachar desde tu bodega asignada.';
  end if;

  if v_obra_destino = '' then
    raise exception 'Debes indicar el nombre de la obra de destino.';
  end if;

  perform inventario.id
  from public.bodega_inventarios inventario
  where inventario.id = p_inventario_origen_id
    and replace(
      regexp_replace(lower(btrim(coalesce(inventario.bodega, ''))), '^bodega[[:space:]]+', ''),
      'montana',
      'montaña'
    ) = v_bodega_origen
  for update;

  if not found then
    raise exception 'El inventario seleccionado no pertenece a la bodega de origen.';
  end if;

  if jsonb_typeof(coalesce(p_items, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'El despacho debe contener al menos un material.';
  end if;

  if jsonb_array_length(p_items) > 100 then
    raise exception 'No puedes despachar más de 100 materiales en un documento.';
  end if;

  insert into public.bodega_despachos (
    fecha,
    documento,
    bodega,
    usuario_nombre,
    destino_tipo,
    obra_destino,
    estado_traspaso
  ) values (
    coalesce(p_fecha, current_date),
    coalesce(p_documento, ''),
    v_bodega_origen,
    coalesce(nullif(btrim(p_usuario_nombre), ''), v_usuario_id::text),
    'obra',
    v_obra_destino,
    'no_aplica'
  )
  returning id, documento into v_despacho_id, v_documento;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_cantidad := coalesce((v_item->>'cantidad')::numeric, 0);
    if v_cantidad <= 0 then
      raise exception 'Todas las cantidades del despacho deben ser mayores que cero.';
    end if;

    select item.*
    into v_inventario_item
    from public.bodega_inventario_items item
    where item.inventario_id = p_inventario_origen_id
      and (
        (nullif(btrim(coalesce(v_item->>'codigo', '')), '') is not null
          and upper(regexp_replace(coalesce(item.codigo_bodega, ''), '[^A-Za-z0-9]', '', 'g')) =
              upper(regexp_replace(coalesce(v_item->>'codigo', ''), '[^A-Za-z0-9]', '', 'g')))
        or
        (nullif(btrim(coalesce(v_item->>'descripcion', '')), '') is not null
          and upper(regexp_replace(coalesce(item.descripcion, ''), '[^A-Za-z0-9]', '', 'g')) =
              upper(regexp_replace(coalesce(v_item->>'descripcion', ''), '[^A-Za-z0-9]', '', 'g')))
      )
    order by case
      when upper(regexp_replace(coalesce(item.codigo_bodega, ''), '[^A-Za-z0-9]', '', 'g')) =
           upper(regexp_replace(coalesce(v_item->>'codigo', ''), '[^A-Za-z0-9]', '', 'g'))
      then 0 else 1 end
    limit 1
    for update;

    if not found then
      raise exception 'No se encontró el material % en el inventario de origen.',
        coalesce(nullif(v_item->>'descripcion', ''), v_item->>'codigo', 'sin identificar');
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

    insert into public.bodega_despacho_items (
      despacho_id,
      codigo_bodega,
      descripcion,
      unidad,
      cantidad
    ) values (
      v_despacho_id,
      coalesce(nullif(btrim(v_item->>'codigo'), ''), v_inventario_item.codigo_bodega, ''),
      coalesce(nullif(btrim(v_item->>'descripcion'), ''), v_inventario_item.descripcion, ''),
      coalesce(nullif(btrim(v_item->>'unidad'), ''), v_inventario_item.unidad, ''),
      v_cantidad
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'id', v_despacho_id,
    'despacho_id', v_despacho_id,
    'documento', v_documento,
    'destino_tipo', 'obra',
    'obra_destino', v_obra_destino
  );
end;
$$;

revoke all on function public.crear_despacho_obra_bodega(uuid, date, text, text, text, text, jsonb) from public;
revoke all on function public.crear_despacho_obra_bodega(uuid, date, text, text, text, text, jsonb) from anon;
grant execute on function public.crear_despacho_obra_bodega(uuid, date, text, text, text, text, jsonb) to authenticated;

commit;

select
  p.proname as funcion,
  pg_get_function_identity_arguments(p.oid) as parametros,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'crear_despacho_obra_bodega';
