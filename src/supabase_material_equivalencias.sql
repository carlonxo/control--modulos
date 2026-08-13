create table if not exists public.material_equivalencias (
  id uuid primary key default gen_random_uuid(),
  origen text not null,
  destino text not null,
  tipo text not null default 'contiene' check (tipo in ('contiene', 'exacto')),
  activo boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.material_equivalencias enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'material_equivalencias'
      and policyname = 'material_equivalencias_select_authenticated'
  ) then
    create policy material_equivalencias_select_authenticated
    on public.material_equivalencias
    for select
    to authenticated
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'material_equivalencias'
      and policyname = 'material_equivalencias_insert_admin'
  ) then
    create policy material_equivalencias_insert_admin
    on public.material_equivalencias
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.perfiles p
        where p.id = auth.uid()
          and p.rol = 'admin'
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'material_equivalencias'
      and policyname = 'material_equivalencias_update_admin'
  ) then
    create policy material_equivalencias_update_admin
    on public.material_equivalencias
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.perfiles p
        where p.id = auth.uid()
          and p.rol = 'admin'
      )
    )
    with check (
      exists (
        select 1
        from public.perfiles p
        where p.id = auth.uid()
          and p.rol = 'admin'
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'material_equivalencias'
      and policyname = 'material_equivalencias_delete_admin'
  ) then
    create policy material_equivalencias_delete_admin
    on public.material_equivalencias
    for delete
    to authenticated
    using (
      exists (
        select 1
        from public.perfiles p
        where p.id = auth.uid()
          and p.rol = 'admin'
      )
    );
  end if;
end $$;
