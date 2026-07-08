alter table public.modulos
add column if not exists materiales jsonb not null default '{}'::jsonb;

alter table public.modulos
add column if not exists protocolo_entrega jsonb not null default '{}'::jsonb;

alter table public.historial_modulos
add column if not exists protocolo_entrega jsonb not null default '{}'::jsonb;
