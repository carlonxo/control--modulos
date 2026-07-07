alter table public.modulos
add column if not exists materiales jsonb not null default '{}'::jsonb;
