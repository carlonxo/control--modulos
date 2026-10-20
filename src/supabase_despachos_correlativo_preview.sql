-- Vista previa del próximo número correlativo de despacho.
-- La asignación definitiva continúa realizándose mediante el trigger existente.

create or replace function public.proximo_numero_documento_despacho_bodega()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ultimo_secuencia bigint;
  v_secuencia_usada boolean;
  v_maximo_tabla bigint;
  v_siguiente bigint;
begin
  select last_value, is_called
  into v_ultimo_secuencia, v_secuencia_usada
  from public.bodega_despachos_documento_seq;

  select max((btrim(documento))::bigint)
  into v_maximo_tabla
  from public.bodega_despachos
  where btrim(coalesce(documento, '')) ~ '^[0-9]+$';

  v_siguiente := greatest(
    case when v_secuencia_usada then v_ultimo_secuencia + 1 else v_ultimo_secuencia end,
    coalesce(v_maximo_tabla, 0) + 1
  );

  return lpad(v_siguiente::text, 6, '0');
end;
$$;

revoke all on function public.proximo_numero_documento_despacho_bodega() from public;
revoke all on function public.proximo_numero_documento_despacho_bodega() from anon;
grant execute on function public.proximo_numero_documento_despacho_bodega() to authenticated;

select public.proximo_numero_documento_despacho_bodega() as proximo_documento;
