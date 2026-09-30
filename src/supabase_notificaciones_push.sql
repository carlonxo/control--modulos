-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Registra de forma segura los teléfonos asociados a cada usuario.

create table if not exists public.push_suscripciones (
  endpoint text primary key,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  dispositivo text,
  activa boolean not null default true,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create index if not exists push_suscripciones_usuario_idx
  on public.push_suscripciones(usuario_id)
  where activa = true;

create table if not exists public.push_eventos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  recurso_id text not null,
  creado_por uuid references auth.users(id) on delete set null,
  destinatarios integer not null default 0,
  entregadas integer not null default 0,
  creado_en timestamptz not null default now(),
  unique(tipo, recurso_id)
);

alter table public.push_suscripciones enable row level security;
alter table public.push_eventos enable row level security;

drop policy if exists push_suscripciones_ver_propias on public.push_suscripciones;
create policy push_suscripciones_ver_propias
on public.push_suscripciones
for select
to authenticated
using (usuario_id = auth.uid());

revoke all on table public.push_suscripciones from anon, authenticated;
revoke all on table public.push_eventos from anon, authenticated;
grant select on table public.push_suscripciones to authenticated;

create or replace function public.registrar_suscripcion_push(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_dispositivo text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  if coalesce(p_endpoint, '') !~ '^https://' or length(p_endpoint) > 4000 then
    raise exception 'Endpoint push inválido';
  end if;

  if coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'La suscripción no contiene sus claves';
  end if;

  insert into public.push_suscripciones (
    endpoint, usuario_id, p256dh, auth, dispositivo, activa, actualizada_en
  ) values (
    p_endpoint, auth.uid(), p_p256dh, p_auth, left(p_dispositivo, 500), true, now()
  )
  on conflict (endpoint) do update set
    usuario_id = excluded.usuario_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    dispositivo = excluded.dispositivo,
    activa = true,
    actualizada_en = now();
end;
$$;

create or replace function public.eliminar_suscripcion_push(p_endpoint text)
returns void
language sql
security definer
set search_path = public, auth
as $$
  delete from public.push_suscripciones
  where endpoint = p_endpoint
    and usuario_id = auth.uid();
$$;

revoke all on function public.registrar_suscripcion_push(text, text, text, text) from public, anon;
revoke all on function public.eliminar_suscripcion_push(text) from public, anon;
grant execute on function public.registrar_suscripcion_push(text, text, text, text) to authenticated;
grant execute on function public.eliminar_suscripcion_push(text) to authenticated;

select
  to_regclass('public.push_suscripciones') as suscripciones,
  to_regclass('public.push_eventos') as eventos;
