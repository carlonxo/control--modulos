-- Permite que Admin y Analista corrijan serie, tipo de módulo y proyecto
-- de un pedido, incluso si ya fue entregado. Ejecutar completo en SQL Editor.

create or replace function public.editar_datos_vale_bodega(
  p_vale_id uuid,
  p_serie text,
  p_observacion text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
  v_vale public.vales_bodega%rowtype;
begin
  select rol
  into v_rol
  from public.perfiles
  where id = auth.uid();

  if coalesce(v_rol, '') not in ('admin', 'analista') then
    raise exception 'No tienes permiso para editar los datos del vale';
  end if;

  if nullif(btrim(coalesce(p_serie, '')), '') is null then
    raise exception 'La serie es obligatoria';
  end if;

  select *
  into v_vale
  from public.vales_bodega
  where id = p_vale_id
    and tipo_ingreso = 'pedido_app'
  for update;

  if not found then
    raise exception 'No se encontró el pedido';
  end if;

  update public.vales_bodega
  set serie = btrim(p_serie),
      observacion = btrim(coalesce(p_observacion, ''))
  where id = p_vale_id
  returning * into v_vale;

  update public.vales_bodega_items
  set serie = btrim(p_serie)
  where vale_id = p_vale_id;

  return to_jsonb(v_vale);
end;
$$;

revoke all on function public.editar_datos_vale_bodega(uuid, text, text) from public;
revoke all on function public.editar_datos_vale_bodega(uuid, text, text) from anon;
grant execute on function public.editar_datos_vale_bodega(uuid, text, text) to authenticated;
