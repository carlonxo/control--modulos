-- Endurecimiento de integridad para pedidos e inventario de bodega.
-- El bloque inicial valida los datos actuales. Ante cualquier inconsistencia,
-- toda la operacion se revierte y ninguna restriccion queda aplicada.

begin;

do $$
declare
  v_total bigint;
begin
  select count(*) into v_total
  from public.vales_bodega_items
  where vale_id is null;
  if v_total > 0 then
    raise exception 'Hay % materiales sin pedido asociado (vale_id nulo).', v_total;
  end if;

  select count(*) into v_total
  from public.vales_bodega_items
  where cantidad is null or cantidad <= 0;
  if v_total > 0 then
    raise exception 'Hay % materiales de pedidos con cantidad nula, cero o negativa.', v_total;
  end if;

  select count(*) into v_total
  from public.vales_bodega_items
  where btrim(coalesce(material_balance, '')) = '';
  if v_total > 0 then
    raise exception 'Hay % materiales de pedidos sin descripcion.', v_total;
  end if;

  select count(*) into v_total
  from public.vales_bodega
  where tipo_ingreso is null
     or tipo_ingreso not in ('archivo', 'manual', 'pedido_app', 'devolucion_app');
  if v_total > 0 then
    raise exception 'Hay % vales con un tipo de ingreso no reconocido.', v_total;
  end if;

  select count(*) into v_total
  from public.vales_bodega
  where estado_bodega not in ('solicitado', 'pendiente', 'entregado', 'denegado');
  if v_total > 0 then
    raise exception 'Hay % vales con un estado de bodega no reconocido.', v_total;
  end if;

  select count(*) into v_total
  from public.vales_bodega
  where estado_bodega in ('entregado', 'denegado')
    and (
      fecha_entrega_bodega is null
      or btrim(coalesce(entregado_por, '')) = ''
    );
  if v_total > 0 then
    raise exception 'Hay % pedidos cerrados sin fecha o responsable.', v_total;
  end if;

  select count(*) into v_total
  from public.bodega_inventario_items
  where btrim(coalesce(codigo_bodega, '')) = ''
     or btrim(coalesce(descripcion, '')) = '';
  if v_total > 0 then
    raise exception 'Hay % materiales de inventario sin codigo o descripcion.', v_total;
  end if;

  select count(*) into v_total
  from public.bodega_inventario_items
  where entradas is null or entradas < 0
     or salidas is null or salidas < 0
     or saldo_inicial is null or saldo_inicial < 0
     or stock_container is null or stock_container < 0
     or saldo_final is null or saldo_final < 0;
  if v_total > 0 then
    raise exception 'Hay % materiales de inventario con cantidades nulas o negativas.', v_total;
  end if;
end;
$$;

alter table public.vales_bodega_items
  alter column vale_id set not null,
  alter column cantidad set not null,
  alter column material_balance set not null;

alter table public.vales_bodega
  alter column tipo_ingreso set default 'archivo',
  alter column tipo_ingreso set not null;

alter table public.bodega_inventario_items
  alter column entradas set default 0,
  alter column entradas set not null,
  alter column salidas set default 0,
  alter column salidas set not null,
  alter column saldo_inicial set default 0,
  alter column saldo_inicial set not null,
  alter column stock_container set default 0,
  alter column stock_container set not null,
  alter column saldo_final set default 0,
  alter column saldo_final set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vales_bodega_items_cantidad_positiva'
      and conrelid = 'public.vales_bodega_items'::regclass
  ) then
    alter table public.vales_bodega_items
      add constraint vales_bodega_items_cantidad_positiva
      check (cantidad > 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'vales_bodega_items_descripcion_requerida'
      and conrelid = 'public.vales_bodega_items'::regclass
  ) then
    alter table public.vales_bodega_items
      add constraint vales_bodega_items_descripcion_requerida
      check (btrim(material_balance) <> '') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'vales_bodega_tipo_ingreso_valido'
      and conrelid = 'public.vales_bodega'::regclass
  ) then
    alter table public.vales_bodega
      add constraint vales_bodega_tipo_ingreso_valido
      check (tipo_ingreso in ('archivo', 'manual', 'pedido_app', 'devolucion_app')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'vales_bodega_estado_valido'
      and conrelid = 'public.vales_bodega'::regclass
  ) then
    alter table public.vales_bodega
      add constraint vales_bodega_estado_valido
      check (estado_bodega in ('solicitado', 'pendiente', 'entregado', 'denegado')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'vales_bodega_cierre_completo'
      and conrelid = 'public.vales_bodega'::regclass
  ) then
    alter table public.vales_bodega
      add constraint vales_bodega_cierre_completo
      check (
        estado_bodega not in ('entregado', 'denegado')
        or (
          fecha_entrega_bodega is not null
          and btrim(entregado_por) <> ''
        )
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bodega_inventario_items_identificacion_requerida'
      and conrelid = 'public.bodega_inventario_items'::regclass
  ) then
    alter table public.bodega_inventario_items
      add constraint bodega_inventario_items_identificacion_requerida
      check (btrim(codigo_bodega) <> '' and btrim(descripcion) <> '') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bodega_inventario_items_cantidades_no_negativas'
      and conrelid = 'public.bodega_inventario_items'::regclass
  ) then
    alter table public.bodega_inventario_items
      add constraint bodega_inventario_items_cantidades_no_negativas
      check (
        entradas >= 0
        and salidas >= 0
        and saldo_inicial >= 0
        and stock_container >= 0
        and saldo_final >= 0
      ) not valid;
  end if;
end;
$$;

alter table public.vales_bodega_items
  validate constraint vales_bodega_items_cantidad_positiva,
  validate constraint vales_bodega_items_descripcion_requerida;

alter table public.vales_bodega
  validate constraint vales_bodega_tipo_ingreso_valido,
  validate constraint vales_bodega_estado_valido,
  validate constraint vales_bodega_cierre_completo;

alter table public.bodega_inventario_items
  validate constraint bodega_inventario_items_identificacion_requerida,
  validate constraint bodega_inventario_items_cantidades_no_negativas;

commit;

select
  rel.relname as tabla,
  con.conname as restriccion,
  pg_get_constraintdef(con.oid, true) as definicion,
  con.convalidated as validada
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and con.conname in (
    'vales_bodega_items_cantidad_positiva',
    'vales_bodega_items_descripcion_requerida',
    'vales_bodega_tipo_ingreso_valido',
    'vales_bodega_estado_valido',
    'vales_bodega_cierre_completo',
    'bodega_inventario_items_identificacion_requerida',
    'bodega_inventario_items_cantidades_no_negativas'
  )
order by rel.relname, con.conname;
