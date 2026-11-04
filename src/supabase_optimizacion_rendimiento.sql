-- Optimización del resumen gerencial.
-- Consolida las tres fuentes y aplica el rango de fecha dentro de Supabase,
-- evitando seis consultas y el filtrado anual completo en el navegador.

create extension if not exists pg_trgm;

create index if not exists bodega_items_codigo_busqueda_idx
  on public.bodega_inventario_items using gin (codigo_bodega gin_trgm_ops);
create index if not exists bodega_items_descripcion_busqueda_idx
  on public.bodega_inventario_items using gin (descripcion gin_trgm_ops);
create index if not exists bodega_codigos_barra_busqueda_idx
  on public.bodega_codigos_barra using gin (codigo_barra gin_trgm_ops);
create index if not exists bodega_items_inventario_saldo_idx
  on public.bodega_inventario_items (inventario_id, saldo_final);
create index if not exists bodega_inventarios_bodega_fecha_idx
  on public.bodega_inventarios (bodega, fecha desc);
create index if not exists bodega_items_inventario_codigo_idx
  on public.bodega_inventario_items (inventario_id, codigo_bodega);
create index if not exists bodega_codigos_barra_bodega_codigo_idx
  on public.bodega_codigos_barra (bodega, codigo_bodega);

create index if not exists vales_bodega_bodega_fecha_estado_idx
  on public.vales_bodega (bodega, fecha desc, estado_bodega);
create index if not exists vales_bodega_serie_busqueda_idx
  on public.vales_bodega using gin (serie gin_trgm_ops);
create index if not exists vales_bodega_items_vale_idx
  on public.vales_bodega_items (vale_id);

create index if not exists bodega_recepciones_bodega_fecha_idx
  on public.bodega_recepciones (bodega, fecha desc);
create index if not exists bodega_despachos_bodega_fecha_idx
  on public.bodega_despachos (bodega, fecha desc);
create index if not exists bodega_despachos_destino_estado_idx
  on public.bodega_despachos (bodega_destino, estado_traspaso, fecha desc);

create index if not exists modulos_serie_busqueda_idx
  on public.modulos using gin (serie gin_trgm_ops);
create index if not exists modulos_planta_linea_posicion_idx
  on public.modulos (planta, linea, posicion);
create index if not exists historial_modulos_serie_busqueda_idx
  on public.historial_modulos using gin (serie gin_trgm_ops);
create index if not exists historial_modulos_planta_fecha_idx
  on public.historial_modulos (planta, fecha_prueba_electrica desc);

create index if not exists modulos_fecha_prueba_electrica_idx
  on public.modulos (fecha_prueba_electrica);
create index if not exists modulos_estado_fecha_prueba_idx
  on public.modulos (estado, fecha_prueba_electrica);
create index if not exists modulos_fecha_ingreso_idx
  on public.modulos (fecha_ingreso);
create index if not exists historial_modulos_fecha_prueba_electrica_idx
  on public.historial_modulos (fecha_prueba_electrica);
create index if not exists historial_modulos_estado_fecha_prueba_idx
  on public.historial_modulos (estado, fecha_prueba_electrica);
create index if not exists historial_modulos_fecha_ingreso_idx
  on public.historial_modulos (fecha_ingreso);
create index if not exists protocolos_manuales_fecha_prueba_electrica_idx
  on public.protocolos_manuales (fecha_prueba_electrica);

create or replace function public.cargar_protocolos_resumen_gerencial(
  p_inicio date,
  p_fin date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_rol text;
  v_resultado jsonb;
begin
  if v_usuario is null then
    raise exception using errcode = '42501', message = 'Debes iniciar sesión.';
  end if;

  select lower(coalesce(rol, '')) into v_rol
  from public.perfiles
  where id = v_usuario;

  if coalesce(v_rol, '') not in ('admin', 'visor') then
    raise exception using errcode = '42501', message = 'Tu rol no puede consultar el resumen gerencial.';
  end if;

  with registros as (
    select
      'actual'::text as origen,
      m.id::text as id,
      null::text as modulo_id,
      m.id_ot::text as id_ot,
      m.serie,
      m.tipo,
      m.proyecto,
      m.responsable,
      m.estado,
      m.fecha_ingreso,
      m.fecha_prueba_electrica,
      null::timestamptz as fecha_salida,
      coalesce(m.protocolo_entrega, '{}'::jsonb) as protocolo_entrega,
      coalesce(m.materiales, '{}'::jsonb) as materiales
    from public.modulos m

    union all

    select
      'historial',
      h.id::text,
      h.modulo_id::text,
      h.id_ot::text,
      h.serie,
      h.tipo,
      h.proyecto,
      h.responsable,
      h.estado,
      h.fecha_ingreso,
      h.fecha_prueba_electrica,
      h.fecha_salida,
      coalesce(h.protocolo_entrega, '{}'::jsonb),
      coalesce(h.materiales, '{}'::jsonb)
    from public.historial_modulos h

    union all

    select
      'manual',
      p.id::text,
      null::text,
      p.id_ot::text,
      p.serie,
      p.tipo,
      p.proyecto,
      p.responsable,
      p.estado,
      null::timestamptz,
      p.fecha_prueba_electrica,
      null::timestamptz,
      coalesce(p.protocolo_entrega, '{}'::jsonb),
      coalesce(p.materiales, '{}'::jsonb)
    from public.protocolos_manuales p
  ), con_fecha as (
    select r.*,
      case
        when lower(btrim(coalesce(r.estado, r.protocolo_entrega->>'estado', ''))) in ('en garantia', 'en garantía')
          and r.fecha_ingreso is not null
          then r.fecha_ingreso::date
        when coalesce(r.protocolo_entrega->>'fecha', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          then (r.protocolo_entrega->>'fecha')::date
        else r.fecha_prueba_electrica::date
      end as fecha_documento
    from registros r
    where r.origen = 'manual'
       or lower(btrim(coalesce(r.estado, r.protocolo_entrega->>'estado', ''))) in (
         'prueba electrica',
         'prueba eléctrica',
         'en garantia',
         'en garantía'
       )
  )
  select jsonb_build_object(
    'registros',
    coalesce(
      jsonb_agg(to_jsonb(c) - 'fecha_documento' order by c.fecha_documento desc, c.id),
      '[]'::jsonb
    )
  ) into v_resultado
  from con_fecha c
  where c.fecha_documento >= p_inicio
    and c.fecha_documento < p_fin;

  return coalesce(v_resultado, jsonb_build_object('registros', '[]'::jsonb));
end;
$$;

revoke all on function public.cargar_protocolos_resumen_gerencial(date, date) from public;
revoke all on function public.cargar_protocolos_resumen_gerencial(date, date) from anon;
grant execute on function public.cargar_protocolos_resumen_gerencial(date, date) to authenticated;
