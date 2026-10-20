-- Correccion manual y trazable de inventario, disponible exclusivamente para admin.

begin;

create or replace function public.corregir_inventario_bodega(
  p_item_id uuid,
  p_nuevo_saldo numeric,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol text;
  v_item public.bodega_inventario_items%rowtype;
  v_bodega text;
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_delta numeric;
  v_entradas numeric;
  v_salidas numeric;
begin
  select perfil.rol
  into v_rol
  from public.perfiles perfil
  where perfil.id = auth.uid();

  if coalesce(v_rol, '') <> 'admin' then
    raise exception 'Solo un administrador puede corregir el inventario.';
  end if;

  if p_item_id is null then
    raise exception 'Debes seleccionar un material.';
  end if;

  if p_nuevo_saldo is null or p_nuevo_saldo < 0 then
    raise exception 'El saldo corregido debe ser igual o mayor que cero.';
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

  v_delta := p_nuevo_saldo - coalesce(v_item.saldo_final, 0);
  v_entradas := coalesce(v_item.entradas, 0) + greatest(v_delta, 0);
  v_salidas := coalesce(v_item.salidas, 0) + greatest(-v_delta, 0);

  if v_delta = 0 then
    raise exception 'El nuevo saldo es igual al saldo actual.';
  end if;

  update public.bodega_inventario_items
  set entradas = v_entradas,
      salidas = v_salidas,
      saldo_final = p_nuevo_saldo
  where id = p_item_id;

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
    'CORRECCION INVENTARIO',
    'AJUSTE ADMIN',
    format(
      'Bodega: %s | Saldo anterior: %s | Saldo corregido: %s | Motivo: %s',
      coalesce(v_bodega, ''),
      coalesce(v_item.saldo_final, 0),
      p_nuevo_saldo,
      v_motivo
    ),
    v_delta
  );

  return jsonb_build_object(
    'item_id', p_item_id,
    'codigo', v_item.codigo_bodega,
    'saldo_anterior', coalesce(v_item.saldo_final, 0),
    'saldo_nuevo', p_nuevo_saldo,
    'diferencia', v_delta,
    'motivo', v_motivo
  );
end;
$$;

revoke all on function public.corregir_inventario_bodega(uuid, numeric, text) from public;
revoke all on function public.corregir_inventario_bodega(uuid, numeric, text) from anon;
grant execute on function public.corregir_inventario_bodega(uuid, numeric, text) to authenticated;

commit;

select
  p.proname as funcion,
  pg_get_function_identity_arguments(p.oid) as parametros,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'corregir_inventario_bodega';
