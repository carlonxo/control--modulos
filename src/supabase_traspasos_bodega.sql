-- Traspasos seguros entre bodegas.
-- Ejecutar este archivo completo en el SQL Editor de Supabase.

begin;

alter table public.bodega_despachos
  add column if not exists destino_tipo text not null default 'obra',
  add column if not exists bodega_destino text,
  add column if not exists obra_destino text,
  add column if not exists estado_traspaso text not null default 'no_aplica',
  add column if not exists recibido_en timestamp with time zone,
  add column if not exists recibido_por text,
  add column if not exists recepcion_id uuid;

alter table public.bodega_recepciones
  add column if not exists despacho_origen_id uuid;

create sequence if not exists public.bodega_despachos_documento_seq
  as bigint
  start with 1
  increment by 1;

do $$
declare
  v_maximo bigint;
  v_actual bigint;
  v_usada boolean;
begin
  select coalesce(max(documento::bigint), 0)
  into v_maximo
  from public.bodega_despachos
  where btrim(coalesce(documento, '')) ~ '^[0-9]+$';

  select last_value, is_called
  into v_actual, v_usada
  from public.bodega_despachos_documento_seq;

  if v_maximo > v_actual or (v_maximo = v_actual and not v_usada and v_maximo > 0) then
    perform setval('public.bodega_despachos_documento_seq', v_maximo, true);
  end if;
end $$;

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

create index if not exists idx_bodega_despachos_traspasos_pendientes
on public.bodega_despachos (bodega_destino, estado_traspaso, creado_en desc)
where destino_tipo = 'bodega';

create unique index if not exists uq_bodega_recepciones_despacho_origen
on public.bodega_recepciones (despacho_origen_id)
where despacho_origen_id is not null;

