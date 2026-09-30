-- Horas-hombre por modulo: valor calculado en la app y correccion administrativa auditable.
-- Ejecutar este archivo completo en el SQL Editor de Supabase.

alter table public.modulos
  add column if not exists horas_hombre_corregidas numeric,
  add column if not exists horas_hombre_motivo text not null default '',
  add column if not exists horas_hombre_corregidas_por text not null default '',
  add column if not exists horas_hombre_corregidas_en timestamp with time zone;

alter table public.historial_modulos
  add column if not exists horas_hombre_corregidas numeric,
  add column if not exists horas_hombre_motivo text not null default '',
  add column if not exists horas_hombre_corregidas_por text not null default '',
  add column if not exists horas_hombre_corregidas_en timestamp with time zone;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'modulos_horas_hombre_corregidas_no_negativas'
      and conrelid = 'public.modulos'::regclass
  ) then
    alter table public.modulos
      add constraint modulos_horas_hombre_corregidas_no_negativas
      check (horas_hombre_corregidas is null or horas_hombre_corregidas >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'historial_modulos_horas_hombre_corregidas_no_negativas'
      and conrelid = 'public.historial_modulos'::regclass
  ) then
    alter table public.historial_modulos
      add constraint historial_modulos_horas_hombre_corregidas_no_negativas
      check (horas_hombre_corregidas is null or horas_hombre_corregidas >= 0);
  end if;
end;
$$;

create or replace function public.corregir_horas_hombre_modulo(
  p_origen text,
  p_id uuid,
  p_horas numeric,
  p_motivo text
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
  v_encontrado boolean := false;
  v_fecha timestamp with time zone := clock_timestamp();
begin
  if v_usuario_id is null then
    raise exception using errcode = '42501', message = 'Debes iniciar sesion para corregir horas-hombre.';
  end if;

  select perfil.rol, perfil.nombre
  into v_rol, v_nombre
  from public.perfiles perfil
  where perfil.id = v_usuario_id;

  if coalesce(v_rol, '') <> 'admin' then
    raise exception using errcode = '42501', message = 'Solo un administrador puede corregir las horas-hombre.';
  end if;

  if p_horas is not null and p_horas < 0 then
    raise exception 'Las horas corregidas no pueden ser negativas.';
  end if;

  if p_horas is not null and btrim(coalesce(p_motivo, '')) = '' then
    raise exception 'Debes indicar el motivo de la correccion.';
  end if;

  if p_origen = 'modulos' then
    update public.modulos
    set horas_hombre_corregidas = p_horas,
        horas_hombre_motivo = case when p_horas is null then '' else btrim(p_motivo) end,
        horas_hombre_corregidas_por = case when p_horas is null then '' else coalesce(nullif(btrim(v_nombre), ''), v_usuario_id::text) end,
        horas_hombre_corregidas_en = case when p_horas is null then null else v_fecha end
    where id = p_id;
    v_encontrado := found;
  elsif p_origen = 'historial_modulos' then
    update public.historial_modulos
    set horas_hombre_corregidas = p_horas,
        horas_hombre_motivo = case when p_horas is null then '' else btrim(p_motivo) end,
        horas_hombre_corregidas_por = case when p_horas is null then '' else coalesce(nullif(btrim(v_nombre), ''), v_usuario_id::text) end,
        horas_hombre_corregidas_en = case when p_horas is null then null else v_fecha end
    where id = p_id;
    v_encontrado := found;
  else
    raise exception 'El origen del modulo no es valido.';
  end if;

  if not v_encontrado then
    raise exception 'No se encontro el modulo que se desea corregir.';
  end if;

  return jsonb_build_object(
    'ok', true,
    'origen', p_origen,
    'id', p_id,
    'horas_hombre_corregidas', p_horas,
    'motivo', case when p_horas is null then '' else btrim(p_motivo) end,
    'corregido_por', case when p_horas is null then '' else coalesce(nullif(btrim(v_nombre), ''), v_usuario_id::text) end,
    'corregido_en', case when p_horas is null then null else v_fecha end
  );
end;
$$;

revoke all on function public.corregir_horas_hombre_modulo(text, uuid, numeric, text) from public;
revoke all on function public.corregir_horas_hombre_modulo(text, uuid, numeric, text) from anon;
grant execute on function public.corregir_horas_hombre_modulo(text, uuid, numeric, text) to authenticated;

select
  p.proname as funcion,
  pg_get_function_identity_arguments(p.oid) as parametros,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'corregir_horas_hombre_modulo';
