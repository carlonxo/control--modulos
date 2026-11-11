-- Habilita los avisos inmediatos de pedidos y sus materiales.
-- Es seguro ejecutarlo más de una vez.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'vales_bodega'
  ) then
    alter publication supabase_realtime add table public.vales_bodega;
  end if;

  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'vales_bodega_items'
  ) then
    alter publication supabase_realtime add table public.vales_bodega_items;
  end if;
end
$$;
