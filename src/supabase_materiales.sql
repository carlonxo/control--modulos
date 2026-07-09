alter table public.modulos
add column if not exists materiales jsonb not null default '{}'::jsonb;

alter table public.modulos
add column if not exists protocolo_entrega jsonb not null default '{}'::jsonb;

alter table public.historial_modulos
add column if not exists protocolo_entrega jsonb not null default '{}'::jsonb;

alter table public.historial_modulos
add column if not exists nota text;

alter table public.modulos
drop constraint if exists chk_estado;

alter table public.modulos
add constraint chk_estado
check (
  estado in (
    'Sin iniciar',
    'Canalizado',
    'Cableado',
    'Terminaciones',
    'Prueba eléctrica',
    'Sin instalación',
    'En garantía'
  )
);
