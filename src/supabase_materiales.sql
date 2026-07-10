alter table public.modulos
add column if not exists materiales jsonb not null default '{}'::jsonb;

alter table public.historial_modulos
add column if not exists materiales jsonb not null default '{}'::jsonb;

alter table public.modulos
add column if not exists protocolo_entrega jsonb not null default '{}'::jsonb;

alter table public.historial_modulos
add column if not exists protocolo_entrega jsonb not null default '{}'::jsonb;

alter table public.historial_modulos
add column if not exists nota text;

alter table public.modulos
add column if not exists observacion_alerta text;

alter table public.historial_modulos
add column if not exists observacion_alerta text;

create table if not exists public.material_precios (
  material text primary key,
  id_art integer,
  seccion text,
  precio numeric not null default 0,
  updated_at timestamp with time zone not null default now()
);

alter table public.material_precios
add column if not exists id_art integer;

alter table public.material_precios
add column if not exists seccion text;

insert into public.material_precios (material, id_art, seccion, precio, updated_at)
values
('Ducto Flex/Rig 20mm LH (Incl Acc)', 323, 'Canalización', 1932, now()),
('Ducto Flex/Rig 25mm LH (Incl Acc)', 1681, 'Canalización', 2782, now()),
('Caja PVC 100x100x65', 244, 'Canalización', 2377, now()),
('Caja Metálica 100x65x65 / Chuqui', 322, 'Canalización', 2378, now()),
('Caja Metálica 100x100x65', 1704, 'Canalización', 3120, now()),
('Caja Tabique 3 Puestos LH', 1680, 'Canalización', 1900, now()),
('Tapa Ciega - Plástica / Metálica', 1684, 'Canalización', 480, now()),
('Prensa Estopa 16-21mm', 1683, 'Canalización', 1458, now()),
('Cable RZ1 2,5mm (Alum + Ench)', 248, 'Cableado', 353, now()),
('Cable RZ1 4mm (Termo)', 249, 'Cableado', 493, now()),
('Cable RZ1 6mm (Alimentación)', 1687, 'Cableado', 710, now()),
('Cable RZ1 3x2.5 / 4mm (Ilu-Term)', 252, 'Cableado', 2872, now()),
('Cable RZ1 3x6mm (Alimentación)', 1685, 'Cableado', 3460, now()),
('Ampolleta LED', 254, 'Iluminación básica', 3180, now()),
('Foco Led 12W Sob', 259, 'Iluminación básica', 6702, now()),
('Tubo Led', 255, 'Iluminación básica', 3180, now()),
('Eq. Herm. Led 40w (Tubo/Placa)', 256, 'Iluminación básica', 18559, now()),
('Foco Tortuga Led', 258, 'Iluminación básica', 7733, now()),
('Instalación Extractor', 273, 'Accesorios', 0, now()),
('Artefacto Simple', 263, 'Artefactos tableros', 1856, now()),
('Artefacto Doble', 264, 'Artefactos tableros', 2578, now()),
('Artefacto Triple', 265, 'Artefactos tableros', 3299, now()),
('Tapa Ciega + Soporte', 266, 'Artefactos tableros', 0, now()),
('Ench Hembra Indep 32A', 267, 'Artefactos tableros', 5639, now()),
('Enchufe Mch Indep 32A', 1693, 'Artefactos tableros', 9250, now()),
('Tab. PVC 24-36cc IP44', 1700, 'Tableros', 25300, now()),
('Tab. PVC 8-12-18cc IP44', 270, 'Tableros', 17279, now()),
('Tablero PVC IP65', 1701, 'Tableros', 56279, now()),
('Inst Tab. TOP (Armado)', 17, 'Tableros', 70000, now()),
('Aut. Monof 10-16-20A', 268, 'Tableros', 2578, now()),
('Auto. Bifásico 2x10A', 1705, 'Tableros', 6740, now()),
('Auto. Bifásico 2x16A', 1706, 'Tableros', 6950, now()),
('Auto. Bifásico 2x20A', 1707, 'Tableros', 7308, now()),
('Auto. Bifásico 2x25-32A', 1708, 'Tableros', 8450, now()),
('Diferencial 2x25A', 269, 'Tableros', 8673, now()),
('Diferencial 2x40A', 1709, 'Tableros', 13520, now()),
('Porta Fusibles', 1698, 'Tableros', 1850, now()),
('Luz Piloto', 1697, 'Tableros', 2100, now()),
('Barra Monofásica 4cto', 271, 'Tableros', 1577, now()),
('Repartidor 4x80A', 1699, 'Tableros', 4200, now()),
('Falso Polo 1Mts', 272, 'Tableros', 1237, now()),
('Mold Bca C/T 20x10 x 2mt + Acces', 325, 'Moldura plástica', 2000, now()),
('BPC LH 100x45 + Acces', 1694, 'Bandeja plástica', 25200, now()),
('Tapa Idrobox IP55', 1692, 'Bandeja plástica', 11033, now()),
('Foco Sobrep LED 18W', 1712, 'Eq. iluminación', 8940, now()),
('Panel Led 600x600mm', 1690, 'Eq. iluminación', 1690, now()),
('Accesorio Mtaje Panel Led', 1688, 'Eq. iluminación', 15200, now()),
('Foco Sobrep LED 24W', 1713, 'Eq. iluminación', 14320, now()),
('Tub Flexible Metálica c/acces', 1711, 'Canalización-Cableado-SPT', 3390, now()),
('Tubería EMT c/accesorio', 1710, 'Canalización-Cableado-SPT', 3900, now()),
('Ducto Flex/Rig 32mm LH (Incl Acc)', 1682, 'Canalización-Cableado-SPT', 3744, now()),
('Caja Chuqui PVC', 324, 'Canalización-Cableado-SPT', 1200, now()),
('Int. Difer. Legrand 2x10A 10mA', 1695, 'Canalización-Cableado-SPT', 102500, now()),
('Int. Difer. Legrand 2x16A 10mA', 1696, 'Canalización-Cableado-SPT', 24200, now()),
('Cordón Flex 3x18 AWG', 250, 'Canalización-Cableado-SPT', 919, now()),
('Cable RZ-1 3x1.5mm2', 251, 'Canalización-Cableado-SPT', 1658, now()),
('Cable RZ-1 5x4mm2', 1686, 'Canalización-Cableado-SPT', 4620, now()),
('Barra Coperw 5/8 Inc. Con', 1702, 'SPT', 12540, now()),
('Camarilla Registro PVC', 1703, 'SPT', 5600, now())
on conflict (material) do update set
  id_art = excluded.id_art,
  seccion = excluded.seccion,
  precio = excluded.precio,
  updated_at = excluded.updated_at;

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
