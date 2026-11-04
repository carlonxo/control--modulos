-- Catálogo dinámico de bodegas permanentes y bodegas de obra.
-- Ejecutar en Supabase > SQL Editor.

create table if not exists public.bodegas_config (
  codigo text primary key,
  nombre text not null,
  tipo text not null default 'obra' check (tipo in ('permanente', 'obra')),
  activa boolean not null default true,
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint bodegas_config_codigo_formato check (codigo ~ '^[a-z0-9áéíóúñü-]{2,50}$')
);

insert into public.bodegas_config (codigo, nombre, tipo, activa)
values
  ('bayona', 'Bodega Bayona', 'permanente', true),
  ('rental', 'Bodega Rental', 'permanente', true),
  ('montaña', 'Bodega Montaña', 'permanente', true)
on conflict (codigo) do update
set nombre = excluded.nombre,
    tipo = excluded.tipo,
    activa = true;

alter table public.bodegas_config enable row level security;

drop policy if exists bodegas_config_lectura_autenticados on public.bodegas_config;
create policy bodegas_config_lectura_autenticados
on public.bodegas_config
for select
to authenticated
using (true);

drop policy if exists bodegas_config_admin_insertar on public.bodegas_config;
create policy bodegas_config_admin_insertar
on public.bodegas_config
for insert
to authenticated
with check (
  exists (
    select 1 from public.perfiles perfil
    where perfil.id = auth.uid()
      and lower(coalesce(perfil.rol, '')) = 'admin'
  )
);

drop policy if exists bodegas_config_admin_actualizar on public.bodegas_config;
create policy bodegas_config_admin_actualizar
on public.bodegas_config
for update
to authenticated
using (
  exists (
    select 1 from public.perfiles perfil
    where perfil.id = auth.uid()
      and lower(coalesce(perfil.rol, '')) = 'admin'
  )
)
with check (
  exists (
    select 1 from public.perfiles perfil
    where perfil.id = auth.uid()
      and lower(coalesce(perfil.rol, '')) = 'admin'
  )
);

create index if not exists bodegas_config_tipo_activa_idx
  on public.bodegas_config (tipo, activa, nombre);

grant select on public.bodegas_config to authenticated;
grant insert, update on public.bodegas_config to authenticated;

select codigo, nombre, tipo, activa
from public.bodegas_config
order by tipo, nombre;

