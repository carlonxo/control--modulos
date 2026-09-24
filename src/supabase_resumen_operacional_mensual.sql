-- Resumen mensual de materiales retirados, pedidos entregados y módulos finalizados.
-- El periodo se guarda deliberadamente como texto AAAA/MM, sin día.

create table if not exists public.resumen_operacional_mensual (
  periodo text not null check (periodo ~ '^[0-9]{4}/(0[1-9]|1[0-2])$'),
  bodega text not null default 'general',
  categoria text not null check (categoria in ('material', 'pedido', 'modulo')),
  codigo text not null,
  descripcion text not null default '',
  cantidad numeric not null default 0,
  actualizado_en timestamptz not null default now(),
  primary key (periodo, bodega, categoria, codigo)
);

create index if not exists resumen_operacional_periodo_categoria_idx
  on public.resumen_operacional_mensual (periodo, categoria, bodega);

alter table public.resumen_operacional_mensual enable row level security;

drop policy if exists "resumen mensual lectura autenticados" on public.resumen_operacional_mensual;
create policy "resumen mensual lectura autenticados"
  on public.resumen_operacional_mensual
  for select
  to authenticated
  using (true);

grant select on public.resumen_operacional_mensual to authenticated;

create or replace function public.extraer_bodega_resumen(p_observacion text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      trim(split_part(split_part(lower(coalesce(p_observacion, '')), 'bodega:', 2), '|', 1)),
      ''
    ),
    'general'
  );
$$;

create or replace function public.recalcular_resumen_operacional_mensual(p_periodo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inicio date;
  v_fin date;
begin
  if p_periodo is null or p_periodo !~ '^[0-9]{4}/(0[1-9]|1[0-2])$' then
    raise exception 'Periodo inválido. Debe usar AAAA/MM.';
  end if;

  v_inicio := to_date(p_periodo || '/01', 'YYYY/MM/DD');
  v_fin := (v_inicio + interval '1 month')::date;

  delete from public.resumen_operacional_mensual
  where periodo = p_periodo;

  insert into public.resumen_operacional_mensual
    (periodo, bodega, categoria, codigo, descripcion, cantidad, actualizado_en)
  select
    p_periodo,
    public.extraer_bodega_resumen(v.observacion),
    'material',
    coalesce(nullif(trim(i.material_vale), ''), lower(trim(i.material_balance))),
    max(coalesce(nullif(trim(i.material_balance), ''), trim(i.material_vale))),
    sum(coalesce(i.cantidad, 0)),
    now()
  from public.vales_bodega v
  join public.vales_bodega_items i on i.vale_id = v.id
  where coalesce(v.tipo_ingreso, '') = 'pedido_app'
    and lower(coalesce(v.estado_bodega, '')) = 'entregado'
    and coalesce(v.fecha_entrega_bodega::date, v.fecha::date) >= v_inicio
    and coalesce(v.fecha_entrega_bodega::date, v.fecha::date) < v_fin
  group by 1, 2, 3, 4;

  insert into public.resumen_operacional_mensual
    (periodo, bodega, categoria, codigo, descripcion, cantidad, actualizado_en)
  select
    p_periodo,
    public.extraer_bodega_resumen(v.observacion),
    'pedido',
    'total',
    'Pedidos entregados',
    count(*),
    now()
  from public.vales_bodega v
  where coalesce(v.tipo_ingreso, '') = 'pedido_app'
    and lower(coalesce(v.estado_bodega, '')) = 'entregado'
    and coalesce(v.fecha_entrega_bodega::date, v.fecha::date) >= v_inicio
    and coalesce(v.fecha_entrega_bodega::date, v.fecha::date) < v_fin
  group by 1, 2, 3, 4, 5;

  insert into public.resumen_operacional_mensual
    (periodo, bodega, categoria, codigo, descripcion, cantidad, actualizado_en)
  select
    p_periodo,
    'general',
    'modulo',
    lower(trim(coalesce(h.tipo, 'sin tipo'))),
    max(coalesce(nullif(trim(h.tipo), ''), 'Sin tipo')),
    count(*),
    now()
  from public.historial_modulos h
  where h.fecha_salida::date >= v_inicio
    and h.fecha_salida::date < v_fin
  group by 1, 2, 3, 4;
end;
$$;

grant execute on function public.recalcular_resumen_operacional_mensual(text) to authenticated;

-- Es una tabla derivada: elimina resúmenes anteriores para no mezclar vales
-- importados/manuales con pedidos reales entregados por bodega.
truncate table public.resumen_operacional_mensual;

-- Carga inicial de todos los meses existentes.
do $$
declare
  v_periodo text;
begin
  for v_periodo in
    select distinct periodo
    from (
      select to_char(coalesce(fecha_entrega_bodega::date, fecha::date), 'YYYY/MM') as periodo
      from public.vales_bodega
      where coalesce(tipo_ingreso, '') = 'pedido_app'
        and lower(coalesce(estado_bodega, '')) = 'entregado'
      union
      select to_char(fecha_salida::date, 'YYYY/MM')
      from public.historial_modulos
      where fecha_salida is not null
    ) meses
    where periodo is not null
  loop
    perform public.recalcular_resumen_operacional_mensual(v_periodo);
  end loop;
end;
$$;
