-- Un correlativo global para todos los vales, incluidas las devoluciones y los importados.
-- Ejecutar una vez en el SQL Editor. Volver a ejecutarlo no renumera los vales.
begin;

lock table public.vales_bodega in access exclusive mode;

alter table public.vales_bodega
  add column if not exists numero_vale bigint;

create sequence if not exists public.vales_bodega_numero_seq as bigint;
alter sequence public.vales_bodega_numero_seq owned by public.vales_bodega.numero_vale;

with base as (
  select greatest(
    coalesce((select max(numero_vale) from public.vales_bodega), 0),
    (select case when is_called then last_value else last_value - 1 end
     from public.vales_bodega_numero_seq)
  ) as ultimo
), pendientes as (
  select id, row_number() over (order by fecha nulls last, created_at nulls last, id) as posicion
  from public.vales_bodega
  where numero_vale is null
)
update public.vales_bodega as vale
set numero_vale = base.ultimo + pendientes.posicion
from base cross join pendientes
where vale.id = pendientes.id;

do $$
declare
  siguiente bigint;
begin
  select greatest(
    coalesce((select max(numero_vale) from public.vales_bodega), 0) + 1,
    (select case when is_called then last_value + 1 else last_value end
     from public.vales_bodega_numero_seq)
  ) into siguiente;
  execute format('alter sequence public.vales_bodega_numero_seq restart with %s', siguiente);
end;
$$;

alter table public.vales_bodega alter column numero_vale set not null;
create unique index if not exists vales_bodega_numero_vale_uidx
  on public.vales_bodega (numero_vale);

create or replace function public.asignar_numero_vale_bodega()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.numero_vale := pg_catalog.nextval('public.vales_bodega_numero_seq'::pg_catalog.regclass);
  elsif new.numero_vale is distinct from old.numero_vale then
    raise exception 'No se puede cambiar el número de un vale.';
  end if;
  return new;
end;
$$;

revoke all on function public.asignar_numero_vale_bodega() from public, anon, authenticated;
revoke all on sequence public.vales_bodega_numero_seq from public, anon, authenticated;

drop trigger if exists asignar_numero_vale_bodega on public.vales_bodega;
create trigger asignar_numero_vale_bodega
before insert or update of numero_vale on public.vales_bodega
for each row execute function public.asignar_numero_vale_bodega();

notify pgrst, 'reload schema';
commit;