create or replace function public.crear_traspaso_bodega(
  p_inventario_origen_id uuid,
  p_fecha date,
  p_documento text,
  p_bodega_origen text,
  p_bodega_destino text,
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
  v_bodega_origen text := lower(btrim(coalesce(p_bodega_origen, '')));
  v_bodega_destino text := lower(btrim(coalesce(p_bodega_destino, '')));
  v_despacho_id uuid;
  v_documento text;
  v_item jsonb;
  v_inventario_item public.bodega_inventario_items%rowtype;
  v_cantidad numeric;
begin
  if v_usuario_id is null then
    raise exception using errcode = '42501', message = 'Debes iniciar sesion para crear un traspaso.';
  end if;

  select lower(coalesce(p.rol, '')), lower(btrim(coalesce(p.bodega_asignada, '')))
  into v_rol, v_bodega_asignada
  from public.perfiles p
  where p.id = v_usuario_id;

  if coalesce(v_rol, '') not in ('admin', 'analista', 'bodega') then
    raise exception using errcode = '42501', message = 'Tu rol no tiene permiso para crear traspasos.';
  end if;

  if v_rol = 'bodega' and v_bodega_asignada <> v_bodega_origen then
    raise exception using errcode = '42501', message = 'Solo puedes despachar desde tu bodega asignada.';
  end if;

  if v_bodega_origen not in ('bayona', 'rental', 'montaña')
     or v_bodega_destino not in ('bayona', 'rental', 'montaña')
     or v_bodega_origen = v_bodega_destino then
    raise exception 'La bodega de origen o destino no es valida.';
  end if;

  perform inventario.id
  from public.bodega_inventarios inventario
  where inventario.id = p_inventario_origen_id
    and lower(btrim(coalesce(inventario.bodega, ''))) = v_bodega_origen
  for update;

  if not found then
    raise exception 'El inventario seleccionado no pertenece a la bodega de origen.';
  end if;

  if jsonb_typeof(coalesce(p_items, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'El traspaso debe contener al menos un material.';
  end if;

  insert into public.bodega_despachos (
    fecha, documento, bodega, usuario_nombre,
    destino_tipo, bodega_destino, estado_traspaso
  ) values (
    coalesce(p_fecha, current_date), coalesce(p_documento, ''), v_bodega_origen,
    coalesce(nullif(btrim(p_usuario_nombre), ''), v_usuario_id::text),
    'bodega', v_bodega_destino, 'pendiente'
  )
  returning id, documento into v_despacho_id, v_documento;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_cantidad := coalesce((v_item->>'cantidad')::numeric, 0);
    if v_cantidad <= 0 then
      raise exception 'Todas las cantidades del traspaso deben ser mayores que cero.';
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
    order by case when upper(regexp_replace(coalesce(item.codigo_bodega, ''), '[^A-Za-z0-9]', '', 'g')) =
                            upper(regexp_replace(coalesce(v_item->>'codigo', ''), '[^A-Za-z0-9]', '', 'g')) then 0 else 1 end
    limit 1
    for update;

    if not found then
      raise exception 'No se encontro el material % en el inventario de origen.',
        coalesce(nullif(v_item->>'descripcion', ''), v_item->>'codigo', 'sin identificar');
    end if;

    if coalesce(v_inventario_item.saldo_final, 0) < v_cantidad then
      raise exception 'Stock insuficiente para %: disponible %, solicitado %.',
        v_inventario_item.descripcion, coalesce(v_inventario_item.saldo_final, 0), v_cantidad;
    end if;

    update public.bodega_inventario_items
    set salidas = coalesce(salidas, 0) + v_cantidad,
        saldo_final = coalesce(saldo_final, 0) - v_cantidad
    where id = v_inventario_item.id;

    insert into public.bodega_despacho_items (
      despacho_id, codigo_bodega, descripcion, unidad, cantidad
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
    'estado_traspaso', 'pendiente',
    'bodega_destino', v_bodega_destino
  );
end;
$$;

create or replace function public.recepcionar_traspaso_bodega(
  p_despacho_id uuid,
  p_inventario_destino_id uuid,
  p_usuario_nombre text
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
  v_despacho public.bodega_despachos%rowtype;
  v_recepcion_id uuid;
  v_item record;
  v_inventario_item public.bodega_inventario_items%rowtype;
  v_nombre_usuario text;
  v_items_actualizados integer := 0;
begin
  if v_usuario_id is null then
    raise exception using errcode = '42501', message = 'Debes iniciar sesion para recepcionar el traspaso.';
  end if;

  select lower(coalesce(p.rol, '')), lower(btrim(coalesce(p.bodega_asignada, ''))), p.nombre
  into v_rol, v_bodega_asignada, v_nombre_usuario
  from public.perfiles p
  where p.id = v_usuario_id;

  if coalesce(v_rol, '') not in ('admin', 'analista', 'bodega') then
    raise exception using errcode = '42501', message = 'Tu rol no tiene permiso para recepcionar traspasos.';
  end if;

  select despacho.*
  into v_despacho
  from public.bodega_despachos despacho
  where despacho.id = p_despacho_id
  for update;

  if not found then
    raise exception 'No se encontro el traspaso solicitado.';
  end if;

  if v_despacho.destino_tipo <> 'bodega' then
    raise exception 'El despacho seleccionado no es un traspaso entre bodegas.';
  end if;

  if v_despacho.estado_traspaso = 'recibido' then
    return jsonb_build_object(
      'ok', true,
      'ya_recepcionado', true,
      'despacho_id', v_despacho.id,
      'recepcion_id', v_despacho.recepcion_id,
      'items_actualizados', 0
    );
  end if;

  if v_despacho.estado_traspaso <> 'pendiente' then
    raise exception 'El traspaso no esta pendiente. Estado actual: %.', v_despacho.estado_traspaso;
  end if;

  if v_rol = 'bodega' and v_bodega_asignada <> lower(btrim(v_despacho.bodega_destino)) then
    raise exception using errcode = '42501', message = 'Este traspaso pertenece a otra bodega.';
  end if;

  perform inventario.id
  from public.bodega_inventarios inventario
  where inventario.id = p_inventario_destino_id
    and lower(btrim(coalesce(inventario.bodega, ''))) = lower(btrim(v_despacho.bodega_destino))
  for update;

  if not found then
    raise exception 'El inventario seleccionado no pertenece a la bodega de destino.';
  end if;

  if not exists (select 1 from public.bodega_despacho_items item where item.despacho_id = p_despacho_id) then
    raise exception 'El traspaso no contiene materiales.';
  end if;

  insert into public.bodega_recepciones (
    fecha, orden_compra, numero_factura, numero_recepcion,
    bodega, usuario_nombre, despacho_origen_id
  ) values (
    current_date, '', '', coalesce(nullif(btrim(v_despacho.documento), ''), 'TRASPASO'),
    v_despacho.bodega_destino,
    coalesce(nullif(btrim(p_usuario_nombre), ''), nullif(btrim(v_nombre_usuario), ''), v_usuario_id::text),
    v_despacho.id
  )
  returning id into v_recepcion_id;

  for v_item in
    select item.*
    from public.bodega_despacho_items item
    where item.despacho_id = p_despacho_id
    order by item.id
    for update
  loop
    select inventario_item.*
    into v_inventario_item
    from public.bodega_inventario_items inventario_item
    where inventario_item.inventario_id = p_inventario_destino_id
      and (
        (nullif(btrim(coalesce(v_item.codigo_bodega, '')), '') is not null
          and upper(regexp_replace(coalesce(inventario_item.codigo_bodega, ''), '[^A-Za-z0-9]', '', 'g')) =
              upper(regexp_replace(coalesce(v_item.codigo_bodega, ''), '[^A-Za-z0-9]', '', 'g')))
        or
        (nullif(btrim(coalesce(v_item.descripcion, '')), '') is not null
          and upper(regexp_replace(coalesce(inventario_item.descripcion, ''), '[^A-Za-z0-9]', '', 'g')) =
              upper(regexp_replace(coalesce(v_item.descripcion, ''), '[^A-Za-z0-9]', '', 'g')))
      )
    order by case when upper(regexp_replace(coalesce(inventario_item.codigo_bodega, ''), '[^A-Za-z0-9]', '', 'g')) =
                            upper(regexp_replace(coalesce(v_item.codigo_bodega, ''), '[^A-Za-z0-9]', '', 'g')) then 0 else 1 end
    limit 1
    for update;

    if found then
      update public.bodega_inventario_items
      set entradas = coalesce(entradas, 0) + v_item.cantidad,
          saldo_final = coalesce(saldo_final, 0) + v_item.cantidad
      where id = v_inventario_item.id;
    else
      insert into public.bodega_inventario_items (
        inventario_id, codigo_bodega, descripcion, unidad,
        entradas, salidas, saldo_inicial, stock_container, saldo_final
      ) values (
        p_inventario_destino_id, coalesce(v_item.codigo_bodega, ''),
        coalesce(v_item.descripcion, ''), coalesce(v_item.unidad, ''),
        v_item.cantidad, 0, 0, 0, v_item.cantidad
      );
    end if;

    insert into public.bodega_recepcion_items (
      recepcion_id, codigo_bodega, descripcion, unidad, cantidad
    ) values (
      v_recepcion_id, coalesce(v_item.codigo_bodega, ''),
      coalesce(v_item.descripcion, ''), coalesce(v_item.unidad, ''), v_item.cantidad
    );

    v_items_actualizados := v_items_actualizados + 1;
  end loop;

  update public.bodega_despachos
  set estado_traspaso = 'recibido',
      recibido_en = clock_timestamp(),
      recibido_por = coalesce(nullif(btrim(p_usuario_nombre), ''), nullif(btrim(v_nombre_usuario), ''), v_usuario_id::text),
      recepcion_id = v_recepcion_id
  where id = p_despacho_id;

  return jsonb_build_object(
    'ok', true,
    'ya_recepcionado', false,
    'despacho_id', p_despacho_id,
    'recepcion_id', v_recepcion_id,
    'items_actualizados', v_items_actualizados
  );
end;
$$;

create or replace function public.cargar_traspasos_pendientes_bodega(
  p_bodega_destino text,
  p_limite integer default 100
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
  v_bodega_asignada text;
  v_destino text := replace(
    regexp_replace(lower(btrim(coalesce(p_bodega_destino, ''))), '^bodega[[:space:]]+', ''),
    'montana',
    'montaña'
  );
  v_limite integer := greatest(1, least(coalesce(p_limite, 100), 500));
  v_despacho record;
  v_items jsonb;
  v_resultado jsonb := '[]'::jsonb;
begin
  if v_usuario_id is null then
    raise exception using errcode = '42501', message = 'Debes iniciar sesion para consultar traspasos.';
  end if;

  select
    lower(coalesce(perfil.rol, '')),
    replace(
      regexp_replace(lower(btrim(coalesce(perfil.bodega_asignada, ''))), '^bodega[[:space:]]+', ''),
      'montana',
      'montaña'
    )
  into v_rol, v_bodega_asignada
  from public.perfiles perfil
  where perfil.id = v_usuario_id;

  if coalesce(v_rol, '') not in ('admin', 'analista', 'bodega') then
    raise exception using errcode = '42501', message = 'Tu rol no tiene permiso para consultar traspasos.';
  end if;

  if v_destino not in ('bayona', 'rental', 'montaña') then
    raise exception 'La bodega de destino no es valida.';
  end if;

  if v_rol <> 'admin' and v_bodega_asignada <> v_destino then
    raise exception using errcode = '42501', message = 'Solo puedes consultar traspasos destinados a tu bodega.';
  end if;

  for v_despacho in
    select despacho.*
    from public.bodega_despachos despacho
    where despacho.destino_tipo = 'bodega'
      and despacho.estado_traspaso = 'pendiente'
      and replace(
        regexp_replace(lower(btrim(coalesce(despacho.bodega_destino, ''))), '^bodega[[:space:]]+', ''),
        'montana',
        'montaña'
      ) = v_destino
    order by despacho.creado_en desc
    limit v_limite
  loop
    select coalesce(jsonb_agg(to_jsonb(item) order by item.creado_en, item.id), '[]'::jsonb)
    into v_items
    from public.bodega_despacho_items item
    where item.despacho_id = v_despacho.id;

    v_resultado := v_resultado || jsonb_build_array(
      to_jsonb(v_despacho) || jsonb_build_object('items', v_items)
    );
  end loop;

  return jsonb_build_object('bodega_destino', v_destino, 'traspasos', v_resultado);
end;
$$;

revoke all on function public.crear_traspaso_bodega(uuid, date, text, text, text, text, jsonb) from public;
revoke all on function public.crear_traspaso_bodega(uuid, date, text, text, text, text, jsonb) from anon;
grant execute on function public.crear_traspaso_bodega(uuid, date, text, text, text, text, jsonb) to authenticated;

revoke all on function public.recepcionar_traspaso_bodega(uuid, uuid, text) from public;
revoke all on function public.recepcionar_traspaso_bodega(uuid, uuid, text) from anon;
grant execute on function public.recepcionar_traspaso_bodega(uuid, uuid, text) to authenticated;

revoke all on function public.cargar_traspasos_pendientes_bodega(text, integer) from public;
revoke all on function public.cargar_traspasos_pendientes_bodega(text, integer) from anon;
grant execute on function public.cargar_traspasos_pendientes_bodega(text, integer) to authenticated;

-- Las cabeceras y sus detalles deben poder leerse para mostrar la notificación.
grant select on table public.bodega_despachos to authenticated;
grant select on table public.bodega_despacho_items to authenticated;

drop policy if exists bodega_despachos_select_roles on public.bodega_despachos;
create policy bodega_despachos_select_roles
on public.bodega_despachos
for select
to authenticated
using (public.usuario_tiene_rol(array['admin', 'analista', 'bodega']));

drop policy if exists bodega_despacho_items_select_roles on public.bodega_despacho_items;
create policy bodega_despacho_items_select_roles
on public.bodega_despacho_items
for select
to authenticated
using (
  public.usuario_tiene_rol(array['admin', 'analista', 'bodega'])
  and exists (
    select 1
    from public.bodega_despachos despacho
    where despacho.id = bodega_despacho_items.despacho_id
  )
);

commit;

select
  p.proname as funcion,
  pg_get_function_identity_arguments(p.oid) as parametros,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('crear_traspaso_bodega', 'recepcionar_traspaso_bodega', 'cargar_traspasos_pendientes_bodega')
order by p.proname;
