-- Asigna un número correlativo global a cada nueva recepción de bodega.
-- Respeta los números ya ingresados: si el máximo actual es 0042, el próximo será 0043.

begin;

create sequence if not exists public.bodega_recepciones_numero_seq
  as bigint
  start with 1
  increment by 1
  minvalue 1;

do $$
declare
  v_maximo bigint;
  v_secuencia_actual bigint;
begin
  select max((btrim(numero_recepcion))::bigint)
  into v_maximo
  from public.bodega_recepciones
  where btrim(coalesce(numero_recepcion, '')) ~ '^[0-9]+$';

  select last_value
  into v_secuencia_actual
  from public.bodega_recepciones_numero_seq;

  if v_maximo is null then
    perform setval('public.bodega_recepciones_numero_seq', greatest(v_secuencia_actual, 1), false);
  else
    perform setval(
      'public.bodega_recepciones_numero_seq',
      greatest(v_maximo, v_secuencia_actual),
      true
    );
  end if;
end;
$$;

create or replace function public.asignar_numero_recepcion_correlativo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correlativo bigint;
begin
  v_correlativo := nextval('public.bodega_recepciones_numero_seq');
  new.numero_recepcion := lpad(v_correlativo::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trigger_numero_recepcion_correlativo
on public.bodega_recepciones;

create trigger trigger_numero_recepcion_correlativo
before insert on public.bodega_recepciones
for each row
execute function public.asignar_numero_recepcion_correlativo();

create unique index if not exists uq_bodega_recepciones_numero_recepcion
on public.bodega_recepciones (((btrim(numero_recepcion))::bigint))
where btrim(coalesce(numero_recepcion, '')) ~ '^[0-9]+$';

revoke all on sequence public.bodega_recepciones_numero_seq from public;
revoke all on sequence public.bodega_recepciones_numero_seq from anon;
revoke all on sequence public.bodega_recepciones_numero_seq from authenticated;
revoke all on function public.asignar_numero_recepcion_correlativo() from public;
revoke all on function public.asignar_numero_recepcion_correlativo() from anon;
revoke all on function public.asignar_numero_recepcion_correlativo() from authenticated;

create or replace function public.proximo_numero_recepcion_bodega()
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
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para consultar el próximo número de recepción.';
  end if;

  select last_value, is_called
  into v_ultimo_secuencia, v_secuencia_usada
  from public.bodega_recepciones_numero_seq;

  select max((btrim(numero_recepcion))::bigint)
  into v_maximo_tabla
  from public.bodega_recepciones
  where btrim(coalesce(numero_recepcion, '')) ~ '^[0-9]+$';

  v_siguiente := greatest(
    case when v_secuencia_usada then v_ultimo_secuencia + 1 else v_ultimo_secuencia end,
    coalesce(v_maximo_tabla, 0) + 1
  );

  return lpad(v_siguiente::text, 4, '0');
end;
$$;

revoke all on function public.proximo_numero_recepcion_bodega() from public;
revoke all on function public.proximo_numero_recepcion_bodega() from anon;
grant execute on function public.proximo_numero_recepcion_bodega() to authenticated;

commit;

select
  numero_recepcion,
  fecha,
  bodega
from public.bodega_recepciones
order by
  case
    when btrim(coalesce(numero_recepcion, '')) ~ '^[0-9]+$'
      then (btrim(numero_recepcion))::bigint
    else 0
  end desc
limit 5;
