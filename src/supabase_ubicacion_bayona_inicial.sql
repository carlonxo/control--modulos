-- Define la información existente como perteneciente a Bayona y prepara
-- inventarios, vales y códigos de barra para admitir otras bodegas.
-- Ejecutar completo en Supabase SQL Editor antes de publicar esta versión.

begin;

alter table public.bodega_inventarios
  add column if not exists bodega text not null default 'bayona';

alter table public.vales_bodega
  add column if not exists bodega text not null default 'bayona';

alter table public.bodega_codigos_barra
  add column if not exists bodega text not null default 'bayona';

alter table public.bodega_recepciones
  add column if not exists bodega text not null default 'bayona';

alter table public.bodega_despachos
  add column if not exists bodega text not null default 'bayona';

alter table public.modulos
  add column if not exists planta text not null default 'planta bayona';

alter table public.historial_modulos
  add column if not exists planta text not null default 'planta bayona';

alter table public.perfiles
  add column if not exists bodega_asignada text default 'bayona';

alter table public.perfiles
  add column if not exists planta_asignada text default 'planta bayona';

-- Todo registro antiguo que no tenga ubicación corresponde a Bayona. Estas
-- condiciones permiten volver a ejecutar el archivo sin modificar Rental o Montaña.
update public.bodega_inventarios set bodega = 'bayona'
where nullif(btrim(bodega), '') is null;
update public.vales_bodega set bodega = 'bayona'
where nullif(btrim(bodega), '') is null;
update public.vales_bodega
set observacion = case
  when coalesce(observacion, '') ~* 'bodega\s*:' then
    regexp_replace(observacion, 'bodega\s*:\s*[^|]*', 'Bodega: bayona', 'gi')
  when nullif(btrim(coalesce(observacion, '')), '') is null then
    'Bodega: bayona'
  else
    btrim(observacion) || ' | Bodega: bayona'
end
where bodega = 'bayona'
  and coalesce(observacion, '') !~* 'bodega\s*:';
update public.bodega_codigos_barra set bodega = 'bayona'
where nullif(btrim(bodega), '') is null;
update public.bodega_recepciones set bodega = 'bayona'
where nullif(btrim(bodega), '') is null;
update public.bodega_despachos set bodega = 'bayona'
where nullif(btrim(bodega), '') is null;
update public.modulos set planta = 'planta bayona'
where nullif(btrim(planta), '') is null;
update public.historial_modulos set planta = 'planta bayona'
where nullif(btrim(planta), '') is null;

-- Los usuarios existentes pertenecen hoy a Planta/Bodega Bayona.
update public.perfiles
set bodega_asignada = 'bayona'
where nullif(btrim(bodega_asignada), '') is null;

update public.perfiles
set planta_asignada = 'planta bayona'
where nullif(btrim(planta_asignada), '') is null;

-- Un mismo día y nombre de hoja podrá existir en bodegas diferentes.
alter table public.bodega_inventarios
  drop constraint if exists bodega_inventarios_fecha_hoja_nombre_key;

drop index if exists public.bodega_inventarios_fecha_hoja_nombre_key;

create unique index if not exists bodega_inventarios_bodega_fecha_hoja_key
on public.bodega_inventarios (bodega, fecha, hoja_nombre);

-- Un código de barra puede administrarse de forma independiente por bodega.
alter table public.bodega_codigos_barra
  drop constraint if exists bodega_codigos_barra_codigo_barra_key;

drop index if exists public.bodega_codigos_barra_codigo_barra_key;

create unique index if not exists bodega_codigos_barra_bodega_codigo_key
on public.bodega_codigos_barra (bodega, codigo_barra);

create index if not exists idx_vales_bodega_bodega_fecha
on public.vales_bodega (bodega, fecha);

create index if not exists idx_bodega_recepciones_bodega_fecha
on public.bodega_recepciones (bodega, fecha);

create index if not exists idx_bodega_despachos_bodega_fecha
on public.bodega_despachos (bodega, fecha);

create index if not exists idx_modulos_planta
on public.modulos (planta);

create index if not exists idx_historial_modulos_planta
on public.historial_modulos (planta);

-- La posición se repite entre plantas; su unicidad debe considerar la planta.
do $$
declare
  restriccion record;
begin
  for restriccion in
    select conname
    from pg_constraint
    where conrelid = 'public.modulos'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ~* '^UNIQUE \(linea, posicion\)$'
  loop
    execute format('alter table public.modulos drop constraint %I', restriccion.conname);
  end loop;
end $$;

drop index if exists public.modulos_linea_posicion_key;

create unique index if not exists modulos_planta_linea_posicion_key
on public.modulos (planta, linea, posicion);

commit;
