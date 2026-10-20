-- Correlativo automático para documentos de merma.
-- Todos los materiales registrados en un mismo formulario comparten el mismo número.

begin;

alter table public.bodega_mermas
add column if not exists numero_documento text;

create sequence if not exists public.bodega_mermas_documento_seq;

do $$
declare
  v_ultimo bigint;
  v_usada boolean;
  v_maximo bigint;
  v_siguiente bigint;
begin
  select last_value, is_called
  into v_ultimo, v_usada
  from public.bodega_mermas_documento_seq;

  select max((btrim(numero_documento))::bigint)
  into v_maximo
  from public.bodega_mermas
  where btrim(coalesce(numero_documento, '')) ~ '^[0-9]+$';

  v_siguiente := greatest(
    case when v_usada then v_ultimo + 1 else v_ultimo end,
    coalesce(v_maximo, 0) + 1
  );

  perform setval('public.bodega_mermas_documento_seq', v_siguiente, false);
end;
$$;

create index if not exists idx_bodega_mermas_numero_documento
on public.bodega_mermas (numero_documento);

create or replace function public.proximo_numero_documento_merma_bodega()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ultimo bigint;
  v_usada boolean;
  v_maximo bigint;
  v_siguiente bigint;
begin
  select last_value, is_called
  into v_ultimo, v_usada
  from public.bodega_mermas_documento_seq;

  select max((btrim(numero_documento))::bigint)
  into v_maximo
  from public.bodega_mermas
  where btrim(coalesce(numero_documento, '')) ~ '^[0-9]+$';

  v_siguiente := greatest(
    case when v_usada then v_ultimo + 1 else v_ultimo end,
    coalesce(v_maximo, 0) + 1
  );

  return lpad(v_siguiente::text, 6, '0');
end;
$$;

revoke all on function public.proximo_numero_documento_merma_bodega() from public;
revoke all on function public.proximo_numero_documento_merma_bodega() from anon;
grant execute on function public.proximo_numero_documento_merma_bodega() to authenticated;

create or replace function public.registrar_merma_inventario_bodega_interna(
  p_item_id uuid,
  p_cantidad numeric,
  p_motivo text,
  p_observacion text,
  p_fecha date,
  p_numero_documento text
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
  v_nombre_usuario text;
  v_item public.bodega_inventario_items%rowtype;
  v_bodega text;
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_observacion text := btrim(coalesce(p_observacion, ''));
  v_saldo_anterior numeric;
  v_saldo_posterior numeric;
  v_merma_id uuid;
  v_numero_documento text := nullif(btrim(coalesce(p_numero_documento, '')), '');
begin
  if v_usuario_id is null then
    raise exception 'Debes iniciar sesión para registrar una merma.';
  end if;

  select
    lower(btrim(coalesce(perfil.rol, ''))),
    replace(
      regexp_replace(lower(btrim(coalesce(perfil.bodega_asignada, ''))), '^bodega[[:space:]]+', ''),
      'montana',
      'montaña'
    ),
    coalesce(perfil.nombre, '')
  into v_rol, v_bodega_asignada, v_nombre_usuario
  from public.perfiles perfil
  where perfil.id = v_usuario_id;

  if coalesce(v_rol, '') not in ('admin', 'bodega', 'analista') then
    raise exception 'Tu rol no tiene permiso para registrar mermas.';
  end if;

  if p_item_id is null then
    raise exception 'Debes seleccionar un material.';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad de merma debe ser mayor que cero.';
  end if;

  if length(v_motivo) < 3 then
    raise exception 'Debes indicar el motivo de la merma.';
  end if;

  select item.*
  into v_item
  from public.bodega_inventario_items item
  where item.id = p_item_id
  for update of item;

  if not found then
    raise exception 'El material seleccionado ya no existe en el inventario.';
  end if;

  select replace(
    regexp_replace(lower(btrim(coalesce(inventario.bodega, ''))), '^bodega[[:space:]]+', ''),
    'montana',
    'montaña'
  )
  into v_bodega
  from public.bodega_inventarios inventario
  where inventario.id = v_item.inventario_id;

  if v_rol <> 'admin' and v_bodega_asignada <> v_bodega then
    raise exception 'No puedes registrar mermas en una bodega diferente de la asignada.';
  end if;

  v_saldo_anterior := coalesce(v_item.saldo_final, 0);
  if p_cantidad > v_saldo_anterior then
    raise exception 'La merma (%) supera el saldo disponible (%).', p_cantidad, v_saldo_anterior;
  end if;

  if v_numero_documento is null then
    v_numero_documento := lpad(nextval('public.bodega_mermas_documento_seq')::text, 6, '0');
  end if;

  v_saldo_posterior := v_saldo_anterior - p_cantidad;

  update public.bodega_inventario_items
  set salidas = coalesce(salidas, 0) + p_cantidad,
      saldo_final = v_saldo_posterior
  where id = p_item_id;

  insert into public.bodega_mermas (
    inventario_id,
    inventario_item_id,
    bodega,
    numero_documento,
    codigo_bodega,
    descripcion,
    unidad,
    cantidad,
    motivo,
    observacion,
    saldo_anterior,
    saldo_posterior,
    registrado_por,
    registrado_por_nombre,
    fecha
  ) values (
    v_item.inventario_id,
    v_item.id,
    v_bodega,
    v_numero_documento,
    v_item.codigo_bodega,
    v_item.descripcion,
    coalesce(v_item.unidad, ''),
    p_cantidad,
    v_motivo,
    v_observacion,
    v_saldo_anterior,
    v_saldo_posterior,
    v_usuario_id,
    v_nombre_usuario,
    coalesce(p_fecha, current_date)
  )
  returning id into v_merma_id;

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
    v_item.codigo_bodega,
    coalesce(p_fecha, current_date),
    'MERMA',
    'MERMA-' || v_numero_documento,
    format('Motivo: %s%s', v_motivo, case when v_observacion = '' then '' else ' | ' || v_observacion end),
    p_cantidad
  );

  return jsonb_build_object(
    'merma_id', v_merma_id,
    'numero_documento', v_numero_documento,
    'item_id', v_item.id,
    'codigo', v_item.codigo_bodega,
    'cantidad', p_cantidad,
    'saldo_anterior', v_saldo_anterior,
    'saldo_posterior', v_saldo_posterior,
    'bodega', v_bodega
  );
