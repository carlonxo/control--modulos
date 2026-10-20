-- Registro trazable de materiales dañados, perdidos o deteriorados.
-- Descuenta el saldo del inventario y conserva el historial por bodega.

begin;

create table if not exists public.bodega_mermas (
  id uuid primary key default gen_random_uuid(),
  inventario_id uuid not null references public.bodega_inventarios(id) on delete restrict,
  inventario_item_id uuid references public.bodega_inventario_items(id) on delete set null,
  bodega text not null,
  codigo_bodega text not null,
  descripcion text not null,
  unidad text not null default '',
  cantidad numeric not null check (cantidad > 0),
  motivo text not null,
  observacion text not null default '',
  saldo_anterior numeric not null check (saldo_anterior >= 0),
  saldo_posterior numeric not null check (saldo_posterior >= 0),
  registrado_por uuid not null,
  registrado_por_nombre text not null default '',
  fecha date not null default current_date,
  creado_en timestamptz not null default now()
);

alter table public.bodega_mermas
add column if not exists fecha date not null default current_date;

create index if not exists idx_bodega_mermas_bodega_fecha
on public.bodega_mermas (bodega, creado_en desc);

create index if not exists idx_bodega_mermas_item
on public.bodega_mermas (inventario_item_id, creado_en desc);

alter table public.bodega_mermas enable row level security;

drop policy if exists bodega_mermas_select_roles on public.bodega_mermas;
create policy bodega_mermas_select_roles
on public.bodega_mermas
for select
to authenticated
using (
  exists (
    select 1
    from public.perfiles perfil
    where perfil.id = auth.uid()
      and (
        lower(btrim(coalesce(perfil.rol, ''))) = 'admin'
        or (
          lower(btrim(coalesce(perfil.rol, ''))) in ('bodega', 'analista')
          and replace(
            regexp_replace(lower(btrim(coalesce(perfil.bodega_asignada, ''))), '^bodega[[:space:]]+', ''),
            'montana',
            'montaña'
          ) = bodega_mermas.bodega
        )
      )
  )
);

revoke all on table public.bodega_mermas from public;
revoke all on table public.bodega_mermas from anon;
revoke all on table public.bodega_mermas from authenticated;
grant select on table public.bodega_mermas to authenticated;

create or replace function public.registrar_merma_inventario_bodega(
  p_item_id uuid,
  p_cantidad numeric,
  p_motivo text,
  p_observacion text default ''
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
  v_saldo_posterior := v_saldo_anterior - p_cantidad;

  update public.bodega_inventario_items
  set salidas = coalesce(salidas, 0) + p_cantidad,
      saldo_final = v_saldo_posterior
  where id = p_item_id;

  insert into public.bodega_mermas (
    inventario_id,
    inventario_item_id,
    bodega,
    codigo_bodega,
    descripcion,
    unidad,
    cantidad,
    motivo,
    observacion,
    saldo_anterior,
    saldo_posterior,
    registrado_por,
    registrado_por_nombre
  ) values (
    v_item.inventario_id,
    v_item.id,
    v_bodega,
    v_item.codigo_bodega,
    v_item.descripcion,
    coalesce(v_item.unidad, ''),
    p_cantidad,
    v_motivo,
    v_observacion,
    v_saldo_anterior,
    v_saldo_posterior,
    v_usuario_id,
    v_nombre_usuario
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
    current_date,
    'MERMA',
    'MERMA-' || left(v_merma_id::text, 8),
    format('Motivo: %s%s', v_motivo, case when v_observacion = '' then '' else ' | ' || v_observacion end),
    p_cantidad
  );

  return jsonb_build_object(
    'merma_id', v_merma_id,
    'item_id', v_item.id,
    'codigo', v_item.codigo_bodega,
    'cantidad', p_cantidad,
    'saldo_anterior', v_saldo_anterior,
    'saldo_posterior', v_saldo_posterior,
    'bodega', v_bodega
  );
end;
$$;

revoke all on function public.registrar_merma_inventario_bodega(uuid, numeric, text, text) from public;
revoke all on function public.registrar_merma_inventario_bodega(uuid, numeric, text, text) from anon;
grant execute on function public.registrar_merma_inventario_bodega(uuid, numeric, text, text) to authenticated;

drop function if exists public.registrar_mermas_inventario_bodega(jsonb, text, text);

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
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Debes agregar al menos un material a la merma.';
  end if;

  if jsonb_array_length(p_items) > 100 then
    raise exception 'No puedes registrar más de 100 materiales en una sola merma.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_resultado := public.registrar_merma_inventario_bodega(
      (v_item->>'item_id')::uuid,
      (v_item->>'cantidad')::numeric,
      p_motivo,
      p_observacion
    );
    update public.bodega_mermas
    set fecha = coalesce(p_fecha, current_date)
    where id = (v_resultado->>'merma_id')::uuid;
    v_resultados := v_resultados || jsonb_build_array(v_resultado);
    v_total := v_total + 1;
  end loop;

  return jsonb_build_object(
    'total_materiales', v_total,
    'registros', v_resultados
  );
end;
$$;

revoke all on function public.registrar_mermas_inventario_bodega(jsonb, date, text, text) from public;
revoke all on function public.registrar_mermas_inventario_bodega(jsonb, date, text, text) from anon;
grant execute on function public.registrar_mermas_inventario_bodega(jsonb, date, text, text) to authenticated;

-- Integra las mermas al visor general de auditoría cuando este ya está instalado.
do $$
begin
  if to_regprocedure('public.registrar_evento_auditoria()') is not null then
    execute 'drop trigger if exists trigger_auditoria_cambios on public.bodega_mermas';
    execute 'create trigger trigger_auditoria_cambios
      after insert or update or delete on public.bodega_mermas
      for each row execute function public.registrar_evento_auditoria()';
  end if;
end;
$$;

commit;

select
  p.proname as funcion,
  pg_get_function_identity_arguments(p.oid) as parametros,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'registrar_merma_inventario_bodega';