end;
$$;

revoke all on function public.registrar_merma_inventario_bodega_interna(uuid, numeric, text, text, date, text) from public;
revoke all on function public.registrar_merma_inventario_bodega_interna(uuid, numeric, text, text, date, text) from anon;
revoke all on function public.registrar_merma_inventario_bodega_interna(uuid, numeric, text, text, date, text) from authenticated;

create or replace function public.registrar_merma_inventario_bodega(
  p_item_id uuid,
  p_cantidad numeric,
  p_motivo text,
  p_observacion text default ''
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.registrar_merma_inventario_bodega_interna(
    p_item_id,
    p_cantidad,
    p_motivo,
    p_observacion,
    current_date,
    null
  );
$$;

revoke all on function public.registrar_merma_inventario_bodega(uuid, numeric, text, text) from public;
revoke all on function public.registrar_merma_inventario_bodega(uuid, numeric, text, text) from anon;
grant execute on function public.registrar_merma_inventario_bodega(uuid, numeric, text, text) to authenticated;

create or replace function public.registrar_mermas_inventario_bodega(
  p_items jsonb,
  p_fecha date,
  p_motivo text,
  p_observacion text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_resultado jsonb;
  v_resultados jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_numero_documento text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Debes agregar al menos un material a la merma.';
  end if;

  if jsonb_array_length(p_items) > 100 then
    raise exception 'No puedes registrar más de 100 materiales en una sola merma.';
  end if;

  v_numero_documento := lpad(nextval('public.bodega_mermas_documento_seq')::text, 6, '0');

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_resultado := public.registrar_merma_inventario_bodega_interna(
      (v_item->>'item_id')::uuid,
      (v_item->>'cantidad')::numeric,
      p_motivo,
      p_observacion,
      coalesce(p_fecha, current_date),
      v_numero_documento
    );
    v_resultados := v_resultados || jsonb_build_array(v_resultado);
    v_total := v_total + 1;
  end loop;

  return jsonb_build_object(
    'numero_documento', v_numero_documento,
    'total_materiales', v_total,
    'registros', v_resultados
  );
end;
$$;

revoke all on function public.registrar_mermas_inventario_bodega(jsonb, date, text, text) from public;
revoke all on function public.registrar_mermas_inventario_bodega(jsonb, date, text, text) from anon;
grant execute on function public.registrar_mermas_inventario_bodega(jsonb, date, text, text) to authenticated;

commit;

select public.proximo_numero_documento_merma_bodega() as proximo_documento_merma;
