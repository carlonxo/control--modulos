import { useEffect, useRef, useState } from 'react'
import { supabase } from './services/supabase'
import { exportarHistorialExcel } from './services/exportarExcel'
import Notificacion from './components/Notificacion'
import ProtocoloEntrega, { camposMateriales, parsearCantidadProtocolo } from './components/ProtocoloEntrega'
import { obtenerHistorial } from './services/modulosService'
import { formatearFecha } from './utils/fechas'
import { descargarProtocolosDiariosPdf } from './services/protocolosDiariosPdf'

function esSolicitudPruebaActiva(valor) {
  return valor === true || valor === 'true' || valor === 1
}

function esEstadoPruebaElectrica(estado) {
  return ['prueba eléctrica', 'prueba electrica'].includes(
    String(estado || '').trim().toLowerCase()
  )
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function esTipoBodega(tipo) {
  return normalizarTexto(tipo).includes('bodega')
}

function esEstadoConObservacionAlerta(estado) {
  return ['prueba electrica', 'en garantia', 'sin instalacion'].includes(
    normalizarTexto(estado)
  )
}

function esEstadoGarantia(estado) {
  return normalizarTexto(estado) === 'en garantia'
}

function fechaParaInput(valor) {
  if (!valor) return ''
  const fechaComoTexto = String(valor)
  const coincidenciaFecha = fechaComoTexto.match(/^(\d{4}-\d{2}-\d{2})/)
  if (coincidenciaFecha) return coincidenciaFecha[1]
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return ''
  return fecha.toISOString().slice(0, 10)
}

function fechaDocumentoProtocolo(registro = {}) {
  const fechaInterna = registro?.protocolo_entrega?.fecha
  if (fechaInterna) return `${fechaInterna}T00:00:00`
  return registro?.fecha_prueba_electrica || null
}

function claveProtocoloUnico(serie, fecha) {
  const serieNormalizada = normalizarTexto(serie)
  const fechaNormalizada = fechaParaInput(fecha || '')
  return serieNormalizada && fechaNormalizada ? `${serieNormalizada}|${fechaNormalizada}` : ''
}

function diasDesdeFecha(valor) {
  if (!valor) return null
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return null
  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  return Math.floor((inicioHoy - inicioFecha) / 86400000)
}

function estaDentroDeGarantia(valor) {
  const dias = diasDesdeFecha(valor)
  return dias !== null && dias >= 0 && dias <= 90
}

const seccionesFormularioElectrico = [
  {
    nombre: 'Canalización',
    items: ['Conduit 20mm', 'Conduit 25mm', 'Conduit 32mm', 'Caja PVC 100x100x65', 'Caja metálica 100x100x65', 'Caja tabique LH', 'Tapa ciega - Pasac.'],
  },
  {
    nombre: 'Cableado',
    items: ['Cable RZ1 2,5mm', 'Cable RZ1 4mm', 'Cable RZ1 6mm', 'Cordon 3x1.5mm', 'Cordon 3x4mm', 'Cordon 3 x 6mm'],
  },
  {
    nombre: 'Iluminación',
    items: ['EQ. Herm. LED 40W (tubo/placa)', 'Tubo LED', 'Foco tortuga LED', 'Foco tortuga 60W', 'Ampolleta LED', 'Plafón'],
  },
  {
    nombre: 'Artefactos',
    items: ['Artefacto simple', 'Artefacto doble', 'Artefacto triple', 'Tapa ciega artefacto', 'Ench. Ind. 32A macho', 'Ench. Ind. 32A hembra', 'Extractor'],
  },
  {
    nombre: 'Tableros',
    items: ['Aut. monof. 10-16-20A', 'Aut. bifásico 2x10A', 'Aut. bifásico 2x16A', 'Aut. bifásico 2x20A', 'Aut. bifásico 2x25A', 'Diferencial 2x25A', 'Luz Piloto', 'Porta Fusible', 'Barra repartidora', 'Falso polo', 'Tablero emb. IP44', 'Tablero sobr. IP44', 'Tablero IP65 18p', 'Tablero IP65 24p', 'Tablero armado'],
  },
  {
    nombre: 'Especiales',
    items: ['Panel led 60x60 + soporte', 'Plafo led 18w', 'Plafo led 24w', 'BPC LH 100x45', 'Tapa idrobox IP65', 'Caja chuqui'],
  },
]

const todosLosMateriales = seccionesFormularioElectrico.flatMap((seccion) => seccion.items)

const catalogoPreciosProtocolo = [
  { seccion: 'Canalización', material: 'Ducto Flex/Rig 20mm LH (Incl Acc)', idArt: 323, precio: 1932 },
  { seccion: 'Canalización', material: 'Ducto Flex/Rig 25mm LH (Incl Acc)', idArt: 1681, precio: 2782 },
  { seccion: 'Canalización', material: 'Caja PVC 100x100x65', idArt: 244, precio: 2377 },
  { seccion: 'Canalización', material: 'Caja Metálica 100x65x65 / Chuqui', idArt: 322, precio: 2378 },
  { seccion: 'Canalización', material: 'Caja Metálica 100x100x65', idArt: 1704, precio: 3120 },
  { seccion: 'Canalización', material: 'Caja Tabique 3 Puestos LH', idArt: 1680, precio: 1900 },
  { seccion: 'Canalización', material: 'Tapa Ciega - Plástica / Metálica', idArt: 1684, precio: 480 },
  { seccion: 'Canalización', material: 'Prensa Estopa 16-21mm', idArt: 1683, precio: 1458 },
  { seccion: 'Cableado', material: 'Cable RZ1 2,5mm (Alum + Ench)', idArt: 248, precio: 353 },
  { seccion: 'Cableado', material: 'Cable RZ1 4mm (Termo)', idArt: 249, precio: 493 },
  { seccion: 'Cableado', material: 'Cable RZ1 6mm (Alimentación)', idArt: 1687, precio: 710 },
  { seccion: 'Cableado', material: 'Cable RZ1 3x2.5 / 4mm (Ilu-Term)', idArt: 252, precio: 2872 },
  { seccion: 'Cableado', material: 'Cable RZ1 3x6mm (Alimentación)', idArt: 1685, precio: 3460 },
  { seccion: 'Iluminación básica', material: 'Ampolleta LED', idArt: 254, precio: 3180 },
  { seccion: 'Iluminación básica', material: 'Foco Led 12W Sob', idArt: 259, precio: 6702 },
  { seccion: 'Iluminación básica', material: 'Tubo Led', idArt: 255, precio: 3180 },
  { seccion: 'Iluminación básica', material: 'Eq. Herm. Led 40w (Tubo/Placa)', idArt: 256, precio: 18559 },
  { seccion: 'Iluminación básica', material: 'Foco Tortuga Led', idArt: 258, precio: 7733 },
  { seccion: 'Accesorios', material: 'Instalación Extractor', idArt: 273, precio: 3500 },
  { seccion: 'Artefactos tableros', material: 'Artefacto Simple', idArt: 263, precio: 1856 },
  { seccion: 'Artefactos tableros', material: 'Artefacto Doble', idArt: 264, precio: 2578 },
  { seccion: 'Artefactos tableros', material: 'Artefacto Triple', idArt: 265, precio: 3299 },
  { seccion: 'Artefactos tableros', material: 'Tapa Ciega + Soporte', idArt: 266, precio: 722 },
  { seccion: 'Artefactos tableros', material: 'Ench Hembra Indep 32A', idArt: 267, precio: 5639 },
  { seccion: 'Artefactos tableros', material: 'Enchufe Mch Indep 32A', idArt: 1693, precio: 9250 },
  { seccion: 'Tableros', material: 'Tab. PVC 24-36cc IP44', idArt: 1700, precio: 25300 },
  { seccion: 'Tableros', material: 'Tab. PVC 8-12-18cc IP44', idArt: 270, precio: 17279 },
  { seccion: 'Tableros', material: 'Tablero PVC IP65', idArt: 1701, precio: 56279 },
  { seccion: 'Tableros', material: 'Inst Tab. TOP (Armado)', idArt: 17, precio: 70000 },
  { seccion: 'Tableros', material: 'Aut. Monof 10-16-20A', idArt: 268, precio: 2578 },
  { seccion: 'Tableros', material: 'Auto. Bifásico 2x10A', idArt: 1705, precio: 6740 },
  { seccion: 'Tableros', material: 'Auto. Bifásico 2x16A', idArt: 1706, precio: 6950 },
  { seccion: 'Tableros', material: 'Auto. Bifásico 2x20A', idArt: 1707, precio: 7308 },
  { seccion: 'Tableros', material: 'Auto. Bifásico 2x25-32A', idArt: 1708, precio: 8450 },
  { seccion: 'Tableros', material: 'Diferencial 2x25A', idArt: 269, precio: 8673 },
  { seccion: 'Tableros', material: 'Diferencial 2x40A', idArt: 1709, precio: 13520 },
  { seccion: 'Tableros', material: 'Porta Fusibles', idArt: 1698, precio: 1850 },
  { seccion: 'Tableros', material: 'Luz Piloto', idArt: 1697, precio: 2100 },
  { seccion: 'Tableros', material: 'Barra Monofásica 4cto', idArt: 271, precio: 1577 },
  { seccion: 'Tableros', material: 'Repartidor 4x80A', idArt: 1699, precio: 4200 },
  { seccion: 'Tableros', material: 'Falso Polo 1Mts', idArt: 272, precio: 1237 },
  { seccion: 'Moldura plástica', material: 'Mold Bca C/T 20x10 x 2mt + Acces', idArt: 325, precio: 2000 },
  { seccion: 'Bandeja plástica', material: 'BPC LH 100x45 + Acces', idArt: 1694, precio: 25200 },
  { seccion: 'Bandeja plástica', material: 'Tapa Idrobox IP55', idArt: 1692, precio: 11033 },
  { seccion: 'Eq. iluminación', material: 'Foco Sobrep LED 18W', idArt: 1712, precio: 8940 },
  { seccion: 'Eq. iluminación', material: 'Panel Led 600x600mm', idArt: 1690, precio: 1690 },
  { seccion: 'Eq. iluminación', material: 'Accesorio Mtaje Panel Led', idArt: 1688, precio: 15200 },
  { seccion: 'Eq. iluminación', material: 'Foco Sobrep LED 24W', idArt: 1713, precio: 14320 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Tub Flexible Metálica c/acces', idArt: 1711, precio: 3390 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Tubería EMT c/accesorio', idArt: 1710, precio: 3900 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Ducto Flex/Rig 32mm LH (Incl Acc)', idArt: 1682, precio: 3744 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Caja Chuqui PVC', idArt: 324, precio: 1200 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Int. Difer. Legrand 2x10A 10mA', idArt: 1695, precio: 102500 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Int. Difer. Legrand 2x16A 10mA', idArt: 1696, precio: 24200 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Cordón Flex 3x18 AWG', idArt: 250, precio: 919 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Cable RZ-1 3x1.5mm2', idArt: 251, precio: 1658 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Cable RZ-1 5x4mm2', idArt: 1686, precio: 4620 },
  { seccion: 'SPT', material: 'Barra Coperw 5/8 Inc. Con', idArt: 1702, precio: 12540 },
  { seccion: 'SPT', material: 'Camarilla Registro PVC', idArt: 1703, precio: 5600 },
]

const seccionesCatalogoPrecios = [...new Set(catalogoPreciosProtocolo.map((item) => item.seccion))]
const valorBaseManoObraMantencion = 18900
const encabezadosProtocolosMensuales = [
  { clave: 'ver', lineas: ['Ver'], align: 'center' },
  { clave: 'serie', lineas: ['Serie'] },
  { clave: 'fecha', lineas: ['Fecha'] },
  { clave: 'tipo', lineas: ['Tipo', 'Modulo'] },
  { clave: 'mantencion', lineas: ['Valor', 'mantencion'] },
  { clave: 'modificacion', lineas: ['Valor', 'modificacion'] },
  { clave: 'total', lineas: ['Valor', 'total'] },
  { clave: 'idOt', lineas: ['ID.', 'OT'] },
]

function separarIdsOt(valor) {
  const valores = String(valor ?? '')
    .split(/[\/,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3)

  while (valores.length < 3) valores.push('')
  return valores
}

function unirIdsOt(valores = []) {
  return valores
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' / ')
}

function formatearPrecioMaterial(valor) {
  const numero = normalizarPrecioMaterial(valor)
  if (!numero) return '$ 0'
  return `$ ${numero.toLocaleString('es-CL')}`
}

function limpiarPrecioMaterial(valor) {
  return String(valor ?? '').replace(/[^\d]/g, '')
}

function normalizarPrecioMaterial(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0

  const texto = String(valor ?? '').trim().replace(/[^\d,.-]/g, '')
  if (!texto) return 0

  const tienePunto = texto.includes('.')
  const tieneComa = texto.includes(',')

  if (tienePunto && tieneComa) {
    const ultimoPunto = texto.lastIndexOf('.')
    const ultimaComa = texto.lastIndexOf(',')
    if (ultimaComa > ultimoPunto) {
      return Number(texto.replace(/\./g, '').replace(',', '.')) || 0
    }
    return Number(texto.replace(/,/g, '')) || 0
  }

  if (tienePunto) {
    const partes = texto.split('.')
    const ultimaParte = partes[partes.length - 1]
    const pareceDecimal = partes.length === 2 && ultimaParte.length <= 2
    if (pareceDecimal) return Number(texto) || 0
    return Number(texto.replace(/\./g, '')) || 0
  }

  if (tieneComa) {
    const partes = texto.split(',')
    const ultimaParte = partes[partes.length - 1]
    const pareceDecimal = partes.length === 2 && ultimaParte.length <= 2
    if (pareceDecimal) return Number(texto.replace(',', '.')) || 0
    return Number(texto.replace(/,/g, '')) || 0
  }

  return Number(texto) || 0
}

function normalizarTextoComparacion(valor) {
  return String(valor || '')
    .replace(/Ã¡/gi, 'a')
    .replace(/Ã©/gi, 'e')
    .replace(/Ã­/gi, 'i')
    .replace(/Ã³/gi, 'o')
    .replace(/Ãº/gi, 'u')
    .replace(/Ã±/gi, 'n')
    .replace(/Â/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

const equivalenciasPrecioProtocolo = {
  [normalizarTextoComparacion('Conduit 20mm')]: 'Ducto Flex/Rig 20mm LH (Incl Acc)',
  [normalizarTextoComparacion('Conduit 25mm')]: 'Ducto Flex/Rig 25mm LH (Incl Acc)',
  [normalizarTextoComparacion('Caja metálica 100x100x65')]: 'Caja Metálica 100x100x65',
  [normalizarTextoComparacion('Caja tabique LH')]: 'Caja Tabique 3 Puestos LH',
  [normalizarTextoComparacion('Tapa ciega - Pasac.')]: 'Tapa Ciega - Plástica / Metálica',
  [normalizarTextoComparacion('Cable RZ1 2,5mm')]: 'Cable RZ1 2,5mm (Alum + Ench)',
  [normalizarTextoComparacion('Cable RZ1 4mm')]: 'Cable RZ1 4mm (Termo)',
  [normalizarTextoComparacion('Cable RZ1 6mm')]: 'Cable RZ1 6mm (Alimentación)',
  [normalizarTextoComparacion('Cordon flex 3 x 2.5/4mm')]: 'Cable RZ1 3x2.5 / 4mm (Ilu-Term)',
  [normalizarTextoComparacion('Cordon flex 3 x 6mm')]: 'Cable RZ1 3x6mm (Alimentación)',
  [normalizarTextoComparacion('Plafón')]: 'Foco Led 12W Sob',
  [normalizarTextoComparacion('Extractor')]: 'Instalación Extractor',
  [normalizarTextoComparacion('Conduit 32mm')]: 'Ducto Flex/Rig 32mm LH (Incl Acc)',
  [normalizarTextoComparacion('Artefacto simple')]: 'Artefacto Simple',
  [normalizarTextoComparacion('Artefacto doble')]: 'Artefacto Doble',
  [normalizarTextoComparacion('Artefacto triple')]: 'Artefacto Triple',
  [normalizarTextoComparacion('Tapa ciega artefacto')]: 'Tapa Ciega + Soporte',
  [normalizarTextoComparacion('Ench. Ind. 32A hembra')]: 'Ench Hembra Indep 32A',
  [normalizarTextoComparacion('Ench. Ind. 32A macho')]: 'Enchufe Mch Indep 32A',
  [normalizarTextoComparacion('Tablero IP65')]: 'Tablero PVC IP65',
  [normalizarTextoComparacion('Tablero armado')]: 'Inst Tab. TOP (Armado)',
  [normalizarTextoComparacion('Aut. monof. 10-16-20A')]: 'Aut. Monof 10-16-20A',
  [normalizarTextoComparacion('Aut. bifásico 2x10A')]: 'Auto. Bifásico 2x10A',
  [normalizarTextoComparacion('Aut. bifásico 2x16A')]: 'Auto. Bifásico 2x16A',
  [normalizarTextoComparacion('Aut. bifásico 2x20A')]: 'Auto. Bifásico 2x20A',
  [normalizarTextoComparacion('Aut. bifásico 2x25A')]: 'Auto. Bifásico 2x25-32A',
  [normalizarTextoComparacion('Porta Fusible')]: 'Porta Fusibles',
  [normalizarTextoComparacion('Repartidor 4x80A')]: 'Repartidor 4x80A',
  [normalizarTextoComparacion('Falso polo')]: 'Falso Polo 1Mts',
  [normalizarTextoComparacion('BPC LH 100x45 + acces')]: 'BPC LH 100x45 + Acces',
  [normalizarTextoComparacion('Tapa idrobox IP65')]: 'Tapa Idrobox IP55',
  [normalizarTextoComparacion('Foco sobrep LED 18w')]: 'Foco Sobrep LED 18W',
  [normalizarTextoComparacion('Panel led 600x600 mm')]: 'Panel Led 600x600mm',
  [normalizarTextoComparacion('Accesorio Montaje Panel Led')]: 'Accesorio Mtaje Panel Led',
  [normalizarTextoComparacion('Foco sobrep led 24w')]: 'Foco Sobrep LED 24W',
}

function obtenerMaterialPrecioParaProtocolo(itemProtocolo) {
  const clave = normalizarTextoComparacion(itemProtocolo)
  const directo = catalogoPreciosProtocolo.find((item) => normalizarTextoComparacion(item.material) === clave)
  if (directo) return directo.material
  return equivalenciasPrecioProtocolo[clave] || itemProtocolo
}

function calcularCobroCantidadProtocolo(valor, precioUnitario) {
  const cantidad = parsearCantidadProtocolo(valor)
  const nuevo = Number(cantidad?.nuevo || 0)
  const reutilizado = Number(cantidad?.reutilizado || 0)
  const subtotalNuevo = nuevo * precioUnitario
  const subtotalReutilizado = reutilizado * (precioUnitario / 2)

  return {
    nuevo,
    reutilizado,
    precioNuevo: precioUnitario,
    precioReutilizado: precioUnitario / 2,
    subtotalNuevo,
    subtotalReutilizado,
    subtotal: subtotalNuevo + subtotalReutilizado,
  }
}

function formatearFechaInput(fecha) {
  const ano = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function formatearFechaRevisionGarantia(valor) {
  const fechaInput = fechaParaInput(valor)
  if (!fechaInput) return ''
  const [ano, mes, dia] = fechaInput.split('-')
  return `${dia}-${mes}-${ano}`
}

function agregarNotaGarantiaProtocolo(protocolo = {}, fechaRevision) {
  const fechaTexto = formatearFechaRevisionGarantia(fechaRevision)
  if (!fechaTexto) return protocolo

  const notaGarantia = `en garantia, ultima revision:${fechaTexto}`
  const observacionesActuales = String(protocolo.observaciones || '').trim()
  const observacionesSinNota = observacionesActuales
    .split('\n')
    .filter((linea) => !normalizarTexto(linea).startsWith('en garantia, ultima revision:'))
    .join('\n')
    .trim()

  return {
    ...protocolo,
    observaciones: [observacionesSinNota, notaGarantia].filter(Boolean).join('\n'),
  }
}

function completarDatosPruebaEnProtocolo(protocolo = {}, modulo = {}, fechaPrueba, responsablePrueba = '') {
  const fechaProtocolo = fechaParaInput(fechaPrueba)

  return {
    ...protocolo,
    fecha: fechaProtocolo || protocolo.fecha || '',
    responsable: modulo.responsable || protocolo.responsable || responsablePrueba || '',
    serie: protocolo.serie || modulo.serie || '',
    tipo: protocolo.tipo || modulo.tipo || '',
    proyecto: protocolo.proyecto || modulo.proyecto || '',
    linea: protocolo.linea || modulo.linea || '',
  }
}

function sincronizarDatosModuloEnProtocolo(protocolo = {}, modulo = {}) {
  return {
    ...protocolo,
    serie: modulo.serie ?? protocolo.serie ?? '',
    tipo: modulo.tipo ?? protocolo.tipo ?? '',
    proyecto: modulo.proyecto ?? protocolo.proyecto ?? '',
    linea: modulo.linea ?? protocolo.linea ?? '',
    responsable: modulo.responsable ?? protocolo.responsable ?? '',
    estado: modulo.estado ?? protocolo.estado ?? '',
  }
}

function obtenerValorInicialRangoProtocolo(rango) {
  const hoy = new Date()
  if (rango === 'dia') return formatearFechaInput(hoy)
  if (rango === 'semana') {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const diaSemana = fecha.getDay() || 7
    fecha.setDate(fecha.getDate() + 4 - diaSemana)
    const anoSemana = fecha.getFullYear()
    const inicioAnoSemana = new Date(anoSemana, 0, 1)
    const semana = Math.ceil((((fecha - inicioAnoSemana) / 86400000) + 1) / 7)
    return `${anoSemana}-W${String(semana).padStart(2, '0')}`
  }
  return formatearFechaInput(hoy).slice(0, 7)
}

function obtenerRangoFechasProtocolos(rango, valor) {
  if (rango === 'dia') {
    const inicio = new Date(`${valor}T00:00:00`)
    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + 1)
    return { inicio: `${valor}T00:00:00`, fin: `${formatearFechaInput(fin)}T00:00:00` }
  }

  if (rango === 'semana') {
    const [anoTexto, semanaTexto = 'W1'] = String(valor || '').split('-W')
    const ano = Number(anoTexto)
    const semana = Number(semanaTexto)
    const primerDiaAno = new Date(ano, 0, 1)
    const diaSemana = primerDiaAno.getDay() || 7
    const lunesSemana1 = new Date(ano, 0, 1 + (diaSemana <= 4 ? 1 - diaSemana : 8 - diaSemana))
    const inicio = new Date(lunesSemana1)
    inicio.setDate(lunesSemana1.getDate() + (semana - 1) * 7)
    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + 7)
    return { inicio: `${formatearFechaInput(inicio)}T00:00:00`, fin: `${formatearFechaInput(fin)}T00:00:00` }
  }

  const inicio = `${valor}-01T00:00:00`
  const fin = new Date(`${valor}-01T00:00:00`)
  fin.setMonth(fin.getMonth() + 1)
  return { inicio, fin: `${formatearFechaInput(fin)}T00:00:00` }
}

function fechaDentroDeRangoProtocolo(fecha, inicio, fin) {
  const fechaNormalizada = fechaParaInput(fecha)
  const inicioNormalizado = fechaParaInput(inicio)
  const finNormalizado = fechaParaInput(fin)
  return Boolean(
    fechaNormalizada &&
    inicioNormalizado &&
    finNormalizado &&
    fechaNormalizada >= inicioNormalizado &&
    fechaNormalizada < finNormalizado
  )
}

function FormularioElectrico({ valores, onChange }) {
  return (
    <div style={{ display: 'grid', gap: '8px', marginBottom: '14px', textAlign: 'left' }}>
      {seccionesFormularioElectrico.map((seccion, index) => (
        <details
          key={seccion.nombre}
          defaultOpen={index === 0}
          style={{ border: '1px solid #555', borderRadius: '8px', overflow: 'hidden' }}
        >
          <summary
            style={{
              padding: '10px 12px',
              background: '#333',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {seccion.nombre}
          </summary>

          <div style={{ padding: '6px 10px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 64px 76px',
                gap: '7px',
                padding: '4px 0',
                fontSize: '12px',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              <span />
              <span>Nuevo</span>
              <span>Reutilizado</span>
            </div>

            {seccion.items.map((item) => {
              const valorGuardado = valores[item]
              const cantidades =
                valorGuardado && typeof valorGuardado === 'object'
                  ? valorGuardado
                  : { nuevo: valorGuardado ?? '', reutilizado: '' }

              return (
                <div
                  key={item}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 64px 76px',
                    gap: '7px',
                    alignItems: 'center',
                    padding: '7px 0',
                    borderBottom: '1px solid #444',
                  }}
                >
                  <span style={{ lineHeight: 1.2 }}>{item}</span>
                  {['nuevo', 'reutilizado'].map((tipo) => (
                    <input
                      key={tipo}
                      type="number"
                      min="0"
                      inputMode="numeric"
                      aria-label={`${tipo} de ${item}`}
                      value={cantidades[tipo] ?? ''}
                      onChange={(e) => onChange(item, tipo, e.target.value)}
                      style={{ width: '100%', padding: '8px 5px', boxSizing: 'border-box' }}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </details>
      ))}
    </div>
  )
}


function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function iniciarSesion() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '300px',
        margin: '100px auto',
      }}
    >
      <h2>Iniciar sesión</h2>

      <input
        type="email"
        placeholder="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={iniciarSesion}>
        Ingresar
      </button>
    </div>
  )
}
function App() {
  const [datos, setDatos] = useState([])
const [moduloSeleccionado, setModuloSeleccionado] = useState(null)
const [historial, setHistorial] = useState([])

const [estadoEditado, setEstadoEditado] = useState('')
const [lineaEditada, setLineaEditada] = useState('')
const [posicionEditada, setPosicionEditada] = useState('')
const [fechaPruebaEditada, setFechaPruebaEditada] = useState('')
const [serieBusqueda, setSerieBusqueda] = useState('')
const [resultadoBusqueda, setResultadoBusqueda] = useState([])
const [busquedaRealizada, setBusquedaRealizada] = useState(false)
const [mostrarNuevoModulo, setMostrarNuevoModulo] = useState(false)
const [creandoModulo, setCreandoModulo] = useState(false)
const [posicionSeleccionada, setPosicionSeleccionada] = useState(null)
const [serieNueva, setSerieNueva] = useState('')
const [tipoNuevo, setTipoNuevo] = useState('')
const [proyectoNuevo, setProyectoNuevo] = useState('')
const [responsableNuevo, setResponsableNuevo] = useState('')
const [fechaDesde, setFechaDesde] = useState('')
const [fechaHasta, setFechaHasta] = useState('')
const [session, setSession] = useState(null)
const [perfil, setPerfil] = useState(null)
  const [serieEditada, setSerieEditada] = useState('')
const [tipoEditado, setTipoEditado] = useState('')
const [proyectoEditado, setProyectoEditado] = useState('')
const [responsableEditado, setResponsableEditado] = useState('')
const [mostrarKPI, setMostrarKPI] = useState(false)
const [mostrarVistaGeneral, setMostrarVistaGeneral] = useState(false)
const [notificacion, setNotificacion] = useState(null)
const [moduloEnDrag, setModuloEnDrag] = useState(null)
const [notaEditada, setNotaEditada] = useState('')
const [nombreSolicitante, setNombreSolicitante] = useState('')
const [rolSolicitante, setRolSolicitante] = useState('')
const [formulariosElectricos, setFormulariosElectricos] = useState({})
const [materialesEditados, setMaterialesEditados] = useState({})
const [mostrarResumenMateriales, setMostrarResumenMateriales] = useState(false)
const [mostrarEditorMateriales, setMostrarEditorMateriales] = useState(false)
const [cargandoMateriales, setCargandoMateriales] = useState(false)
const [avisoPruebaElectrica, setAvisoPruebaElectrica] = useState(null)
const [mostrarLlamadosPendientes, setMostrarLlamadosPendientes] = useState(false)
const [mostrarRegistroAcciones, setMostrarRegistroAcciones] = useState(false)
const [mostrarTodasAccionesDia, setMostrarTodasAccionesDia] = useState(false)
const [accionesDia, setAccionesDia] = useState([])
const [cargandoAccionesDia, setCargandoAccionesDia] = useState(false)
const [solicitantesPendientes, setSolicitantesPendientes] = useState({})
const [mostrarMenuAcciones, setMostrarMenuAcciones] = useState(false)
const [mostrarMenuModulo, setMostrarMenuModulo] = useState(false)
const [mostrarReintegrar, setMostrarReintegrar] = useState(false)
const [mostrarDescargaProtocolos, setMostrarDescargaProtocolos] = useState(false)
const [mostrarPreciosMateriales, setMostrarPreciosMateriales] = useState(false)
const [mostrarProtocolosMensuales, setMostrarProtocolosMensuales] = useState(false)
const [preciosMateriales, setPreciosMateriales] = useState({})
const [cargandoPreciosMateriales, setCargandoPreciosMateriales] = useState(false)
const [guardandoPreciosMateriales, setGuardandoPreciosMateriales] = useState(false)
const [precioMaterialEnEdicion, setPrecioMaterialEnEdicion] = useState(null)
const [rangoProtocolosMensuales, setRangoProtocolosMensuales] = useState('mes')
const [fechaProtocolosMensuales, setFechaProtocolosMensuales] = useState(new Date().toISOString().slice(0, 7))
const [protocolosMensuales, setProtocolosMensuales] = useState([])
const [cargandoProtocolosMensuales, setCargandoProtocolosMensuales] = useState(false)
const [busquedaProtocolosMensuales, setBusquedaProtocolosMensuales] = useState('')
const [idOtEnEdicion, setIdOtEnEdicion] = useState(null)
const [idsOtEnEdicion, setIdsOtEnEdicion] = useState(['', '', ''])
const [detalleCobroSeleccionado, setDetalleCobroSeleccionado] = useState(null)
const [ajusteCobroMensual, setAjusteCobroMensual] = useState({ itemKey: '', itemLabel: '', tipoCobro: '', valor: '', motivo: '' })
const [versionProtocoloEntrega, setVersionProtocoloEntrega] = useState(0)
const [fechaProtocolosDiarios, setFechaProtocolosDiarios] = useState(new Date().toISOString().slice(0, 10))
const [descargandoProtocolos, setDescargandoProtocolos] = useState(false)
const [serieReintegrar, setSerieReintegrar] = useState('')
const [lineaReintegrar, setLineaReintegrar] = useState(1)
const [extremoReintegrar, setExtremoReintegrar] = useState('fin')
const [historialSeleccionadoReintegrar, setHistorialSeleccionadoReintegrar] = useState(null)
const [reintegrandoModulo, setReintegrandoModulo] = useState(false)
const [mostrarProtocoloEntrega, setMostrarProtocoloEntrega] = useState(false)
const [datosProtocoloEntrega, setDatosProtocoloEntrega] = useState({})
const [responsableProtocolo, setResponsableProtocolo] = useState('')
const [protocoloSoloLecturaBusqueda, setProtocoloSoloLecturaBusqueda] = useState(false)
const [protocoloDesdeHistorial, setProtocoloDesdeHistorial] = useState(false)
const [protocoloManualMensual, setProtocoloManualMensual] = useState(false)
const solicitudesPendientesRef = useRef(new Set())
const autoScrollArrastreRef = useRef(null)
const esRolSoloLectura = ['visor', 'analista', 'electrico'].includes(perfil?.rol)
const puedeAgregarModulos = ['admin', 'operador', 'colaborador'].includes(perfil?.rol)
const puedeMoverModulos = ['admin', 'operador', 'colaborador'].includes(perfil?.rol)
const puedeFinalizarModulos = ['admin', 'colaborador'].includes(perfil?.rol)
const puedeResolverPrueba = ['admin', 'control_calidad'].includes(perfil?.rol)
const puedeUsarProtocolo = ['admin', 'operador', 'control_calidad', 'visor', 'analista'].includes(perfil?.rol)
const puedeEditarProtocolo = ['admin', 'operador'].includes(perfil?.rol)
const puedeEditarDatosProtocolo = ['admin', 'operador', 'control_calidad'].includes(perfil?.rol)
const puedeEditarDatosModulo = puedeEditarDatosProtocolo
const recibeAvisosPrueba = ['admin', 'control_calidad', 'operador'].includes(perfil?.rol)
const puedeDescargarProtocolosDiarios = ['analista', 'admin', 'operador', 'control_calidad'].includes(perfil?.rol)
const puedeVerPreciosMateriales = ['operador', 'analista', 'admin'].includes(perfil?.rol)
const puedeEditarPreciosMateriales = ['analista', 'admin'].includes(perfil?.rol)
const puedeVerProtocolosMensuales = ['analista', 'admin'].includes(perfil?.rol)
const puedeEliminarProtocolosMensuales = ['admin', 'analista'].includes(perfil?.rol)
const puedeAjustarValoresProtocolos = ['admin', 'analista'].includes(perfil?.rol)
const puedeVerMenuAcciones = puedeAgregarModulos || puedeDescargarProtocolosDiarios || puedeVerPreciosMateriales
const puedeVerMenuModulo = ['admin', 'operador'].includes(perfil?.rol)
const puedeDejarObservacionAlerta = puedeVerMenuModulo && esEstadoConObservacionAlerta(moduloSeleccionado?.estado)
const llamadosPendientes = datos.filter(
  (modulo) => modulo.serie && esSolicitudPruebaActiva(modulo.solicitud_prueba)
)
const ingresosProtocolosMensuales = protocolosMensuales.reduce(
  (total, registro) => total + Number(registro.valorTotal || 0),
  0
)
const protocolosMensualesFiltrados = protocolosMensuales.filter((registro) => {
  const busqueda = normalizarTexto(busquedaProtocolosMensuales)
  if (!busqueda) return true
  return normalizarTexto(registro.serie).includes(busqueda) || normalizarTexto(registro.idOt).includes(busqueda)
})
const conteoClavesProtocolos = protocolosMensuales.reduce((conteo, registro) => {
  const clave = claveProtocoloUnico(registro.serie, registro.fecha_prueba_electrica)
  if (!clave) return conteo
  conteo[clave] = (conteo[clave] || 0) + 1
  return conteo
}, {})
const materialesModuloSeleccionado = formulariosElectricos[moduloSeleccionado?.id] || {}
const resumenMateriales = Object.entries(materialesModuloSeleccionado)
  .map(([material, valor]) => {
    const cantidades = valor && typeof valor === 'object'
      ? valor
      : { nuevo: valor ?? '', reutilizado: '' }

    return [material, cantidades.nuevo || 0, cantidades.reutilizado || 0]
  })
  .filter(([, nuevo, reutilizado]) => Number(nuevo) > 0 || Number(reutilizado) > 0)

useEffect(() => {
  if (!notificacion) return

  const timer = window.setTimeout(() => setNotificacion(null), 3000)

  return () => window.clearTimeout(timer)
}, [notificacion])

useEffect(() => {
  if (!avisoPruebaElectrica) return

  const timer = window.setTimeout(() => setAvisoPruebaElectrica(null), 6000)
  return () => window.clearTimeout(timer)
}, [avisoPruebaElectrica])

function mostrarNotificacion(mensaje) {
  setNotificacion(mensaje)
}

function rangoDiaActual() {
  const hoy = formatearFechaInput(new Date())
  const manana = new Date(`${hoy}T00:00:00`)
  manana.setDate(manana.getDate() + 1)
  return {
    inicio: `${hoy}T00:00:00`,
    fin: `${formatearFechaInput(manana)}T00:00:00`,
  }
}

function nombreTipoAccion(tipo) {
  if (tipo === 'ingreso') return 'Ingreso'
  if (tipo === 'finalizacion') return 'Finalización'
  if (tipo === 'cambio_estado') return 'Cambio estado'
  if (tipo === 'aprobacion_prueba_electrica') return 'Aprobación prueba eléctrica'
  if (tipo === 'rechazo_prueba_electrica') return 'Rechazo prueba eléctrica'
  return tipo || 'Acción'
}

async function cargarAccionesDia() {
  if (perfil?.rol !== 'admin') return

  setCargandoAccionesDia(true)
  const { inicio, fin } = rangoDiaActual()
  const { data, error } = await supabase
    .from('registro_acciones_modulos')
    .select('*')
    .gte('created_at', inicio)
    .lt('created_at', fin)
    .order('created_at', { ascending: false })
  setCargandoAccionesDia(false)

  if (error) {
    console.error(error)
    mostrarNotificacion('No se pudo cargar el registro de acciones. Revisa si existe la tabla en Supabase.')
    return
  }

  setAccionesDia(data || [])
}

async function registrarAccionModulo({ tipo, modulo = {}, datosAntes = null, datosDespues = null, descripcion = '' }) {
  const payload = {
    tipo,
    modulo_id: String(modulo?.id || datosDespues?.id || datosAntes?.id || ''),
    serie: modulo?.serie || datosDespues?.serie || datosAntes?.serie || '',
    linea: modulo?.linea || datosDespues?.linea || datosAntes?.linea || null,
    descripcion,
    usuario_id: session?.user?.id || null,
    usuario_nombre: perfil?.nombre || perfil?.email || session?.user?.email || perfil?.rol || '',
    datos_antes: datosAntes,
    datos_despues: datosDespues,
    deshecho: false,
  }

  const { error } = await supabase
    .from('registro_acciones_modulos')
    .insert([payload])

  if (error) {
    console.error(error)
    if (!error.message?.includes('registro_acciones_modulos')) {
      mostrarNotificacion('La acción se realizó, pero no se pudo guardar en el registro: ' + error.message)
    }
  }
}

async function marcarAccionDeshecha(accion) {
  const { error } = await supabase
    .from('registro_acciones_modulos')
    .update({
      deshecho: true,
      fecha_deshacer: new Date().toISOString(),
      deshecho_por: perfil?.nombre || session?.user?.email || '',
    })
    .eq('id', accion.id)

  if (error) {
    mostrarNotificacion('La acción se deshizo, pero no se pudo marcar en el registro: ' + error.message)
    return
  }

  await cargarAccionesDia()
}

async function deshacerAccionModulo(accion) {
  if (perfil?.rol !== 'admin' || !accion || accion.deshecho) return

  const confirmado = window.confirm(`¿Deshacer ${nombreTipoAccion(accion.tipo).toLowerCase()} de la serie ${accion.serie || ''}?`)
  if (!confirmado) return

  if (accion.tipo === 'ingreso') {
    const idModulo = accion.datos_despues?.id || accion.modulo_id
    const { error } = await supabase
      .from('modulos')
      .delete()
      .eq('id', idModulo)

    if (error) {
      mostrarNotificacion('No se pudo deshacer el ingreso: ' + error.message)
      return
    }
  } else if (accion.tipo === 'cambio_estado' || accion.tipo === 'aprobacion_prueba_electrica') {
    const anterior = accion.datos_antes || {}
    const { error } = await supabase
      .from('modulos')
      .update({
        estado: anterior.estado,
        solicitud_prueba: accion.tipo === 'aprobacion_prueba_electrica'
          ? true
          : anterior.solicitud_prueba,
        fecha_prueba_electrica: anterior.fecha_prueba_electrica || null,
        protocolo_entrega: anterior.protocolo_entrega || {},
      })
      .eq('id', anterior.id || accion.modulo_id)

    if (error) {
      mostrarNotificacion('No se pudo deshacer la acción: ' + error.message)
      return
    }
  } else if (accion.tipo === 'rechazo_prueba_electrica') {
    const anterior = accion.datos_antes || {}
    const { error } = await supabase
      .from('modulos')
      .update({
        solicitud_prueba: true,
        solicitado_por: anterior.solicitado_por || null,
        fecha_solicitud: anterior.fecha_solicitud || null,
      })
      .eq('id', anterior.id || accion.modulo_id)

    if (error) {
      mostrarNotificacion('No se pudo deshacer el rechazo: ' + error.message)
      return
    }
  } else if (accion.tipo === 'finalizacion') {
    const moduloAnterior = accion.datos_antes || {}
    const historialId = accion.datos_despues?.id

    const moduloRestaurado = { ...moduloAnterior }
    delete moduloRestaurado.modulo_id
    delete moduloRestaurado.fecha_salida

    const { error: errorInsert } = await supabase
      .from('modulos')
      .insert([moduloRestaurado])

    if (errorInsert) {
      mostrarNotificacion('No se pudo restaurar el módulo. Es posible que la posición ya esté ocupada: ' + errorInsert.message)
      return
    }

    if (historialId) {
      const { error: errorDelete } = await supabase
        .from('historial_modulos')
        .delete()
        .eq('id', historialId)

      if (errorDelete) {
        mostrarNotificacion('Módulo restaurado, pero no se pudo eliminar del historial: ' + errorDelete.message)
        return
      }
    }
  }

  await marcarAccionDeshecha(accion)
  await cargarTablero()
  await cargarHistorial()
  mostrarNotificacion('Acción deshecha correctamente')
}

function detenerAutoScrollArrastre() {
  if (autoScrollArrastreRef.current) {
    window.cancelAnimationFrame(autoScrollArrastreRef.current)
    autoScrollArrastreRef.current = null
  }
}

function autoScrollLineaDuranteArrastre(contenedor, posicionX) {
  if (!contenedor) return

  const rect = contenedor.getBoundingClientRect()
  const margenActivo = 90
  const velocidadMaxima = 22
  let velocidad = 0

  if (posicionX < rect.left + margenActivo) {
    const intensidad = (rect.left + margenActivo - posicionX) / margenActivo
    velocidad = -Math.ceil(intensidad * velocidadMaxima)
  } else if (posicionX > rect.right - margenActivo) {
    const intensidad = (posicionX - (rect.right - margenActivo)) / margenActivo
    velocidad = Math.ceil(intensidad * velocidadMaxima)
  }

  detenerAutoScrollArrastre()

  if (!velocidad) return

  const desplazar = () => {
    contenedor.scrollLeft += velocidad
    autoScrollArrastreRef.current = window.requestAnimationFrame(desplazar)
  }

  autoScrollArrastreRef.current = window.requestAnimationFrame(desplazar)
}

useEffect(() => {
  return () => detenerAutoScrollArrastre()
}, [])

function cerrarPanelesFlotantes() {
  setMostrarLlamadosPendientes(false)
  setMostrarRegistroAcciones(false)
  setMostrarTodasAccionesDia(false)
  setMostrarMenuAcciones(false)
  setMostrarMenuModulo(false)
}

function cerrarPanelesYModulo() {
  limpiarBusquedaSerie()
  cerrarVentanasEmergentes()
}

function hayMaterialesPendientes(moduloId = moduloSeleccionado?.id) {
  return Boolean(moduloId && Object.keys(materialesEditados[moduloId] || {}).length > 0)
}

function cerrarEditorMateriales({ forzar = false } = {}) {
  if (!forzar && hayMaterialesPendientes()) {
    const confirmar = window.confirm('Hay cambios de materiales sin guardar. ¿Cerrar de todas formas?')
    if (!confirmar) return
  }
  if (moduloSeleccionado?.id) {
    setMaterialesEditados((actuales) => {
      const copia = { ...actuales }
      delete copia[moduloSeleccionado.id]
      return copia
    })
  }
  setMostrarEditorMateriales(false)
}

function limpiarBusquedaSerie() {
  setSerieBusqueda('')
  setResultadoBusqueda([])
  setBusquedaRealizada(false)
}

function cerrarVentanasEmergentes({ conservarModulo = false, forzarCerrarMateriales = false } = {}) {
  cerrarPanelesFlotantes()
  const bloqueoCierreMateriales = mostrarEditorMateriales && hayMaterialesPendientes() && !forzarCerrarMateriales
  setMostrarResumenMateriales(false)
  if (bloqueoCierreMateriales) {
    mostrarNotificacion('Hay materiales sin guardar. Guarda o cierra el editor antes de tocar el tablero.')
  } else {
    setMostrarEditorMateriales(false)
  }
  setMostrarProtocoloEntrega(false)
  setProtocoloSoloLecturaBusqueda(false)
  setProtocoloDesdeHistorial(false)
  setProtocoloManualMensual(false)
  setMostrarNuevoModulo(false)
  setCreandoModulo(false)
  setMostrarReintegrar(false)
  setMostrarDescargaProtocolos(false)
  setMostrarPreciosMateriales(false)
  setPrecioMaterialEnEdicion(null)
  setDetalleCobroSeleccionado(null)

  if (!conservarModulo && !bloqueoCierreMateriales) {
    limpiarEstadosModal()
  }
}

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session)
  })

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session)
    }
  )
  return () => subscription.unsubscribe()
}, [])

useEffect(() => {
  if (session) {
    cargarPerfil()
  }
}, [session])

useEffect(() => {
  cargarTablero()
  cargarHistorial()
}, [])

useEffect(() => {
  const intervalo = setInterval(() => {
    cargarTablero()
  }, 5000)

  return () => clearInterval(intervalo)
}, [])

useEffect(() => {
  const canalModulos = supabase
    .channel('cambios-modulos-tablero')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'modulos' },
      (cambio) => {
        const moduloActualizado = cambio.new

        if (
          recibeAvisosPrueba &&
          esSolicitudPruebaActiva(moduloActualizado?.solicitud_prueba) &&
          !solicitudesPendientesRef.current.has(moduloActualizado.id)
        ) {
          setAvisoPruebaElectrica({
            linea: moduloActualizado.linea,
            id: moduloActualizado.id,
          })
        }

        if (esSolicitudPruebaActiva(moduloActualizado?.solicitud_prueba)) {
          solicitudesPendientesRef.current.add(moduloActualizado.id)
        } else if (moduloActualizado?.id) {
          solicitudesPendientesRef.current.delete(moduloActualizado.id)
        }

        cargarTablero()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(canalModulos)
  }
}, [perfil?.rol, recibeAvisosPrueba])

useEffect(() => {
  if (!recibeAvisosPrueba) return

  const modulosPendientes = datos.filter(
    (modulo) => modulo.id && esSolicitudPruebaActiva(modulo.solicitud_prueba)
  )

  if (modulosPendientes.length === 0) {
    return
  }

  async function cargarSolicitantesPendientes() {
    const idsModulos = modulosPendientes.map((modulo) => modulo.id)
    const { data: modulos, error: errorModulos } = await supabase
      .from('modulos')
      .select('id, solicitado_por')
      .in('id', idsModulos)

    if (errorModulos) {
      console.error(errorModulos)
      return
    }

    const idsPerfiles = [...new Set(
      (modulos || []).map((modulo) => modulo.solicitado_por).filter(Boolean)
    )]

    if (idsPerfiles.length === 0) {
      setSolicitantesPendientes({})
      return
    }

    const { data: perfiles, error: errorPerfiles } = await supabase
      .from('perfiles')
      .select('id, nombre')
      .in('id', idsPerfiles)

    if (errorPerfiles) {
      console.error(errorPerfiles)
      return
    }

    const nombresPorPerfil = new Map(
      (perfiles || []).map((perfilSolicitante) => [perfilSolicitante.id, perfilSolicitante.nombre])
    )

    setSolicitantesPendientes(
      Object.fromEntries(
        (modulos || []).map((modulo) => [
          modulo.id,
          nombresPorPerfil.get(modulo.solicitado_por) || 'No disponible',
        ])
      )
    )
  }

  cargarSolicitantesPendientes()
}, [datos, recibeAvisosPrueba])

if (!session) {
  return <Login />
}

async function cargarPerfil() {
  const usuario = session?.user

  if (!usuario) return

  const { data, error } = await supabase
  .from('perfiles')
  .select('*')
  .eq('id', usuario.id)
  .maybeSingle()

  console.log('USUARIO:', usuario.id)
  console.log('PERFIL:', data)
  console.log('ERROR PERFIL:', error)

  if (error) {
    console.error(error)
    return
  }

  setPerfil(data)
}
  
  async function cargarTablero() {
    const { data: tableroData, error: tableroError } = await supabase
      .from('tablero')
      .select('*')
      .order('linea')
      .order('posicion')

    if (tableroError) {
      console.error(tableroError)
      return
    }

    let { data: modulosData, error: modulosError } = await supabase
      .from('modulos')
      .select('id, nota, observacion_alerta, fecha_prueba_electrica')

    if (modulosError?.message?.includes('observacion_alerta')) {
      ;({ data: modulosData, error: modulosError } = await supabase
        .from('modulos')
        .select('id, nota, fecha_prueba_electrica'))
    }

    if (modulosError) {
      console.error(modulosError)
      return
    }

    const modulosMap = new Map((modulosData || []).map((item) => [item.id, item]))
    const mergedData = (tableroData || []).map((row) => ({
      ...row,
      nota: row.nota || modulosMap.get(row.id)?.nota || '',
      observacion_alerta: row.observacion_alerta || modulosMap.get(row.id)?.observacion_alerta || '',
      fecha_prueba_electrica: row.fecha_prueba_electrica || modulosMap.get(row.id)?.fecha_prueba_electrica || null,
      solicitud_prueba: esSolicitudPruebaActiva(row.solicitud_prueba),
    }))

    solicitudesPendientesRef.current = new Set(
      mergedData
        .filter((modulo) => esSolicitudPruebaActiva(modulo.solicitud_prueba))
        .map((modulo) => modulo.id)
    )

    setDatos(mergedData)
  }

  async function cargarHistorial() {
  try {
    const data = await obtenerHistorial()
    setHistorial(data || [])
  } catch (error) {
    console.error(error)
  }
}

async function buscarSerie() {
  const serie = serieBusqueda.trim()

  if (!serie) {
    setResultadoBusqueda([])
    setBusquedaRealizada(false)
    return
  }

  const [respuestaHistorial, respuestaActivos, respuestaManuales] = await Promise.all([
    supabase
      .from('historial_modulos')
      .select('*')
      .eq('serie', serie)
      .order('fecha_prueba_electrica', { ascending: false, nullsFirst: false })
      .order('fecha_salida', { ascending: false })
      .limit(5),
    supabase
      .from('modulos')
      .select('*')
      .eq('serie', serie),
    supabase
      .from('protocolos_manuales')
      .select('*')
      .eq('serie', serie)
      .order('fecha_prueba_electrica', { ascending: false, nullsFirst: false })
      .limit(5),
  ])

  const errorBusqueda = respuestaHistorial.error || respuestaActivos.error || (
    respuestaManuales.error?.message?.includes('protocolos_manuales') ? null : respuestaManuales.error
  )

  if (errorBusqueda) {
    alert(errorBusqueda.message)
    return
  }

  const activos = (respuestaActivos.data || []).map((modulo) => ({
    ...modulo,
    esActual: true,
  }))

  const manuales = (respuestaManuales.error?.message?.includes('protocolos_manuales') ? [] : respuestaManuales.data || []).map((protocolo) => ({
    ...protocolo,
    origen: 'manual',
  }))

  setResultadoBusqueda([...activos, ...(respuestaHistorial.data || []), ...manuales])
  setBusquedaRealizada(true)
}

function exportarHistorialExcelHandler() {
  exportarHistorialExcel(historial, fechaDesde, fechaHasta)
}

async function crearModulo() {
  if (creandoModulo) return

  if (!puedeAgregarModulos) {
    mostrarNotificacion('No tienes permisos para agregar módulos')
    setMostrarNuevoModulo(false)
    return
  }

  if (
    !serieNueva.trim() ||
    !tipoNuevo.trim() ||
    !proyectoNuevo.trim()
  ) {
    alert('Debe completar serie, tipo y proyecto')
    return
  }

  setCreandoModulo(true)

  let lineaIngreso = posicionSeleccionada.linea
  let posicionIngreso = posicionSeleccionada.posicion

  if (posicionSeleccionada.extremo) {
    try {
      posicionIngreso = await prepararLineaParaIngreso(
        posicionSeleccionada.linea,
        posicionSeleccionada.extremo
      )
    } catch (error) {
      mostrarNotificacion(error.message)
      await cargarTablero()
      setCreandoModulo(false)
      return
    }
  }

  const { data: moduloCreado, error } = await supabase
    .from('modulos')
    .insert([
      {
        serie: serieNueva,
        tipo: tipoNuevo,
        proyecto: proyectoNuevo,
        responsable: responsableNuevo.trim() || null,
        linea: lineaIngreso,
        posicion: posicionIngreso,
        estado: 'Sin iniciar',
        fecha_ingreso: new Date(),
      },
    ])
    .select('*')
    .single()

  if (error) {
    alert(error.message)
    setCreandoModulo(false)
    return
  }

  await cargarTablero()

  await registrarAccionModulo({
    tipo: 'ingreso',
    modulo: moduloCreado || { serie: serieNueva, linea: lineaIngreso },
    datosAntes: null,
    datosDespues: moduloCreado,
    descripcion: `Ingresó módulo en línea ${lineaIngreso}`,
  })

  setMostrarNuevoModulo(false)
  setCreandoModulo(false)

  alert('Módulo creado correctamente')
}

function abrirIngresoModuloEnExtremo(linea, extremo) {
  if (!puedeAgregarModulos) return
  cerrarVentanasEmergentes()

  const cantidadModulos = datos.filter((x) => Number(x.linea) === Number(linea) && x.serie).length
  if (cantidadModulos >= 9) {
    mostrarNotificacion(`La línea ${linea} ya está completa`)
    return
  }

  setPosicionSeleccionada({
    linea,
    posicion: extremo === 'inicio' ? 1 : cantidadModulos + 1,
    extremo,
  })
  setMostrarNuevoModulo(true)
}

async function prepararLineaParaIngreso(linea, extremo) {
  const { data: registros, error } = await supabase
    .from('modulos')
    .select('id, linea, posicion, serie')
    .eq('linea', linea)

  if (error) {
    throw new Error('No se pudo preparar la línea: ' + error.message)
  }

  const modulosLinea = (registros || [])
    .filter((x) => x?.serie && String(x.serie).trim() !== '')
    .sort((a, b) => Number(a.posicion) - Number(b.posicion))

  if (modulosLinea.length >= 9) {
    throw new Error(`La línea ${linea} ya está completa`)
  }

  const posicionTemporalBase = 1000 + Math.floor(Math.random() * 100000)
  for (const [index, modulo] of modulosLinea.entries()) {
    const { error: errorTemporal } = await supabase
      .from('modulos')
      .update({ posicion: posicionTemporalBase + index })
      .eq('id', modulo.id)

    if (errorTemporal) {
      throw new Error(errorTemporal.message)
    }
  }

  for (const [index, modulo] of modulosLinea.entries()) {
    const nuevaPosicion = extremo === 'inicio' ? index + 2 : index + 1
    const { error: errorOrden } = await supabase
      .from('modulos')
      .update({ posicion: nuevaPosicion })
      .eq('id', modulo.id)

    if (errorOrden) {
      throw new Error(errorOrden.message)
    }
  }

  return extremo === 'inicio' ? 1 : modulosLinea.length + 1
}

function abrirReintegrarModulo() {
  cerrarVentanasEmergentes()
  setMostrarReintegrar(true)
  setSerieReintegrar('')
  setHistorialSeleccionadoReintegrar(null)
  setLineaReintegrar(1)
  setExtremoReintegrar('fin')
}

function seleccionarHistorialParaReintegrar(item) {
  setHistorialSeleccionadoReintegrar(item)
  setSerieReintegrar(item?.serie || '')
}

function descargarProtocolosDiarios() {
  if (!puedeDescargarProtocolosDiarios) return
  cerrarVentanasEmergentes()
  setFechaProtocolosDiarios(new Date().toISOString().slice(0, 10))
  setMostrarDescargaProtocolos(true)
}

async function cargarPreciosMateriales() {
  setCargandoPreciosMateriales(true)
  const { data, error } = await supabase
    .from('material_precios')
    .select('material, precio')
  setCargandoPreciosMateriales(false)

  if (error) {
    mostrarNotificacion('No se pudieron cargar los precios: ' + error.message)
    const preciosPorDefecto = Object.fromEntries(catalogoPreciosProtocolo.map((item) => [item.material, item.precio]))
    setPreciosMateriales(preciosPorDefecto)
    return preciosPorDefecto
  }

  const preciosGuardados = Object.fromEntries((data || []).map((item) => [
    item.material,
    item.precio ?? '',
  ]))

  const preciosCompletos = Object.fromEntries(catalogoPreciosProtocolo.map((item) => [
    item.material,
    preciosGuardados[item.material] ?? item.precio,
  ]))
  setPreciosMateriales(preciosCompletos)
  return preciosCompletos
}

async function abrirPreciosMateriales() {
  if (!puedeVerPreciosMateriales) return
  cerrarVentanasEmergentes()
  setMostrarMenuAcciones(false)
  setMostrarPreciosMateriales(true)
  await cargarPreciosMateriales()
}

function claveItemCobro(tipo, item = {}) {
  return [
    tipo || '',
    item.material || '',
    item.materialPrecio || '',
    item.tipoCantidad || '',
  ].map((parte) => String(parte).trim()).join('|')
}

function aplicarAjustesItemsCobro(valores, ajustesItems = {}) {
  const aplicar = (tipo, items = []) => items.map((item) => {
    const clave = claveItemCobro(tipo, item)
    const ajuste = ajustesItems[clave]
    if (!ajuste || ajuste.valor === undefined || ajuste.valor === null || ajuste.valor === '') {
      return { ...item, tipoCobro: tipo, claveAjuste: clave }
    }

    return {
      ...item,
      tipoCobro: tipo,
      claveAjuste: clave,
      subtotalOriginal: item.subtotal,
      subtotal: normalizarPrecioMaterial(ajuste.valor),
      ajusteValorizacionItem: ajuste,
    }
  })

  const detalleMantencion = aplicar('mantencion', valores.detalleMantencion)
  const detalleModificacion = aplicar('modificacion', valores.detalleModificacion)

  return {
    mantencion: detalleMantencion.reduce((total, item) => total + Number(item.subtotal || 0), 0),
    modificacion: detalleModificacion.reduce((total, item) => total + Number(item.subtotal || 0), 0),
    detalleMantencion,
    detalleModificacion,
  }
}

function calcularValoresProtocoloMensual(registro, precios = preciosMateriales) {
  if (false && esEstadoGarantia(registro?.estado || registro?.protocolo_entrega?.estado)) {
    return {
      mantencion: 0,
      modificacion: 0,
      detalleMantencion: [{ material: 'Módulo en garantía', cantidad: 1, precioUnitario: 0, subtotal: 0 }],
      detalleModificacion: [],
    }
  }

  const detalleMateriales = registro?.protocolo_entrega?.detalleMateriales || {}
  const preciosBase = Object.fromEntries(catalogoPreciosProtocolo.map((item) => [
    item.material,
    normalizarPrecioMaterial(precios[item.material] ?? item.precio),
  ]))
  const preciosBaseNormalizados = Object.fromEntries(catalogoPreciosProtocolo.map((item) => [
    normalizarTextoComparacion(item.material),
    normalizarPrecioMaterial(precios[item.material] ?? item.precio),
  ]))
  Object.entries(precios || {}).forEach(([material, precio]) => {
    preciosBaseNormalizados[normalizarTextoComparacion(material)] = normalizarPrecioMaterial(precio)
  })

  const valores = camposMateriales.reduce((totales, [itemProtocolo]) => {
    const detalle = detalleMateriales[itemProtocolo] || {}
    const materialPrecio = obtenerMaterialPrecioParaProtocolo(itemProtocolo)
    const precioUnitario = preciosBase[materialPrecio] ?? preciosBaseNormalizados[normalizarTextoComparacion(materialPrecio)] ?? 0
    const cobroMantencion = calcularCobroCantidadProtocolo(detalle.mantencion, precioUnitario)
    const cobroModificacion = calcularCobroCantidadProtocolo(detalle.modificacion, precioUnitario)
    const detalleMantencionItem = [
      cobroMantencion.subtotalNuevo > 0 ? { material: itemProtocolo, materialPrecio, cantidad: cobroMantencion.nuevo, precioUnitario: cobroMantencion.precioNuevo, subtotal: cobroMantencion.subtotalNuevo, tipoCantidad: 'Nuevo' } : null,
      cobroMantencion.subtotalReutilizado > 0 ? { material: `${itemProtocolo} reutilizado`, materialPrecio, cantidad: cobroMantencion.reutilizado, precioUnitario: cobroMantencion.precioReutilizado, subtotal: cobroMantencion.subtotalReutilizado, tipoCantidad: 'Reutilizado 50%' } : null,
    ].filter(Boolean)
    const detalleModificacionItem = [
      cobroModificacion.subtotalNuevo > 0 ? { material: itemProtocolo, materialPrecio, cantidad: cobroModificacion.nuevo, precioUnitario: cobroModificacion.precioNuevo, subtotal: cobroModificacion.subtotalNuevo, tipoCantidad: 'Nuevo' } : null,
      cobroModificacion.subtotalReutilizado > 0 ? { material: `${itemProtocolo} reutilizado`, materialPrecio, cantidad: cobroModificacion.reutilizado, precioUnitario: cobroModificacion.precioReutilizado, subtotal: cobroModificacion.subtotalReutilizado, tipoCantidad: 'Reutilizado 50%' } : null,
    ].filter(Boolean)

    return {
      mantencion: totales.mantencion + cobroMantencion.subtotal,
      modificacion: totales.modificacion + cobroModificacion.subtotal,
      detalleMantencion: detalleMantencionItem.length > 0
        ? [...totales.detalleMantencion, ...detalleMantencionItem]
        : totales.detalleMantencion,
      detalleModificacion: detalleModificacionItem.length > 0
        ? [...totales.detalleModificacion, ...detalleModificacionItem]
        : totales.detalleModificacion,
    }
  }, {
    mantencion: valorBaseManoObraMantencion,
    modificacion: 0,
    detalleMantencion: [{ material: 'Mano de obra base', cantidad: 1, precioUnitario: valorBaseManoObraMantencion, subtotal: valorBaseManoObraMantencion }],
    detalleModificacion: [],
  })

  const subtotalMaterialesMantencion = valores.detalleMantencion
    .filter((item) => item.material !== 'Mano de obra base')
    .reduce((total, item) => total + Number(item.subtotal || 0), 0)
  const subtotalMaterialesModificacion = valores.detalleModificacion
    .reduce((total, item) => total + Number(item.subtotal || 0), 0)
  const tieneCobroMaterial = (subtotalMaterialesMantencion + subtotalMaterialesModificacion) > 0

  let valoresFinales = valores

  if (esEstadoGarantia(registro?.estado || registro?.protocolo_entrega?.estado) && !tieneCobroMaterial) {
    valoresFinales = {
      mantencion: 0,
      modificacion: 0,
      detalleMantencion: [{ material: 'Módulo en garantía sin cobro de material', cantidad: 1, precioUnitario: 0, subtotal: 0 }],
      detalleModificacion: [],
    }
  }

  return aplicarAjustesItemsCobro(valoresFinales, registro?.protocolo_entrega?.ajustes_valorizacion_items || {})
}

function prepararRegistroProtocoloMensual(registro, origen, precios = preciosMateriales) {
  const valores = calcularValoresProtocoloMensual(registro, precios)
  const datosProtocolo = registro?.protocolo_entrega || {}
  const fechaProtocolo = fechaDocumentoProtocolo(registro)
  const ajusteValorizacion = datosProtocolo.ajuste_valorizacion || {}
  const ajustesItems = datosProtocolo.ajustes_valorizacion_items || {}
  const tieneAjustesItems = Object.keys(ajustesItems).length > 0
  const tieneAjusteMantencion = !tieneAjustesItems && ajusteValorizacion.mantencion !== undefined && ajusteValorizacion.mantencion !== null && ajusteValorizacion.mantencion !== ''
  const tieneAjusteModificacion = !tieneAjustesItems && ajusteValorizacion.modificacion !== undefined && ajusteValorizacion.modificacion !== null && ajusteValorizacion.modificacion !== ''
  const valorMantencion = tieneAjusteMantencion ? normalizarPrecioMaterial(ajusteValorizacion.mantencion) : valores.mantencion
  const valorModificacion = tieneAjusteModificacion ? normalizarPrecioMaterial(ajusteValorizacion.modificacion) : valores.modificacion
  return {
    ...registro,
    tipo: datosProtocolo.tipo || registro?.tipo || '',
    proyecto: datosProtocolo.proyecto || registro?.proyecto || '',
    linea: datosProtocolo.linea || registro?.linea || '',
    fecha_prueba_electrica: fechaProtocolo,
    origen,
    esActual: origen === 'actual',
    valorMantencion,
    valorModificacion,
    valorTotal: valorMantencion + valorModificacion,
    ajusteValorizacion,
    ajustesValorizacionItems: ajustesItems,
    tieneAjusteValorizacion: Boolean(ajusteValorizacion.motivo) || tieneAjustesItems,
    detalleCobro: {
      mantencion: valores.detalleMantencion,
      modificacion: valores.detalleModificacion,
    },
    idOt: registro?.id_ot || datosProtocolo.id_ot || datosProtocolo.idOt || '',
  }
}

function abrirDetalleCobro(registro, tipo) {
  const detalleMantencion = registro.detalleCobro?.mantencion || []
  const detalleModificacion = registro.detalleCobro?.modificacion || []
  const lineas = tipo === 'mantencion'
    ? detalleMantencion
    : tipo === 'modificacion'
      ? detalleModificacion
      : [...detalleMantencion, ...detalleModificacion]
  const total = lineas.reduce((suma, item) => suma + Number(item.subtotal || 0), 0)

  setDetalleCobroSeleccionado({
    registro,
    tipo,
    serie: registro.serie,
    lineas,
    total,
  })
  setAjusteCobroMensual({
    itemKey: '',
    itemLabel: '',
    tipoCobro: '',
    valor: '',
    motivo: '',
  })
}

function BotonValorCobro({ registro, tipo, children, destacado = false }) {
  return (
    <button
      type="button"
      onClick={() => abrirDetalleCobro(registro, tipo)}
      style={{
        width: '100%',
        padding: '4px 6px',
        border: 'none',
        background: 'transparent',
        color: 'white',
        cursor: 'pointer',
        textAlign: 'right',
        fontWeight: destacado ? 800 : 600,
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
      }}
      title="Ver detalle del cobro"
    >
      {children}
    </button>
  )
}

async function guardarAjusteValorizacionProtocolo() {
  const registro = detalleCobroSeleccionado?.registro
  if (!puedeAjustarValoresProtocolos || !registro?.id) return

  if (!ajusteCobroMensual.itemKey) {
    mostrarNotificacion('Debe seleccionar un item para modificar')
    return
  }

  const motivo = ajusteCobroMensual.motivo.trim()
  if (!motivo) {
    mostrarNotificacion('Debe ingresar el motivo de la modificación')
    return
  }

  const tablaDestino = registro.origen === 'manual'
    ? 'protocolos_manuales'
    : registro.origen === 'historial'
      ? 'historial_modulos'
      : 'modulos'

  const { data: registroActual, error: errorCarga } = await supabase
    .from(tablaDestino)
    .select('id, protocolo_entrega, materiales')
    .eq('id', registro.id)
    .maybeSingle()

  if (errorCarga) {
    mostrarNotificacion('No se pudo cargar el protocolo para ajustar valores: ' + errorCarga.message)
    return
  }

  if (!registroActual) {
    mostrarNotificacion('No se encontró el protocolo para ajustar valores')
    return
  }

  const ajustesItemsActuales = registroActual.protocolo_entrega?.ajustes_valorizacion_items || {}
  const protocoloActualizado = {
    ...(registroActual.protocolo_entrega || {}),
    ajustes_valorizacion_items: {
      ...ajustesItemsActuales,
      [ajusteCobroMensual.itemKey]: {
        valor: normalizarPrecioMaterial(ajusteCobroMensual.valor),
        motivo,
        item: ajusteCobroMensual.itemLabel,
        tipo: ajusteCobroMensual.tipoCobro,
        usuario: perfil?.nombre || perfil?.email || perfil?.rol || '',
        fecha: new Date().toISOString(),
      },
    },
  }
  delete protocoloActualizado.ajuste_valorizacion

  const { data: registroGuardado, error } = await supabase
    .from(tablaDestino)
    .update({ protocolo_entrega: protocoloActualizado })
    .eq('id', registro.id)
    .select('*')
    .maybeSingle()

  if (error) {
    mostrarNotificacion('No se pudo guardar el ajuste de valorización: ' + error.message)
    return
  }

  const actualizado = prepararRegistroProtocoloMensual({
    ...registro,
    ...(registroGuardado || {}),
    protocolo_entrega: protocoloActualizado,
    materiales: registroGuardado?.materiales || registro.materiales,
  }, registro.origen, preciosMateriales)

  setProtocolosMensuales((actuales) => actuales.map((item) => (
    item.origen === registro.origen && item.id === registro.id ? actualizado : item
  )))
  setDetalleCobroSeleccionado((actual) => actual ? {
    ...actual,
    registro: actualizado,
    lineas: actual.tipo === 'mantencion'
      ? actualizado.detalleCobro.mantencion
      : actual.tipo === 'modificacion'
        ? actualizado.detalleCobro.modificacion
        : [...actualizado.detalleCobro.mantencion, ...actualizado.detalleCobro.modificacion],
    total: actual.tipo === 'mantencion'
      ? actualizado.valorMantencion
      : actual.tipo === 'modificacion'
        ? actualizado.valorModificacion
        : actualizado.valorTotal,
  } : actual)
  setAjusteCobroMensual({ itemKey: '', itemLabel: '', tipoCobro: '', valor: '', motivo: '' })
  mostrarNotificacion('Ajuste de valorización guardado')
}

async function cargarProtocolosMensuales(valor = fechaProtocolosMensuales, rango = rangoProtocolosMensuales) {
  if (!puedeVerProtocolosMensuales || !valor) return

  setCargandoProtocolosMensuales(true)
  const preciosParaCalculo = Object.keys(preciosMateriales).length === 0
    ? await cargarPreciosMateriales()
    : preciosMateriales

  const { inicio, fin: finTexto } = obtenerRangoFechasProtocolos(rango, valor)

  async function cargarTablaProtocolos(tabla, columnasConIdOt, columnasSinIdOt) {
    const quitarColumnaEstado = (columnas) => columnas
      .split(',')
      .map((columna) => columna.trim())
      .filter((columna) => columna !== 'estado')
      .join(', ')

    const traerPorRango = async (columnas) => supabase
      .from(tabla)
      .select(columnas)
      .gte('fecha_prueba_electrica', inicio)
      .lt('fecha_prueba_electrica', finTexto)

    const traerRecientes = async (columnas) => supabase
      .from(tabla)
      .select(columnas)
      .order('fecha_prueba_electrica', { ascending: false, nullsFirst: false })
      .limit(250)

    let respuesta = await traerPorRango(columnasConIdOt)

    if (respuesta.error?.message?.includes('id_ot')) {
      respuesta = await traerPorRango(columnasSinIdOt)
    }

    if (respuesta.error?.message?.includes('estado')) {
      respuesta = await traerPorRango(quitarColumnaEstado(columnasSinIdOt))
    }

    if (respuesta.error) return respuesta

    let recientes = await traerRecientes(columnasConIdOt)
    if (recientes.error?.message?.includes('id_ot')) {
      recientes = await traerRecientes(columnasSinIdOt)
    }
    if (recientes.error?.message?.includes('estado')) {
      recientes = await traerRecientes(quitarColumnaEstado(columnasSinIdOt))
    }

    const porId = new Map()
    ;[...(respuesta.data || []), ...(!recientes.error ? recientes.data || [] : [])].forEach((item) => {
      const fechaRegistro = fechaDocumentoProtocolo(item)
      if (!fechaDentroDeRangoProtocolo(fechaRegistro, inicio, finTexto)) return
      porId.set(String(item.id), item)
    })

    return {
      ...respuesta,
      data: [...porId.values()],
    }
  }

  const [respuestaActivos, respuestaHistorial, respuestaManuales] = await Promise.all([
    cargarTablaProtocolos(
      'modulos',
      'id, id_ot, serie, tipo, proyecto, responsable, estado, fecha_prueba_electrica, protocolo_entrega, materiales',
      'id, serie, tipo, proyecto, responsable, estado, fecha_prueba_electrica, protocolo_entrega, materiales',
    ),
    cargarTablaProtocolos(
      'historial_modulos',
      'id, modulo_id, id_ot, serie, tipo, proyecto, responsable, estado, fecha_prueba_electrica, fecha_salida, protocolo_entrega, materiales',
      'id, modulo_id, serie, tipo, proyecto, responsable, estado, fecha_prueba_electrica, fecha_salida, protocolo_entrega, materiales',
    ),
    cargarTablaProtocolos(
      'protocolos_manuales',
      'id, id_ot, serie, tipo, proyecto, responsable, estado, fecha_prueba_electrica, protocolo_entrega, materiales',
      'id, serie, tipo, proyecto, responsable, estado, fecha_prueba_electrica, protocolo_entrega, materiales',
    ),
  ])

  setCargandoProtocolosMensuales(false)

  const tablaManualNoExiste = respuestaManuales.error?.message?.includes('protocolos_manuales')
  const error = respuestaActivos.error || respuestaHistorial.error || (tablaManualNoExiste ? null : respuestaManuales.error)
  if (error) {
    mostrarNotificacion('No se pudieron cargar los protocolos mensuales: ' + error.message)
    return
  }

  const preciosActuales = Object.keys(preciosParaCalculo || {}).length > 0
    ? preciosParaCalculo
    : Object.fromEntries(catalogoPreciosProtocolo.map((item) => [item.material, item.precio]))

  const registros = [
    ...(respuestaActivos.data || []).map((item) => prepararRegistroProtocoloMensual(item, 'actual', preciosActuales)),
    ...(respuestaHistorial.data || []).map((item) => prepararRegistroProtocoloMensual(item, 'historial', preciosActuales)),
    ...((tablaManualNoExiste ? [] : respuestaManuales.data) || []).map((item) => prepararRegistroProtocoloMensual(item, 'manual', preciosActuales)),
  ].sort((a, b) => new Date(b.fecha_prueba_electrica || 0) - new Date(a.fecha_prueba_electrica || 0))

  setProtocolosMensuales(registros)
}

async function abrirProtocolosMensuales() {
  if (!puedeVerProtocolosMensuales) return
  cerrarVentanasEmergentes()
  setMostrarMenuAcciones(false)
  setMostrarProtocolosMensuales(true)
  await cargarProtocolosMensuales()
}

function fechaInicialProtocoloManual() {
  const hoy = new Date().toISOString().slice(0, 10)
  if (!fechaProtocolosMensuales) return hoy
  if (rangoProtocolosMensuales === 'dia') return fechaProtocolosMensuales
  const { inicio, fin } = obtenerRangoFechasProtocolos(rangoProtocolosMensuales, fechaProtocolosMensuales)
  const inicioFecha = inicio.slice(0, 10)
  const finFecha = fin.slice(0, 10)
  return hoy >= inicioFecha && hoy < finFecha ? hoy : inicioFecha
}

function abrirIngresoManualProtocolo() {
  if (!puedeVerProtocolosMensuales) return

  const fecha = fechaInicialProtocoloManual()
  const moduloManual = {
    id: `manual-nuevo-${Date.now()}`,
    origen: 'manual',
    serie: '',
    tipo: '',
    proyecto: '',
    responsable: perfil?.nombre || '',
    linea: '',
    materiales: {},
    protocolo_entrega: {
      fecha,
      responsable: perfil?.nombre || '',
      serie: '',
      tipo: '',
      proyecto: '',
      linea: '',
      detalleMateriales: {},
      materiales: {},
    },
  }

  setModuloSeleccionado(moduloManual)
  setFormulariosElectricos((actuales) => ({
    ...actuales,
    [moduloManual.id]: {},
  }))
  setDatosProtocoloEntrega(moduloManual.protocolo_entrega)
  setResponsableProtocolo(perfil?.nombre || '')
  setProtocoloSoloLecturaBusqueda(false)
  setProtocoloDesdeHistorial(false)
  setProtocoloManualMensual(true)
  setMostrarProtocoloEntrega(true)
}

async function guardarIdOtProtocoloMensual(registro, valor) {
  if (!puedeVerProtocolosMensuales || !registro?.id) return

  const valorIdOt = String(valor ?? '').trim()

  const tablaDestino = registro.origen === 'manual'
    ? 'protocolos_manuales'
    : registro.origen === 'historial'
      ? 'historial_modulos'
      : 'modulos'

  const columnasIdOt = registro.origen === 'historial'
    ? 'id, modulo_id, id_ot, protocolo_entrega, materiales'
    : 'id, id_ot, protocolo_entrega, materiales'

  let { data: registroActual, error: errorCarga } = await supabase
    .from(tablaDestino)
    .select(columnasIdOt)
    .eq('id', registro.id)
    .maybeSingle()

  if (!errorCarga && !registroActual && registro.origen === 'historial' && registro.modulo_id) {
    registroActual = null
  }

  if (errorCarga?.message?.includes('id_ot')) {
    const columnasCompatibles = registro.origen === 'historial'
      ? 'id, modulo_id, protocolo_entrega, materiales'
      : 'id, protocolo_entrega, materiales'

    ;({ data: registroActual, error: errorCarga } = await supabase
      .from(tablaDestino)
      .select(columnasCompatibles)
      .eq('id', registro.id)
      .maybeSingle())

    if (!errorCarga && !registroActual && registro.origen === 'historial' && registro.modulo_id) {
      registroActual = null
    }
  }

  if (errorCarga) {
    mostrarNotificacion('No se pudo cargar el protocolo para guardar ID OT: ' + errorCarga.message)
    return
  }

  if (!registroActual) {
    mostrarNotificacion('No se encontró el protocolo para guardar ID OT')
    return
  }

  const protocoloActualizado = {
    ...(registroActual.protocolo_entrega || {}),
    id_ot: valorIdOt,
    idOt: valorIdOt,
  }

  const payloadIdOt = {
    id_ot: valorIdOt,
    protocolo_entrega: protocoloActualizado,
  }

  let { data: registroGuardado, error } = await supabase
    .from(tablaDestino)
    .update(payloadIdOt)
    .eq('id', registroActual.id)
    .select(columnasIdOt)
    .maybeSingle()

  if (error?.message?.includes('id_ot')) {
    const columnasCompatibles = registro.origen === 'historial'
      ? 'id, modulo_id, protocolo_entrega, materiales'
      : 'id, protocolo_entrega, materiales'

    ;({ data: registroGuardado, error } = await supabase
      .from(tablaDestino)
      .update({ protocolo_entrega: protocoloActualizado })
      .eq('id', registroActual.id)
      .select(columnasCompatibles)
      .maybeSingle())
  }

  if (error) {
    mostrarNotificacion('No se pudo guardar el ID OT: ' + error.message)
    return
  }

  if (!registroGuardado) {
    mostrarNotificacion(`No se pudo confirmar el guardado del ID OT en ${tablaDestino}. Revisa permisos/RLS de Supabase para actualizar esa tabla.`)
    return
  }

  const idOtConfirmado = String(registroGuardado.id_ot ?? registroGuardado.protocolo_entrega?.id_ot ?? registroGuardado.protocolo_entrega?.idOt ?? '').trim()

  if (idOtConfirmado !== valorIdOt) {
    mostrarNotificacion(`Supabase no confirmó el ID OT en ${tablaDestino}. Valor recibido: ${idOtConfirmado || 'vacío'}`)
    return
  }

  const registroConfirmado = {
    ...registroActual,
    ...registroGuardado,
    id_ot: valorIdOt,
    protocolo_entrega: registroGuardado.protocolo_entrega || protocoloActualizado,
  }

  setProtocolosMensuales((actuales) => actuales.map((item) => (
    item.origen === registro.origen && (
      item.id === registro.id ||
      item.id === registroConfirmado.id
    )
      ? { ...item, ...registroConfirmado, id_ot: valorIdOt, idOt: valorIdOt, protocolo_entrega: registroConfirmado.protocolo_entrega || protocoloActualizado }
      : item
  )))
  setIdOtEnEdicion(null)
  setIdsOtEnEdicion(['', '', ''])
  mostrarNotificacion('ID OT guardado')
}

async function buscarProtocoloDuplicado({ serie, fecha, origenActual = '', idActual = '' }) {
  const serieNormalizada = String(serie || '').trim()
  const fechaNormalizada = fechaParaInput(fecha)
  if (!serieNormalizada || !fechaNormalizada) return null

  const inicio = `${fechaNormalizada}T00:00:00`
  const fin = new Date(`${fechaNormalizada}T00:00:00`)
  fin.setDate(fin.getDate() + 1)
  const finTexto = fin.toISOString().slice(0, 19)

  const consultas = [
    {
      origen: 'actual',
      respuesta: supabase
        .from('modulos')
        .select('id, serie, fecha_prueba_electrica')
        .ilike('serie', serieNormalizada)
        .gte('fecha_prueba_electrica', inicio)
        .lt('fecha_prueba_electrica', finTexto),
    },
    {
      origen: 'historial',
      respuesta: supabase
        .from('historial_modulos')
        .select('id, serie, fecha_prueba_electrica')
        .ilike('serie', serieNormalizada)
        .gte('fecha_prueba_electrica', inicio)
        .lt('fecha_prueba_electrica', finTexto),
    },
    {
      origen: 'manual',
      respuesta: supabase
        .from('protocolos_manuales')
        .select('id, serie, fecha_prueba_electrica')
        .ilike('serie', serieNormalizada)
        .gte('fecha_prueba_electrica', inicio)
        .lt('fecha_prueba_electrica', finTexto),
    },
  ]

  const respuestas = await Promise.all(consultas.map((consulta) => consulta.respuesta))

  for (let indice = 0; indice < respuestas.length; indice += 1) {
    const respuesta = respuestas[indice]
    if (respuesta.error) {
      if (respuesta.error.message?.includes('protocolos_manuales')) continue
      throw respuesta.error
    }

    const origen = consultas[indice].origen
    const duplicado = (respuesta.data || []).find((item) => !(
      origen === origenActual && String(item.id) === String(idActual)
    ))

    if (duplicado) return { ...duplicado, origen }
  }

  return null
}

async function eliminarProtocoloMensual(registro) {
  if (!puedeEliminarProtocolosMensuales || !registro?.id) return

  if (registro.origen === 'actual') {
    const confirmadoActual = window.confirm(
      `¿Eliminar el protocolo de la serie ${registro.serie || ''} con fecha ${formatearFecha(registro.fecha_prueba_electrica) || ''}? El módulo seguirá activo en el tablero.`
    )

    if (!confirmadoActual) return

    const { error } = await supabase
      .from('modulos')
      .update({
        fecha_prueba_electrica: null,
        id_ot: null,
        protocolo_entrega: {},
      })
      .eq('id', registro.id)

    if (error) {
      mostrarNotificacion('No se pudo eliminar el protocolo: ' + error.message)
      return
    }

    setProtocolosMensuales((actuales) => actuales.filter((item) => !(
      item.origen === registro.origen && item.id === registro.id
    )))
    mostrarNotificacion('Protocolo eliminado. El módulo sigue activo.')
    return
  }

  const confirmado = window.confirm(
    `¿Eliminar el protocolo de la serie ${registro.serie || ''} con fecha ${formatearFecha(registro.fecha_prueba_electrica) || ''}?`
  )

  if (!confirmado) return

  const tablaDestino = registro.origen === 'manual'
    ? 'protocolos_manuales'
    : registro.origen === 'historial'
      ? 'historial_modulos'
      : ''

  if (!tablaDestino) return

  const { error } = await supabase
    .from(tablaDestino)
    .delete()
    .eq('id', registro.id)

  if (error) {
    mostrarNotificacion('No se pudo eliminar el protocolo: ' + error.message)
    return
  }

  setProtocolosMensuales((actuales) => actuales.filter((item) => !(
    item.origen === registro.origen && item.id === registro.id
  )))
  mostrarNotificacion('Protocolo eliminado')
}

function actualizarPrecioMaterial(material, valor) {
  setPreciosMateriales((actuales) => ({
    ...actuales,
    [material]: limpiarPrecioMaterial(valor),
  }))
}

async function guardarPreciosMateriales() {
  if (!puedeEditarPreciosMateriales || guardandoPreciosMateriales) return

  setGuardandoPreciosMateriales(true)
  const filas = catalogoPreciosProtocolo.map((item) => ({
    material: item.material,
    id_art: item.idArt,
    seccion: item.seccion,
    precio: normalizarPrecioMaterial(preciosMateriales[item.material]),
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('material_precios')
    .upsert(filas, { onConflict: 'material' })

  setGuardandoPreciosMateriales(false)

  if (error) {
    mostrarNotificacion('No se pudieron guardar los precios: ' + error.message)
    return
  }

  setPrecioMaterialEnEdicion(null)
  mostrarNotificacion('Precios de materiales guardados correctamente')
}

async function generarDescargaProtocolosDiarios() {
  if (!puedeDescargarProtocolosDiarios || !fechaProtocolosDiarios || descargandoProtocolos) return

  setDescargandoProtocolos(true)
  try {
    const inicio = `${fechaProtocolosDiarios}T00:00:00`
    const fin = new Date(`${fechaProtocolosDiarios}T00:00:00`)
    fin.setDate(fin.getDate() + 1)
    const finTexto = fin.toISOString().slice(0, 19)

    const [respuestaActivos, respuestaHistorial] = await Promise.all([
      supabase
        .from('modulos')
        .select('*')
        .gte('fecha_prueba_electrica', inicio)
        .lt('fecha_prueba_electrica', finTexto),
      supabase
        .from('historial_modulos')
        .select('*')
        .gte('fecha_prueba_electrica', inicio)
        .lt('fecha_prueba_electrica', finTexto),
    ])

    const error = respuestaActivos.error || respuestaHistorial.error
    if (error) {
      mostrarNotificacion('No se pudieron cargar los protocolos: ' + error.message)
      return
    }

    const registros = [...(respuestaActivos.data || []), ...(respuestaHistorial.data || [])]
      .sort((a, b) => String(a.serie || '').localeCompare(String(b.serie || '')))

    if (registros.length === 0) {
      mostrarNotificacion('No hay protocolos con fecha de prueba eléctrica para ese día')
      return
    }

    await descargarProtocolosDiariosPdf(registros, fechaProtocolosDiarios)
    setMostrarDescargaProtocolos(false)
    mostrarNotificacion(`Se descargaron ${registros.length} protocolo(s)`)
  } finally {
    setDescargandoProtocolos(false)
  }
}

async function reintegrarModuloFinalizado() {
  if (!puedeAgregarModulos || reintegrandoModulo) return

  setReintegrandoModulo(true)
  try {
    let moduloHistorial = historialSeleccionadoReintegrar

    if (!moduloHistorial) {
      const serie = serieReintegrar.trim()
      if (!serie) {
        mostrarNotificacion('Debe seleccionar o ingresar una serie')
        return
      }

      const { data, error } = await supabase
        .from('historial_modulos')
        .select('*')
        .eq('serie', serie)
        .order('fecha_salida', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        mostrarNotificacion('No se pudo buscar el módulo: ' + error.message)
        return
      }

      moduloHistorial = data
    }

    if (!moduloHistorial) {
      mostrarNotificacion('No se encontró un módulo finalizado con esa serie')
      return
    }

    const { data: activoExistente, error: errorActivo } = await supabase
      .from('modulos')
      .select('id')
      .eq('serie', moduloHistorial.serie)
      .maybeSingle()

    if (errorActivo) {
      mostrarNotificacion('No se pudo verificar el módulo activo: ' + errorActivo.message)
      return
    }

    if (activoExistente) {
      mostrarNotificacion('Ese módulo ya se encuentra activo en una línea')
      return
    }

    const posicionDestino = await prepararLineaParaIngreso(lineaReintegrar, extremoReintegrar)
    const { error: errorInsert } = await supabase
      .from('modulos')
      .insert([
        {
          serie: moduloHistorial.serie,
          tipo: moduloHistorial.tipo,
          proyecto: moduloHistorial.proyecto,
          responsable: moduloHistorial.responsable,
          fecha_ingreso: moduloHistorial.fecha_ingreso,
          fecha_prueba_electrica: moduloHistorial.fecha_prueba_electrica,
          protocolo_entrega: moduloHistorial.protocolo_entrega || {},
          nota: moduloHistorial.nota || '',
          observacion_alerta: moduloHistorial.observacion_alerta || '',
          estado: moduloHistorial.estado || 'Sin iniciar',
          linea: lineaReintegrar,
          posicion: posicionDestino,
        },
      ])

    if (errorInsert) {
      mostrarNotificacion('No se pudo reintegrar el módulo: ' + errorInsert.message)
      await cargarTablero()
      return
    }

    const { error: errorDelete } = await supabase
      .from('historial_modulos')
      .delete()
      .eq('id', moduloHistorial.id)

    if (errorDelete) {
      mostrarNotificacion('Módulo reintegrado, pero no se pudo retirar del historial: ' + errorDelete.message)
    } else {
      mostrarNotificacion('Módulo reintegrado correctamente')
    }

    setMostrarReintegrar(false)
    setHistorialSeleccionadoReintegrar(null)
    setSerieReintegrar('')
    await cargarTablero()
    await cargarHistorial()
  } finally {
    setReintegrandoModulo(false)
  }
}

function limpiarEstadosModal() {
  cerrarPanelesFlotantes()
  setMostrarResumenMateriales(false)
  setMostrarEditorMateriales(false)
  setProtocoloSoloLecturaBusqueda(false)
  setProtocoloDesdeHistorial(false)
  setProtocoloManualMensual(false)
  setModuloSeleccionado(null)
  setSerieEditada('')
  setTipoEditado('')
  setProyectoEditado('')
  setResponsableEditado('')
  setEstadoEditado('')
  setLineaEditada('')
  setPosicionEditada('')
  setFechaPruebaEditada('')
  setNotaEditada('')
}

  async function guardarCambios() {
  const isPruebaElectrica = estadoEditado === 'Prueba eléctrica'
  const isEnGarantia = estadoEditado === 'En garantía'
  const shouldSetFechaPrueba =
    isPruebaElectrica && moduloSeleccionado?.estado !== 'Prueba eléctrica'

  if (isEnGarantia && !fechaPruebaEditada) {
    mostrarNotificacion('Debe ingresar la fecha de la prueba eléctrica')
    return
  }

  const puedeEditarDatosModulo = puedeEditarDatosProtocolo

  const updatePayload = !puedeEditarDatosModulo
    ? {
        nota: notaEditada,
        ...(perfil?.rol === 'electrico'
          ? { materiales: formulariosElectricos[moduloSeleccionado?.id] || {} }
          : {}),
      }
    : {
        serie: serieEditada,
        tipo: tipoEditado,
        proyecto: proyectoEditado,
        responsable: responsableEditado,
        estado: estadoEditado,
        linea: lineaEditada,
        posicion: posicionEditada,
        nota: notaEditada,
      }

  let moduloAntesCambio = null

  if (puedeEditarDatosModulo) {
    const { data: moduloActual, error: errorCargaModulo } = await supabase
      .from('modulos')
      .select('*')
      .eq('id', moduloSeleccionado.id)
      .single()

    if (errorCargaModulo) {
      mostrarNotificacion('No se pudo cargar el protocolo actual: ' + errorCargaModulo.message)
      return
    }

    moduloAntesCambio = moduloActual

    updatePayload.protocolo_entrega = sincronizarDatosModuloEnProtocolo(
      moduloActual?.protocolo_entrega || {},
      {
        serie: serieEditada,
        tipo: tipoEditado,
        proyecto: proyectoEditado,
        responsable: responsableEditado,
        estado: estadoEditado,
        linea: lineaEditada,
      }
    )
  }

  console.log('GUARDANDO CAMBIOS:', {
    moduloId: moduloSeleccionado?.id,
    notaEditada,
    moduloSeleccionado,
  })

console.log({
  estadoOriginal: moduloSeleccionado.estado,
  estadoNuevo: estadoEditado,
  shouldSetFechaPrueba
})
  if (shouldSetFechaPrueba) {
    console.log("Guardando fecha de prueba eléctrica")

    const { data: moduloActual, error: errorCargaModulo } = await supabase
      .from('modulos')
      .select('*')
      .eq('id', moduloSeleccionado.id)
      .single()

    if (errorCargaModulo) {
      mostrarNotificacion('No se pudo cargar el mÃ³dulo para guardar la prueba: ' + errorCargaModulo.message)
      return
    }

    const fechaPruebaInput = formatearFechaInput(new Date())
    const moduloBase = {
      ...moduloSeleccionado,
      ...(moduloAntesCambio || {}),
    }
    const moduloParaProtocolo = {
      ...moduloBase,
      serie: serieEditada,
      tipo: tipoEditado,
      proyecto: proyectoEditado,
      responsable: responsableEditado,
      linea: lineaEditada,
    }

    updatePayload.fecha_prueba_electrica = `${fechaPruebaInput}T00:00:00`
    updatePayload.protocolo_entrega = completarDatosPruebaEnProtocolo(
      moduloBase?.protocolo_entrega || {},
      moduloParaProtocolo,
      updatePayload.fecha_prueba_electrica,
      responsableEditado || perfil?.nombre || ''
    )
  }

  if (isEnGarantia) {
    updatePayload.fecha_prueba_electrica = new Date(`${fechaPruebaEditada}T12:00:00`).toISOString()
    updatePayload.protocolo_entrega = agregarNotaGarantiaProtocolo(
      updatePayload.protocolo_entrega || moduloSeleccionado?.protocolo_entrega || {},
      updatePayload.fecha_prueba_electrica
    )
  }

  let { error } = await supabase
    .from('modulos')
    .update(updatePayload)
    .eq('id', moduloSeleccionado.id)

  console.log('RESULTADO UPDATE - NOTA:', notaEditada)
  console.log('RESULTADO UPDATE - PAYLOAD:')
  console.log('  serie:', updatePayload.serie)
  console.log('  tipo:', updatePayload.tipo)
  console.log('  proyecto:', updatePayload.proyecto)
  console.log('  estado:', updatePayload.estado)
  console.log('  linea:', updatePayload.linea)
  console.log('  posicion:', updatePayload.posicion)
  console.log('  nota:', updatePayload.nota)
  console.log('  error:', error)

  if (error) {
    mostrarNotificacion(error.message)
    return
  }

  await cargarTablero()

  limpiarEstadosModal()

  mostrarNotificacion('Cambios guardados correctamente')
}

async function solicitarPruebaElectrica() {
  const usuario = session?.user

  if (esEstadoPruebaElectrica(moduloSeleccionado?.estado)) {
    mostrarNotificacion('Este módulo ya tiene la prueba eléctrica aprobada')
    return
  }

  if (!usuario || !moduloSeleccionado?.id) {
    mostrarNotificacion('No se pudo identificar al usuario o al módulo')
    return
  }

  const { error } = await supabase
    .from('modulos')
    .update({
      solicitud_prueba: true,
      solicitado_por: usuario.id,
      fecha_solicitud: new Date().toISOString(),
      ...(perfil?.rol === 'electrico'
        ? { materiales: formulariosElectricos[moduloSeleccionado.id] || {} }
        : {}),
    })
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion(error.message)
    return
  }

  await cargarTablero()

  setModuloSeleccionado(null)

  mostrarNotificacion('Solicitud de prueba eléctrica enviada')
}

async function dejarObservacionAlerta() {
  if (!moduloSeleccionado?.id || !puedeDejarObservacionAlerta) return

  const textoActual = moduloSeleccionado.observacion_alerta || ''
  const observacion = window.prompt('Ingrese la observación del módulo:', textoActual)

  if (observacion === null) return

  const observacionLimpia = observacion.trim()

  const { error } = await supabase
    .from('modulos')
    .update({ observacion_alerta: observacionLimpia })
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion('No se pudo guardar la observación: ' + error.message)
    return
  }

  setModuloSeleccionado((actual) => actual
    ? { ...actual, observacion_alerta: observacionLimpia }
    : actual
  )
  await cargarTablero()
  setMostrarMenuModulo(false)
  mostrarNotificacion(
    observacionLimpia
      ? 'Observación guardada'
      : 'Observación eliminada'
  )
}

function mostrarObservacionAlerta(modulo) {
  if (!modulo?.observacion_alerta) return
  window.alert(modulo.observacion_alerta)
}

async function cancelarSolicitudPruebaElectrica() {
  if (!moduloSeleccionado?.id) return

  const { error } = await supabase
    .from('modulos')
    .update({ solicitud_prueba: false })
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion(error.message)
    return
  }

  if (
    puedeEditarDatosModulo &&
    moduloAntesCambio &&
    normalizarTexto(moduloAntesCambio.estado) !== normalizarTexto(estadoEditado)
  ) {
    await registrarAccionModulo({
      tipo: 'cambio_estado',
      modulo: {
        ...moduloAntesCambio,
        estado: estadoEditado,
        linea: lineaEditada,
        serie: serieEditada,
      },
      datosAntes: moduloAntesCambio,
      datosDespues: {
        ...moduloAntesCambio,
        ...updatePayload,
      },
      descripcion: `${moduloAntesCambio.estado || 'Sin estado'} → ${estadoEditado}`,
    })
  }

  await cargarTablero()
  limpiarEstadosModal()
  mostrarNotificacion('Solicitud de prueba eléctrica cancelada')
}

async function aprobarPruebaElectrica() {
  if (!moduloSeleccionado?.id) return

  const { data: moduloActual, error: errorCargaModulo } = await supabase
    .from('modulos')
    .select('*')
    .eq('id', moduloSeleccionado.id)
    .single()

  if (errorCargaModulo) {
    mostrarNotificacion('No se pudo cargar el mÃ³dulo para aprobar la prueba: ' + errorCargaModulo.message)
    return
  }

  const moduloParaAprobar = {
    ...moduloSeleccionado,
    ...(moduloActual || {}),
  }

  const fechaPruebaInput = formatearFechaInput(new Date())
  const fechaPruebaDb = `${fechaPruebaInput}T00:00:00`
  const protocoloActualizado = completarDatosPruebaEnProtocolo(
    moduloParaAprobar?.protocolo_entrega || {},
    moduloParaAprobar,
    fechaPruebaDb,
    perfil?.nombre || ''
  )

  const { error } = await supabase
    .from('modulos')
    .update({
      solicitud_prueba: false,
      estado: 'Prueba eléctrica',
      fecha_prueba_electrica: fechaPruebaDb,
      protocolo_entrega: protocoloActualizado,
    })
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion(error.message)
    return
  }

  await registrarAccionModulo({
    tipo: 'aprobacion_prueba_electrica',
    modulo: {
      ...moduloParaAprobar,
      estado: 'Prueba elÃ©ctrica',
      fecha_prueba_electrica: fechaPruebaDb,
    },
    datosAntes: moduloParaAprobar,
    datosDespues: {
      ...moduloParaAprobar,
      solicitud_prueba: false,
      estado: 'Prueba elÃ©ctrica',
      fecha_prueba_electrica: fechaPruebaDb,
      protocolo_entrega: protocoloActualizado,
    },
    descripcion: `Aprobada por ${perfil?.nombre || perfil?.rol || 'usuario'} (${perfil?.rol || 'sin rol'})`,
  })

  await cargarTablero()
  limpiarEstadosModal()
  mostrarNotificacion('Prueba eléctrica aprobada')
}

async function rechazarPruebaElectrica() {
  if (!moduloSeleccionado?.id) return

  const { data: moduloAntesRechazo, error: errorCargaModulo } = await supabase
    .from('modulos')
    .select('*')
    .eq('id', moduloSeleccionado.id)
    .single()

  if (errorCargaModulo) {
    mostrarNotificacion('No se pudo cargar el mÃ³dulo para rechazar la prueba: ' + errorCargaModulo.message)
    return
  }

  const { error } = await supabase
    .from('modulos')
    .update({ solicitud_prueba: false })
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion(error.message)
    return
  }

  await registrarAccionModulo({
    tipo: 'rechazo_prueba_electrica',
    modulo: moduloAntesRechazo,
    datosAntes: moduloAntesRechazo,
    datosDespues: {
      ...moduloAntesRechazo,
      solicitud_prueba: false,
    },
    descripcion: `Rechazada por ${perfil?.nombre || perfil?.rol || 'usuario'} (${perfil?.rol || 'sin rol'})`,
  })

  await cargarTablero()
  limpiarEstadosModal()
  mostrarNotificacion('Solicitud de prueba eléctrica rechazada')
}


async function cargarNombreSolicitante(idSolicitante, moduloId) {
  let solicitanteId = idSolicitante

  if (!solicitanteId && moduloId) {
    const { data: modulo, error: errorModulo } = await supabase
      .from('modulos')
      .select('solicitado_por')
      .eq('id', moduloId)
      .single()

    if (errorModulo) {
      console.error(errorModulo)
      setNombreSolicitante('No disponible')
      setRolSolicitante('')
      return
    }

    solicitanteId = modulo?.solicitado_por
  }

  if (!solicitanteId) {
    setNombreSolicitante('No disponible')
    setRolSolicitante('')
    return
  }

  const { data, error } = await supabase
    .from('perfiles')
    .select('nombre, rol')
    .eq('id', solicitanteId)
    .single()

  if (error) {
    console.error(error)
    setNombreSolicitante('No disponible')
    setRolSolicitante('')
    return
  }

  setNombreSolicitante(data?.nombre || 'No disponible')
  setRolSolicitante(data?.rol || '')
}

async function obtenerNombrePerfil(idPerfil) {
  if (!idPerfil) return ''

  const { data, error } = await supabase
    .from('perfiles')
    .select('nombre')
    .eq('id', idPerfil)
    .maybeSingle()

  if (error) {
    console.error(error)
    return ''
  }

  return data?.nombre || ''
}

async function cargarMaterialesModulo(moduloId) {
  if (!moduloId) return

  setCargandoMateriales(true)
  const { data, error } = await supabase
    .from('modulos')
    .select('materiales')
    .eq('id', moduloId)
    .single()
  setCargandoMateriales(false)

  if (error) {
    console.error(error)
    mostrarNotificacion('No se pudieron cargar los materiales')
    return
  }

  setFormulariosElectricos((actuales) => ({
    ...actuales,
    [moduloId]: data?.materiales || {},
  }))
  setMaterialesEditados((actuales) => ({
    ...actuales,
    [moduloId]: {},
  }))
}

async function abrirResumenMateriales() {
  if (!moduloSeleccionado?.id) return
  cerrarVentanasEmergentes({ conservarModulo: true })
  await cargarMaterialesModulo(moduloSeleccionado.id)
  setMostrarResumenMateriales(true)
}

async function abrirEditorMateriales() {
  if (!moduloSeleccionado?.id || !puedeVerMenuModulo) return
  cerrarVentanasEmergentes({ conservarModulo: true })
  await cargarMaterialesModulo(moduloSeleccionado.id)
  setMostrarMenuModulo(false)
  setMostrarEditorMateriales(true)
}

function actualizarMaterialFormulario(item, tipo, valor) {
  const moduloId = moduloSeleccionado?.id
  if (!moduloId) return

  setFormulariosElectricos((actuales) => ({
    ...actuales,
    [moduloId]: {
      ...(actuales[moduloId] || {}),
      [item]: {
        ...(
          typeof actuales[moduloId]?.[item] === 'object'
            ? actuales[moduloId][item]
            : { nuevo: actuales[moduloId]?.[item] || '', reutilizado: '' }
        ),
        [tipo]: valor,
      },
    },
  }))
  setMaterialesEditados((actuales) => ({
    ...actuales,
    [moduloId]: {
      ...(actuales[moduloId] || {}),
      [item]: {
        ...(actuales[moduloId]?.[item] || {}),
        [tipo]: true,
      },
    },
  }))
}

async function guardarMaterialesModulo() {
  if (!moduloSeleccionado?.id || !puedeVerMenuModulo) return

  const moduloId = moduloSeleccionado.id
  const materialesLocales = formulariosElectricos[moduloId] || {}
  const camposEditados = materialesEditados[moduloId] || {}

  const { data: registroActual, error: errorCarga } = await supabase
    .from('modulos')
    .select('materiales')
    .eq('id', moduloId)
    .single()

  if (errorCarga) {
    mostrarNotificacion('No se pudieron cargar los materiales actuales: ' + errorCarga.message)
    return
  }

  const materialesFusionados = { ...(registroActual?.materiales || {}) }
  Object.entries(camposEditados).forEach(([item, tiposEditados]) => {
    const valorActual = materialesFusionados[item]
    const valorLocal = materialesLocales[item]
    const baseItem = typeof valorActual === 'object' && valorActual !== null
      ? { ...valorActual }
      : { nuevo: valorActual || '', reutilizado: '' }
    const localItem = typeof valorLocal === 'object' && valorLocal !== null
      ? valorLocal
      : { nuevo: valorLocal || '', reutilizado: '' }

    Object.keys(tiposEditados || {}).forEach((tipo) => {
      baseItem[tipo] = localItem[tipo] ?? ''
    })

    materialesFusionados[item] = baseItem
  })

  const { error } = await supabase
    .from('modulos')
    .update({ materiales: materialesFusionados })
    .eq('id', moduloId)

  if (error) {
    mostrarNotificacion('No se pudieron guardar los materiales: ' + error.message)
    return
  }

  setModuloSeleccionado((actual) => actual
    ? { ...actual, materiales: materialesFusionados }
    : actual
  )
  setFormulariosElectricos((actuales) => ({
    ...actuales,
    [moduloId]: materialesFusionados,
  }))
  setMaterialesEditados((actuales) => ({
    ...actuales,
    [moduloId]: {},
  }))
  mostrarNotificacion('Materiales guardados correctamente')
}

async function abrirProtocoloEntrega() {
  if (!moduloSeleccionado?.id || !puedeUsarProtocolo) return
  cerrarVentanasEmergentes({ conservarModulo: true })
  setProtocoloSoloLecturaBusqueda(false)
  setProtocoloDesdeHistorial(false)

  const { data: modulo, error } = await supabase
    .from('modulos')
    .select('materiales, protocolo_entrega, responsable')
    .eq('id', moduloSeleccionado.id)
    .single()

  if (error) {
    mostrarNotificacion('No se pudo cargar el protocolo: ' + error.message)
    return
  }

  setFormulariosElectricos((actuales) => ({
    ...actuales,
    [moduloSeleccionado.id]: modulo?.materiales || {},
  }))
  setDatosProtocoloEntrega({
    ...(modulo?.protocolo_entrega || {}),
    fecha: modulo?.protocolo_entrega?.fecha || fechaParaInput(modulo?.fecha_prueba_electrica),
  })
  setResponsableProtocolo(
    modulo?.protocolo_entrega?.responsable || modulo?.responsable || moduloSeleccionado?.responsable || ''
  )
  setProtocoloManualMensual(false)
  setVersionProtocoloEntrega((version) => version + 1)
  setMostrarProtocoloEntrega(true)
}

async function abrirProtocoloDesdeBusqueda(item) {
  if (!item?.id || !puedeUsarProtocolo) return

  cerrarVentanasEmergentes({ conservarModulo: true })
  setMostrarMenuModulo(false)

  if (item.origen === 'manual') {
    setModuloSeleccionado(item)
    setFormulariosElectricos((actuales) => ({
      ...actuales,
      [item.id]: item?.materiales || {},
    }))
    setDatosProtocoloEntrega({
      ...(item?.protocolo_entrega || {}),
      serie: item?.protocolo_entrega?.serie || item?.serie || '',
      tipo: item?.protocolo_entrega?.tipo || item?.tipo || '',
      proyecto: item?.protocolo_entrega?.proyecto || item?.proyecto || '',
      responsable: item?.protocolo_entrega?.responsable || item?.responsable || '',
      fecha: item?.protocolo_entrega?.fecha || fechaParaInput(item?.fecha_prueba_electrica),
    })
    setResponsableProtocolo(item?.protocolo_entrega?.responsable || item?.responsable || '')
    setProtocoloSoloLecturaBusqueda(false)
    setProtocoloDesdeHistorial(false)
    setProtocoloManualMensual(true)
    setVersionProtocoloEntrega((version) => version + 1)
    setMostrarProtocoloEntrega(true)
    return
  }

  if (item.esActual) {
    const { data: modulo, error } = await supabase
      .from('modulos')
      .select('*')
      .eq('id', item.id)
      .single()

    if (error) {
      mostrarNotificacion('No se pudo cargar el protocolo: ' + error.message)
      return
    }

    setModuloSeleccionado(modulo)
    setFormulariosElectricos((actuales) => ({
      ...actuales,
      [modulo.id]: modulo?.materiales || {},
    }))
    setDatosProtocoloEntrega({
      ...(modulo?.protocolo_entrega || {}),
      fecha: modulo?.protocolo_entrega?.fecha || fechaParaInput(modulo?.fecha_prueba_electrica),
    })
    setResponsableProtocolo(modulo?.protocolo_entrega?.responsable || modulo?.responsable || '')
    setProtocoloSoloLecturaBusqueda(false)
    setProtocoloDesdeHistorial(false)
    setProtocoloManualMensual(false)
    setVersionProtocoloEntrega((version) => version + 1)
    setMostrarProtocoloEntrega(true)
    return
  }

  setModuloSeleccionado(item)
  setFormulariosElectricos((actuales) => ({
    ...actuales,
    [item.id]: item?.materiales || {},
  }))
  setDatosProtocoloEntrega({
    ...(item?.protocolo_entrega || {}),
    fecha: item?.protocolo_entrega?.fecha || fechaParaInput(item?.fecha_prueba_electrica),
  })
  setResponsableProtocolo(item?.protocolo_entrega?.responsable || item?.responsable || '')
  setProtocoloSoloLecturaBusqueda(perfil?.rol !== 'admin')
  setProtocoloDesdeHistorial(true)
  setProtocoloManualMensual(false)
  setVersionProtocoloEntrega((version) => version + 1)
  setMostrarProtocoloEntrega(true)
}

async function guardarProtocoloEntrega(protocolo) {
  if (!moduloSeleccionado?.id) return

  if (protocoloManualMensual) {
    if (!puedeVerProtocolosMensuales) return

    const fechaProtocolo = protocolo.fecha || new Date().toISOString().slice(0, 10)
    const protocoloNormalizado = {
      ...protocolo,
      serie: protocolo.serie || moduloSeleccionado.serie || '',
      tipo: protocolo.tipo || moduloSeleccionado.tipo || '',
      proyecto: protocolo.proyecto || moduloSeleccionado.proyecto || '',
      linea: protocolo.linea || moduloSeleccionado.linea || '',
      responsable: protocolo.responsable || moduloSeleccionado.responsable || perfil?.nombre || '',
    }

    const esManualExistente = moduloSeleccionado.origen === 'manual' && !String(moduloSeleccionado.id).startsWith('manual-nuevo-')

    try {
      const duplicado = await buscarProtocoloDuplicado({
        serie: protocoloNormalizado.serie,
        fecha: fechaProtocolo,
        origenActual: esManualExistente ? 'manual' : '',
        idActual: esManualExistente ? moduloSeleccionado.id : '',
      })

      if (duplicado) {
        mostrarNotificacion(`Ya existe un protocolo para la serie ${protocoloNormalizado.serie} con fecha ${formatearFecha(fechaProtocolo)}.`)
        return
      }
    } catch (errorDuplicado) {
      mostrarNotificacion('No se pudo validar si el protocolo estaba duplicado: ' + errorDuplicado.message)
      return
    }

    const payloadManual = {
      serie: protocoloNormalizado.serie,
      tipo: protocoloNormalizado.tipo,
      proyecto: protocoloNormalizado.proyecto,
      responsable: protocoloNormalizado.responsable,
      fecha_prueba_electrica: `${fechaProtocolo}T00:00:00`,
      protocolo_entrega: protocoloNormalizado,
      materiales: protocoloNormalizado.materiales || {},
    }

    const consulta = esManualExistente
      ? supabase.from('protocolos_manuales').update(payloadManual).eq('id', moduloSeleccionado.id).select().single()
      : supabase.from('protocolos_manuales').insert([payloadManual]).select().single()

    const { data, error } = await consulta

    if (error) {
      mostrarNotificacion('No se pudo guardar el protocolo manual: ' + error.message)
      return
    }

    let registroGuardado = data || { ...payloadManual, id: moduloSeleccionado.id, origen: 'manual' }
    const { data: manualVerificado, error: errorVerificacionManual } = await supabase
      .from('protocolos_manuales')
      .select('*')
      .eq('id', registroGuardado.id)
      .maybeSingle()

    if (errorVerificacionManual) {
      mostrarNotificacion('El protocolo manual se guardó, pero no se pudo verificar: ' + errorVerificacionManual.message)
      return
    }

    if (!manualVerificado?.protocolo_entrega) {
      mostrarNotificacion('No se pudo verificar que el protocolo manual quedara guardado')
      return
    }

    registroGuardado = manualVerificado
    setModuloSeleccionado({
      ...registroGuardado,
      origen: 'manual',
      esActual: false,
    })
    setDatosProtocoloEntrega(protocoloNormalizado)
    setVersionProtocoloEntrega((version) => version + 1)
    setFormulariosElectricos((actuales) => ({
      ...actuales,
      [registroGuardado.id]: protocoloNormalizado.materiales || {},
    }))
    setProtocolosMensuales((actuales) => actuales.map((item) => (
      item.origen === 'manual' && item.id === registroGuardado.id
        ? prepararRegistroProtocoloMensual({
            ...item,
            ...registroGuardado,
            protocolo_entrega: protocoloNormalizado,
            materiales: protocoloNormalizado.materiales || {},
          }, 'manual', preciosMateriales)
        : item
    )))
    setProtocoloManualMensual(true)
    await cargarProtocolosMensuales(fechaProtocolosMensuales, rangoProtocolosMensuales)
    mostrarNotificacion('Protocolo manual guardado correctamente')
    return
  }

  if (protocoloDesdeHistorial && perfil?.rol !== 'admin') return
  if (!protocoloDesdeHistorial && !puedeEditarDatosProtocolo) return

  const tablaDestino = protocoloDesdeHistorial ? 'historial_modulos' : 'modulos'
  const protocoloParaGuardar = esEstadoGarantia(moduloSeleccionado?.estado || protocolo?.estado)
    ? agregarNotaGarantiaProtocolo(protocolo, protocolo?.fecha || moduloSeleccionado?.fecha_prueba_electrica)
    : protocolo
  const fechaPruebaProtocolo = protocoloParaGuardar.fecha
    ? `${protocoloParaGuardar.fecha}T00:00:00`
    : moduloSeleccionado?.fecha_prueba_electrica || null
  const payloadProtocolo = {
    protocolo_entrega: protocoloParaGuardar,
    materiales: protocoloParaGuardar.materiales || {},
    fecha_prueba_electrica: fechaPruebaProtocolo,
    serie: protocoloParaGuardar.serie || moduloSeleccionado?.serie || '',
    tipo: protocoloParaGuardar.tipo || moduloSeleccionado?.tipo || '',
    proyecto: protocoloParaGuardar.proyecto || moduloSeleccionado?.proyecto || '',
    responsable: protocoloParaGuardar.responsable || moduloSeleccionado?.responsable || '',
    linea: protocoloParaGuardar.linea || moduloSeleccionado?.linea || '',
    estado: protocoloParaGuardar.estado || moduloSeleccionado?.estado || '',
  }

  let { count: filasActualizadas, error } = await supabase
    .from(tablaDestino)
    .update(payloadProtocolo, { count: 'exact' })
    .eq('id', moduloSeleccionado.id)
  let registroGuardado = null

  if (error) {
    mostrarNotificacion('No se pudo guardar el protocolo: ' + error.message)
    return
  }

  if (filasActualizadas === 0) {
    mostrarNotificacion('No se encontrÃ³ el registro del protocolo para guardar')
    return
  }

  const { data: registroVerificado, error: errorVerificacion } = await supabase
    .from(tablaDestino)
    .select('*')
    .eq('id', moduloSeleccionado.id)
    .maybeSingle()

  if (!errorVerificacion && registroVerificado) {
    registroGuardado = registroVerificado
  }

  registroGuardado = registroGuardado || {
    ...moduloSeleccionado,
    ...payloadProtocolo,
  }

  const protocoloGuardado = registroGuardado.protocolo_entrega || protocoloParaGuardar
  const materialesGuardados = registroGuardado.materiales || protocoloParaGuardar.materiales || {}

  setDatosProtocoloEntrega(protocoloGuardado)
  setVersionProtocoloEntrega((version) => version + 1)
  setFormulariosElectricos((actuales) => ({
    ...actuales,
    [moduloSeleccionado.id]: materialesGuardados,
  }))
  setModuloSeleccionado((actual) => actual
    ? {
        ...actual,
        ...registroGuardado,
        protocolo_entrega: protocoloGuardado,
        materiales: materialesGuardados,
      }
    : actual
  )
  if (protocoloDesdeHistorial) {
    setProtocolosMensuales((actuales) => actuales.map((item) => (
      item.origen === 'historial' && (
        item.id === moduloSeleccionado.id ||
        item.id === registroGuardado.id
      )
        ? prepararRegistroProtocoloMensual({ ...item, ...registroGuardado, protocolo_entrega: protocoloGuardado, materiales: materialesGuardados }, 'historial', preciosMateriales)
        : item
    )))
    setResultadoBusqueda((actuales) => actuales.map((item) => (
      !item.esActual && (
        item.id === moduloSeleccionado.id ||
        item.id === registroGuardado.id
      )
        ? { ...item, ...registroGuardado, protocolo_entrega: protocoloGuardado, materiales: materialesGuardados }
        : item
    )))
    await cargarHistorial()
  } else {
    setProtocolosMensuales((actuales) => actuales.map((item) => (
      item.id === moduloSeleccionado.id && item.origen === 'actual'
        ? prepararRegistroProtocoloMensual({ ...item, ...registroGuardado, protocolo_entrega: protocoloGuardado, materiales: materialesGuardados }, 'actual', preciosMateriales)
        : item
    )))
  }
  mostrarNotificacion('Protocolo guardado correctamente')
}


async function finalizarModulo() {
  if (!puedeFinalizarModulos || !moduloSeleccionado?.id) return

  const { data: modulo, error: errorModulo } = await supabase
    .from('modulos')
    .select('*')
    .eq('id', moduloSeleccionado.id)
    .single()

  if (errorModulo) {
    mostrarNotificacion(errorModulo.message)
    return
  }

  if (normalizarTexto(modulo.estado) === 'sin instalacion') {
    const { error: errorDeleteSinInstalacion } = await supabase
      .from('modulos')
      .delete()
      .eq('id', modulo.id)

    if (errorDeleteSinInstalacion) {
      mostrarNotificacion(errorDeleteSinInstalacion.message)
      return
    }

    setFormulariosElectricos((actuales) => {
      const copia = { ...actuales }
      delete copia[modulo.id]
      return copia
    })

    await cargarTablero()
    await registrarAccionModulo({
      tipo: 'finalizacion',
      modulo,
      datosAntes: modulo,
      datosDespues: null,
      descripcion: 'Retirado sin instalación',
    })
    limpiarEstadosModal()
    mostrarNotificacion('Módulo sin instalacion retirado sin registro')
    return
  }

  const protocoloHistorial = esEstadoGarantia(modulo.estado)
    ? agregarNotaGarantiaProtocolo(modulo.protocolo_entrega || {}, modulo.fecha_prueba_electrica)
    : modulo.protocolo_entrega || {}

  const historialPayload = {
    modulo_id: modulo.id,
    serie: modulo.serie,
    tipo: modulo.tipo,
    proyecto: modulo.proyecto,
    responsable: modulo.responsable,
    fecha_ingreso: modulo.fecha_ingreso,
    fecha_prueba_electrica: modulo.fecha_prueba_electrica,
    id_ot: modulo.id_ot || modulo.protocolo_entrega?.id_ot || modulo.protocolo_entrega?.idOt || null,
    protocolo_entrega: protocoloHistorial,
    nota: modulo.nota || '',
    observacion_alerta: modulo.observacion_alerta || '',
    fecha_salida: new Date().toISOString(),
    estado: modulo.estado,
    linea: modulo.linea,
    posicion: modulo.posicion,
  }

  let { error: errorHistorial } = await supabase
    .from('historial_modulos')
    .insert([historialPayload])

  if (errorHistorial?.message?.includes("'nota' column")) {
    const payloadSinNota = { ...historialPayload }
    delete payloadSinNota.nota
    ;({ error: errorHistorial } = await supabase
      .from('historial_modulos')
      .insert([payloadSinNota]))
  }

  if (errorHistorial?.message?.includes('historial_ciclo_unico')) {
    let { error: errorUpdateHistorial } = await supabase
      .from('historial_modulos')
      .update(historialPayload)
      .eq('modulo_id', modulo.id)

    if (errorUpdateHistorial?.message?.includes("'nota' column")) {
      const payloadSinNota = { ...historialPayload }
      delete payloadSinNota.nota
      ;({ error: errorUpdateHistorial } = await supabase
        .from('historial_modulos')
        .update(payloadSinNota)
        .eq('modulo_id', modulo.id))
    }

    errorHistorial = errorUpdateHistorial
  }

  if (errorHistorial) {
    mostrarNotificacion(errorHistorial.message)
    return
  }

  const { data: historialCreado } = await supabase
    .from('historial_modulos')
    .select('*')
    .eq('modulo_id', modulo.id)
    .order('fecha_salida', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error: errorDelete } = await supabase
    .from('modulos')
    .delete()
    .eq('id', modulo.id)

  if (errorDelete) {
    mostrarNotificacion(errorDelete.message)
    return
  }

  await cargarTablero()
  await cargarHistorial()

  await registrarAccionModulo({
    tipo: 'finalizacion',
    modulo,
    datosAntes: modulo,
    datosDespues: historialCreado || historialPayload,
    descripcion: `Finalizó módulo desde línea ${modulo.linea}`,
  })

  limpiarEstadosModal()

  mostrarNotificacion('Módulo finalizado correctamente')
}

async function eliminarModuloSinRegistro() {
  if (perfil?.rol !== 'admin' || !moduloSeleccionado?.id) return

  const confirmado = window.confirm(
    `¿Eliminar el módulo ${moduloSeleccionado.serie || ''} sin dejar registro? Esta acción no se puede deshacer.`
  )

  if (!confirmado) return

  const { error } = await supabase
    .from('modulos')
    .delete()
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion('No se pudo eliminar el módulo: ' + error.message)
    return
  }

  setFormulariosElectricos((actuales) => {
    const copia = { ...actuales }
    delete copia[moduloSeleccionado.id]
    return copia
  })
  await cargarTablero()
  limpiarEstadosModal()
  mostrarNotificacion('Módulo eliminado sin dejar registro')
}

async function moverModulo(moduloId, lineaDestino, posicionDestino) {
  if (!puedeMoverModulos) {
    mostrarNotificacion('No tienes permisos para mover módulos')
    return
  }

  if (!moduloId) {
    mostrarNotificacion('Error: Módulo inválido')
    return
  }

  const lineaDestinoParsed = Number(lineaDestino)
  const posicionDestinoParsed = Number(posicionDestino)

  const { data: registros, error: errorCarga } = await supabase
    .from('modulos')
    .select('*')

  if (errorCarga) {
    mostrarNotificacion('Error al cargar módulos: ' + errorCarga.message)
    return
  }

  const modulosActivos = (registros || []).filter(
    (x) => x?.serie && String(x.serie).trim() !== ''
  )
  const moduloActual = modulosActivos.find(
    (x) => String(x.id) === String(moduloId)
  )

  if (!moduloActual) {
    mostrarNotificacion('Error: No se encontró el módulo')
    return
  }

  const lineaOrigen = Number(moduloActual.linea)
  const posicionOrigen = Number(moduloActual.posicion)

  if (lineaOrigen === lineaDestinoParsed && posicionOrigen === posicionDestinoParsed) {
    mostrarNotificacion('El módulo ya está en esa posición')
    return
  }

  const moduloDestino = modulosActivos.find(
    (x) =>
      Number(x.linea) === lineaDestinoParsed &&
      Number(x.posicion) === posicionDestinoParsed &&
      String(x.id) !== String(moduloId)
  )

  try {
    const posicionTemporal = 1000 + Math.floor(Math.random() * 100000)
    const moverRegistro = async (id, linea, posicion) => {
      const { error } = await supabase
        .from('modulos')
        .update({ linea, posicion })
        .eq('id', id)

      if (error) {
        throw new Error(error.message)
      }
    }

    if (moduloDestino && lineaOrigen === lineaDestinoParsed) {
      const modulosLinea = modulosActivos.filter(
        (x) => Number(x.linea) === lineaOrigen && String(x.id) !== String(moduloId)
      )
      let movimientos = []

      if (posicionOrigen > posicionDestinoParsed) {
        movimientos = modulosLinea
          .filter((x) => Number(x.posicion) >= posicionDestinoParsed && Number(x.posicion) < posicionOrigen)
          .map((x) => ({ id: x.id, linea: lineaOrigen, posicion: Number(x.posicion) + 1, posicionActual: Number(x.posicion) }))
          .sort((a, b) => b.posicionActual - a.posicionActual)
      } else {
        movimientos = modulosLinea
          .filter((x) => Number(x.posicion) <= posicionDestinoParsed && Number(x.posicion) > posicionOrigen)
          .map((x) => ({ id: x.id, linea: lineaOrigen, posicion: Number(x.posicion) - 1, posicionActual: Number(x.posicion) }))
          .sort((a, b) => a.posicionActual - b.posicionActual)
      }

      await moverRegistro(moduloActual.id, lineaOrigen, posicionTemporal)

      for (const movimiento of movimientos) {
        await moverRegistro(movimiento.id, movimiento.linea, movimiento.posicion)
      }

      await moverRegistro(moduloActual.id, lineaDestinoParsed, posicionDestinoParsed)
      await cargarTablero()
      mostrarNotificacion('Módulo insertado correctamente')
      return
    }

    if (lineaOrigen !== lineaDestinoParsed) {
      const modulosLineaDestino = modulosActivos
        .filter((x) => Number(x.linea) === lineaDestinoParsed && String(x.id) !== String(moduloId))
        .sort((a, b) => Number(a.posicion) - Number(b.posicion))

      if (modulosLineaDestino.length >= 9) {
        mostrarNotificacion(`La línea ${lineaDestinoParsed} ya está completa`)
        return
      }

      const posicionInsercion = Math.max(1, Math.min(posicionDestinoParsed, modulosLineaDestino.length + 1))

      await moverRegistro(moduloActual.id, lineaOrigen, posicionTemporal)

      const movimientosOrigen = modulosActivos
        .filter((x) =>
          Number(x.linea) === lineaOrigen &&
          String(x.id) !== String(moduloId) &&
          Number(x.posicion) > posicionOrigen
        )
        .map((x) => ({ id: x.id, linea: lineaOrigen, posicion: Number(x.posicion) - 1, posicionActual: Number(x.posicion) }))
        .sort((a, b) => a.posicionActual - b.posicionActual)

      const movimientosDestino = modulosLineaDestino
        .filter((x) => Number(x.posicion) >= posicionInsercion)
        .map((x) => ({ id: x.id, linea: lineaDestinoParsed, posicion: Number(x.posicion) + 1, posicionActual: Number(x.posicion) }))
        .sort((a, b) => b.posicionActual - a.posicionActual)

      for (const movimiento of movimientosOrigen) {
        await moverRegistro(movimiento.id, movimiento.linea, movimiento.posicion)
      }

      for (const movimiento of movimientosDestino) {
        await moverRegistro(movimiento.id, movimiento.linea, movimiento.posicion)
      }

      await moverRegistro(moduloActual.id, lineaDestinoParsed, posicionInsercion)
      await cargarTablero()
      mostrarNotificacion('Módulo agregado a la línea correctamente')
      return
    }

    await moverRegistro(moduloActual.id, lineaOrigen, posicionTemporal)

    if (moduloDestino) {
      await moverRegistro(moduloDestino.id, lineaOrigen, posicionOrigen)
    }

    await moverRegistro(moduloActual.id, lineaDestinoParsed, posicionDestinoParsed)

    await cargarTablero()
    mostrarNotificacion(moduloDestino ? 'Módulos intercambiados correctamente' : 'Módulo movido correctamente')
  } catch (err) {
    console.error(err)
    mostrarNotificacion('Error: ' + (err?.message || 'Error desconocido'))
    await cargarTablero()
  }
}

  function colorEstado(estado, modulo = {}) {
    switch (normalizarTexto(estado)) {
      case 'sin iniciar':
        return '#808080'

      case 'canalizado':
        return '#d32f2f'

      case 'cableado':
        return '#fbc02d'

      case 'terminaciones':
        return '#1976d2'

      case 'prueba electrica':
      case 'sin instalacion':
        return '#388e3c'

      case 'en garantia':
        return estaDentroDeGarantia(modulo.fecha_prueba_electrica) ? '#388e3c' : '#d32f2f'

      default:
        return '#444'
    }
  }

  const modulosActivos = datos.filter((x) => x.serie)

  const ocupacion = modulosActivos.length

  const canalizados = modulosActivos.filter(
    (x) => x.estado?.toLowerCase() === 'canalizado'
  ).length

  const cableados = modulosActivos.filter(
    (x) => x.estado?.toLowerCase() === 'cableado'
  ).length

  const terminaciones = modulosActivos.filter(
    (x) => x.estado?.toLowerCase() === 'terminaciones'
  ).length

  const pruebas = modulosActivos.filter(
    (x) =>
      x.estado?.toLowerCase() === 'prueba eléctrica' ||
      x.estado?.toLowerCase() === 'prueba electrica'
  ).length

const esFechaDeHoy = (valor) => {
  if (!valor) return false
  const fecha = new Date(valor)
  const hoyLocal = new Date()

  return (
    fecha.getFullYear() === hoyLocal.getFullYear() &&
    fecha.getMonth() === hoyLocal.getMonth() &&
    fecha.getDate() === hoyLocal.getDate()
  )
}

const pruebasElectricasHoy = [...modulosActivos, ...historial].filter(
  (modulo) => esFechaDeHoy(modulo.fecha_prueba_electrica)
).length

const hoy = new Date().toISOString().slice(0, 10)

const terminadosHoy = historial.filter(
  (x) =>
    x.fecha_salida &&
    x.fecha_salida.slice(0, 10) === hoy
).length

const mesActual = new Date().getMonth()
const anioActual = new Date().getFullYear()

const pruebasElectricasMes = [...modulosActivos, ...historial].filter((modulo) => {
  if (!modulo.fecha_prueba_electrica) return false
  const fecha = new Date(modulo.fecha_prueba_electrica)

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.getMonth() === mesActual &&
    fecha.getFullYear() === anioActual
  )
}).length

const ultimosFinalizados = [...historial]
  .filter((item) => item.serie)
  .sort((a, b) => new Date(b.fecha_salida || 0) - new Date(a.fecha_salida || 0))
  .slice(0, 5)

  

  return (
    <>
      <div
        onClick={cerrarPanelesYModulo}
        style={{
          padding: '20px',
          width: '100%',
          boxSizing: 'border-box',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>Control de Módulos</h1>

        <Notificacion mensaje={notificacion} />

        {recibeAvisosPrueba && avisoPruebaElectrica && (
          <button
            onClick={() => {
              setMostrarLlamadosPendientes(true)
              setAvisoPruebaElectrica(null)
            }}
            style={{
              position: 'fixed',
              top: '14px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100vw - 32px)',
              maxWidth: '420px',
              padding: '14px 18px',
              background: '#f57c00',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
              zIndex: 3000,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Prueba eléctrica línea {avisoPruebaElectrica.linea}
          </button>
        )}

        {perfil?.rol === 'admin' && (
          <>
            <button
              aria-label="Ver acciones del dÃ­a"
              onClick={async (e) => {
                e.stopPropagation()
                const abrir = !mostrarRegistroAcciones
                cerrarVentanasEmergentes()
                setMostrarRegistroAcciones(abrir)
                setMostrarTodasAccionesDia(false)
                if (abrir) await cargarAccionesDia()
              }}
              style={{
                position: 'fixed',
                left: '12px',
                bottom: '84px',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                border: '2px solid white',
                background: '#1976d2',
                color: 'white',
                fontSize: '30px',
                lineHeight: '52px',
                zIndex: 2501,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              }}
            >
              🔂
            </button>

            {mostrarRegistroAcciones && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  left: '12px',
                  bottom: '146px',
                  width: 'calc(100vw - 24px)',
                  maxWidth: '420px',
                  maxHeight: '62vh',
                  overflowY: 'auto',
                  padding: '16px',
                  boxSizing: 'border-box',
                  border: '1px solid white',
                  borderRadius: '10px',
                  background: '#222',
                  color: 'white',
                  textAlign: 'left',
                  zIndex: 2500,
                  boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0 }}>Acciones de hoy</h3>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {accionesDia.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setMostrarTodasAccionesDia((actual) => !actual)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '7px',
                          border: '1px solid #777',
                          background: '#333',
                          color: 'white',
                          cursor: 'pointer',
                        }}
                      >
                        {mostrarTodasAccionesDia ? 'Ver menos' : 'Ver más'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={cargarAccionesDia}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '7px',
                        border: '1px solid #777',
                        background: '#333',
                        color: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      Actualizar
                    </button>
                  </div>
                </div>

                {cargandoAccionesDia ? (
                  <p>Cargando...</p>
                ) : accionesDia.length === 0 ? (
                  <p>No hay ingresos, finalizaciones o cambios de estado registrados hoy.</p>
                ) : (
                  (mostrarTodasAccionesDia ? accionesDia : accionesDia.slice(0, 5)).map((accion) => (
                    <div
                      key={accion.id}
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid #444',
                        opacity: accion.deshecho ? 0.55 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <strong>{nombreTipoAccion(accion.tipo)}</strong>
                        <span style={{ color: '#bbb', fontSize: '12px' }}>
                          {accion.created_at ? new Date(accion.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '13px', color: '#ddd' }}>
                        Serie: <strong>{accion.serie || '-'}</strong>
                        {accion.linea ? ` | Línea ${accion.linea}` : ''}
                        {' | '}
                        <span style={{ color: '#ccc' }}>{accion.usuario_nombre || 'No registrado'}</span>
                      </div>
                      {accion.descripcion && (
                        <div style={{ marginTop: '3px', fontSize: '13px', color: '#ffecb3' }}>
                          {accion.descripcion}
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={accion.deshecho}
                        onClick={() => deshacerAccionModulo(accion)}
                        style={{
                          marginTop: '8px',
                          padding: '7px 10px',
                          borderRadius: '7px',
                          border: '1px solid #ffb74d',
                          background: accion.deshecho ? '#555' : '#bf360c',
                          color: 'white',
                          cursor: accion.deshecho ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        {accion.deshecho ? 'Deshecho' : 'Deshacer'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {recibeAvisosPrueba && (
          <>
            <button
              aria-label="Ver llamados a prueba eléctrica pendientes"
              onClick={(e) => {
                e.stopPropagation()
                const abrir = !mostrarLlamadosPendientes
                cerrarVentanasEmergentes()
                setMostrarLlamadosPendientes(abrir)
              }}
              style={{
                position: 'fixed',
                left: '12px',
                bottom: '20px',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                border: '2px solid white',
                background: '#1976d2',
                color: 'white',
                fontSize: '24px',
                zIndex: 2500,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              }}
            >
              🔔
              {llamadosPendientes.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    minWidth: '20px',
                    height: '20px',
                    padding: '0 4px',
                    boxSizing: 'border-box',
                    borderRadius: '10px',
                    background: '#d32f2f',
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '20px',
                    fontWeight: 700,
                  }}
                >
                  {llamadosPendientes.length}
                </span>
              )}
            </button>

            {mostrarLlamadosPendientes && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  left: '12px',
                  bottom: '82px',
                  width: 'calc(100vw - 24px)',
                  maxWidth: '360px',
                  maxHeight: '60vh',
                  overflowY: 'auto',
                  padding: '16px',
                  boxSizing: 'border-box',
                  border: '1px solid white',
                  borderRadius: '10px',
                  background: '#222',
                  color: 'white',
                  textAlign: 'left',
                  zIndex: 2499,
                  boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
                }}
              >
                <h3 style={{ margin: '0 0 12px' }}>Pruebas pendientes</h3>

                {llamadosPendientes.length === 0 ? (
                  <p>No hay llamados pendientes.</p>
                ) : (
                  llamadosPendientes.map((modulo) => (
                    <div
                      key={modulo.id}
                      style={{ padding: '9px 0', borderBottom: '1px solid #444' }}
                    >
                      <strong style={{ display: 'block' }}>
                        LÍNEA {modulo.linea}
                      </strong>
                      <span style={{ display: 'block', marginTop: '2px', fontSize: '13px', color: '#ccc' }}>
                        {solicitantesPendientes[modulo.id] || 'Cargando...'} - {modulo.serie}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {puedeVerMenuAcciones && (
          <>
            <button
              aria-label="Abrir menú de acciones"
              onClick={(e) => {
                e.stopPropagation()
                const abrir = !mostrarMenuAcciones
                cerrarVentanasEmergentes()
                setMostrarMenuAcciones(abrir)
              }}
              style={{
                position: 'fixed',
                left: '12px',
                top: '12px',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                border: '2px solid white',
                background: '#424242',
                color: 'white',
                fontSize: '24px',
                zIndex: 2500,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              }}
            >
              ...
            </button>

            {mostrarMenuAcciones && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  left: '12px',
                  top: '72px',
                  width: '220px',
                  padding: '10px',
                  boxSizing: 'border-box',
                  border: '1px solid white',
                  borderRadius: '10px',
                  background: '#222',
                  color: 'white',
                  textAlign: 'left',
                  zIndex: 2499,
                  boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
                }}
              >
                {puedeAgregarModulos && (
                  <button
                    type="button"
                    onClick={abrirReintegrarModulo}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #555',
                      background: '#1565c0',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Reintegrar
                  </button>
                )}
                {puedeDescargarProtocolosDiarios && (
                  <button
                    type="button"
                    onClick={descargarProtocolosDiarios}
                    style={{
                      width: '100%',
                      marginTop: puedeAgregarModulos ? '8px' : 0,
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #555',
                      background: '#2e7d32',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Descargar protocolos diarios
                  </button>
                )}
                {puedeVerPreciosMateriales && (
                  <button
                    type="button"
                    onClick={abrirPreciosMateriales}
                    style={{
                      width: '100%',
                      marginTop: (puedeAgregarModulos || puedeDescargarProtocolosDiarios) ? '8px' : 0,
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #555',
                      background: '#6a1b9a',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Precios materiales
                  </button>
                )}
              </div>
            )}
          </>
        )}

        <button
  onClick={() => supabase.auth.signOut()}
  style={{
    marginBottom: '20px',
  }}
>
  Cerrar sesión
</button>

        
             <div
  style={{
    marginBottom: '15px',
    color: '#ccc',
  }}
>
  Usuario: {perfil?.nombre}
  {' | '}
  Rol: {perfil?.rol}
</div>

<div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
  <button
    onClick={() => setMostrarKPI(!mostrarKPI)}
    style={{
      padding: '10px 20px',
      borderRadius: '8px',
      cursor: 'pointer',
    }}
  >
    {mostrarKPI ? 'Ocultar indicadores' : 'Ver indicadores'}
  </button>
  <button
    onClick={() => setMostrarVistaGeneral(!mostrarVistaGeneral)}
    style={{
      padding: '10px 20px',
      borderRadius: '8px',
      cursor: 'pointer',
    }}
  >
    {mostrarVistaGeneral ? 'Ver por línea' : 'Vista general'}
  </button>
  {puedeVerProtocolosMensuales && (
    <button
      onClick={abrirProtocolosMensuales}
      style={{
        padding: '10px 20px',
        borderRadius: '8px',
        cursor: 'pointer',
        background: '#455a64',
        color: 'white',
        border: '1px solid #78909c',
      }}
    >
      Protocolos mensuales
    </button>
  )}
</div>

{mostrarKPI && (
  <div
    className="indicadores-grid"
    style={{
      marginBottom: '30px',
      width: '100%',
    }}
  >

    <div
      style={{
        background: '#a6a1a1',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '120px',
      }}
    >
      <h3 style={{ color: '#111' }}>En proceso</h3>
      <h2 style={{ color: '#111' }}>{ocupacion}</h2>
    </div>

    <div
      style={{
        background: '#d32f2f',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '120px',
      }}
    >
      <h3>Canalizado</h3>
      <h2>{canalizados}/{ocupacion}</h2>
    </div>

    <div
      style={{
        background: '#fbc02d',
        color: 'black',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '120px',
      }}
    >
      <h3>Cableado</h3>
      <h2>{cableados}/{ocupacion}</h2>
    </div>

    <div
      style={{
        background: '#1976d2',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '120px',
      }}
    >
      <h3>Terminaciones</h3>
      <h2>{terminaciones}/{ocupacion}</h2>
    </div>

    <div
      style={{
        background: '#388e3c',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '120px',
      }}
    >
      <h3>Prueba eléctrica OK</h3>
      <h2>{pruebas}/{ocupacion}</h2>
    </div>

    <div
      style={{
        background: '#00695c',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '120px',
      }}
    >
      <h3 style={{ color: 'white' }}>Pruebas eléctricas hoy</h3>
      <h2 style={{ color: 'white' }}>{pruebasElectricasHoy}</h2>
    </div>

    <div
      style={{
        background: '#4caf50',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '120px',
      }}
    >
      <h3>Retirados hoy</h3>
      <h2>{terminadosHoy}</h2>
    </div>

    <div
      style={{
        background: '#009688',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '120px',
      }}
    >
      <h3>Pruebas eléctricas este mes</h3>
      <h2>{pruebasElectricasMes}</h2>
    </div>

  </div>
)}

<div
  style={{
    background: '#222',
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '30px',
    width: '100%',
    boxSizing: 'border-box',
  }}
>

  <h2>Buscar historial por serie</h2>

<div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
  <input
    type="text"
    value={serieBusqueda}
    onChange={(e) => setSerieBusqueda(e.target.value)}
    placeholder="Buscar serie"
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        buscarSerie()
      }
    }}
  />

  <button onClick={buscarSerie}>
    Buscar
  </button>

  {(serieBusqueda || busquedaRealizada || resultadoBusqueda.length > 0) && (
    <button
      type="button"
      onClick={limpiarBusquedaSerie}
      title="Limpiar búsqueda"
      style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        border: '1px solid #777',
        background: '#444',
        color: 'white',
        cursor: 'pointer',
        fontWeight: 900,
      }}
    >
      ×
    </button>
  )}
</div>

{/* BLOQUE FECHAS + EXPORTAR (SEPARADO) */}
<div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>

  <input
    type="date"
    value={fechaDesde}
    onChange={(e) => setFechaDesde(e.target.value)}
  />

  <input
    type="date"
    value={fechaHasta}
    onChange={(e) => setFechaHasta(e.target.value)}
  />

  <button
    type="button"
    onClick={exportarHistorialExcelHandler}
  >
    Exportar Excel
  </button>

</div>

  {busquedaRealizada && resultadoBusqueda.length === 0 && (
    <p style={{ marginTop: '12px' }}>No se encontraron registros para esa serie.</p>
  )}

  {resultadoBusqueda.map((item) => (
    <div
      key={`${item.esActual ? 'actual' : 'historial'}-${item.id}`}
      style={{
        marginTop: '10px',
        padding: '10px',
        border: '1px solid #555',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: '1 1 260px', textAlign: 'center' }}>
        <div style={{ color: item.esActual ? '#81c784' : '#ffcc80', fontWeight: 800, marginBottom: '4px' }}>
          {item.esActual ? 'Registro actual' : 'Registro histórico'}
        </div>

        <div>
          <strong>Serie:</strong> {item.serie}
        </div>

        <div>
          <strong>Fecha prueba:</strong>{' '}
          {item.fecha_prueba_electrica
            ? formatearFecha(item.fecha_prueba_electrica)
            : 'Sin registro'}
        </div>

        {item.esActual && (
          <div style={{ marginTop: '4px', color: '#81c784', fontWeight: 700 }}>
            (Actualmente en línea {item.linea})
          </div>
        )}

        {!item.esActual && item.fecha_salida && (
          <div>
            <strong>Fecha salida:</strong> {formatearFecha(item.fecha_salida)}
          </div>
        )}

        <div>
          <strong>Proyecto:</strong> {item.proyecto}
        </div>

        <div>
          <strong>Responsable:</strong> {item.responsable}
        </div>
      </div>

      {puedeUsarProtocolo && (
        <button
          type="button"
          onClick={() => abrirProtocoloDesdeBusqueda(item)}
          style={{
            flex: '0 0 118px',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #777',
            background: '#333',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          <span style={{ display: 'block' }}>Ver protocolo</span>
          <span style={{ display: 'block', fontSize: '24px', marginTop: '4px' }}>📜</span>
        </button>
      )}
    </div>
  ))}
</div>

</div>

{mostrarVistaGeneral ? (
  <div onClick={cerrarPanelesYModulo} style={{ marginBottom: '20px', fontSize: '13px', lineHeight: 1.2 }}>
    <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Vista general de todas las líneas</h2>

    {Array.from({ length: 9 }, (_, i) => i + 1).map((linea) => (
      <div key={linea} style={{ marginBottom: '14px' }}>
        <h3 style={{ marginBottom: '8px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <span style={{ fontSize: '26px', fontWeight: '800', textTransform: 'uppercase' }}>
            Línea {linea}
          </span>
          <span style={{ fontSize: '16px', fontWeight: '500', color: '#ccc' }}>
            ({datos.filter((x) => x.linea === linea && x.serie).length} módulos)
          </span>
        </h3>

        <div
          onDragOver={(e) => {
            if (!moduloEnDrag) return
            e.preventDefault()
            autoScrollLineaDuranteArrastre(e.currentTarget, e.clientX)
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              detenerAutoScrollArrastre()
            }
          }}
          style={{
            display: 'flex',
            gap: '2px',
            overflowX: 'auto',
            paddingBottom: '2px',
          }}
        >
          {puedeAgregarModulos && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                abrirIngresoModuloEnExtremo(linea, 'inicio')
              }}
              style={{
                flex: '0 0 34px',
                minHeight: '60px',
                borderRadius: '5px',
                border: '1px dashed #90caf9',
                background: '#0d47a1',
                color: 'white',
                fontSize: '20px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Ingresar módulo por calle acopio"
            >
              +
            </button>
          )}
          {datos
            .filter((x) => x.linea === linea)
            .filter((x) => x.serie)
            .map((pos) => (
              <div
                key={`${pos.linea}-${pos.posicion}`}
                className={esSolicitudPruebaActiva(pos.solicitud_prueba) ? 'modulo-prueba-pendiente' : undefined}
                draggable={puedeMoverModulos && pos.serie ? true : false}
                onDragStart={() => puedeMoverModulos && pos.serie && setModuloEnDrag(pos)}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.opacity = '0.6'
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.opacity = '1'
                  detenerAutoScrollArrastre()
                  const idValido = typeof moduloEnDrag?.id === 'string' && moduloEnDrag.id !== 'null' && moduloEnDrag.id.trim() !== ''
                  const esMismo = moduloEnDrag?.id === pos.id
                  if (idValido && !esMismo) {
                    moverModulo(moduloEnDrag.id, linea, pos.posicion)
                  }
                  setModuloEnDrag(null)
                }}
                onDragEnd={() => {
                  detenerAutoScrollArrastre()
                  setModuloEnDrag(null)
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  cerrarVentanasEmergentes()
                  console.log('CLICK POSICION', pos)

                  if (pos.serie) {
                    setNombreSolicitante('')
                    setRolSolicitante('')
                    setModuloSeleccionado(pos)
                    setSerieEditada(pos.serie)
                    setTipoEditado(pos.tipo)
                    setProyectoEditado(pos.proyecto)
                    setResponsableEditado(pos.responsable || '')
                    setEstadoEditado(pos.estado)
                    setLineaEditada(pos.linea)
                    setPosicionEditada(pos.posicion)
                    setFechaPruebaEditada(fechaParaInput(pos.fecha_prueba_electrica))
                    setNotaEditada(pos.nota || '')

                    if (['electrico', 'visor', 'analista', 'operador', 'admin'].includes(perfil?.rol)) {
                      cargarMaterialesModulo(pos.id)
                    }

                    if (esSolicitudPruebaActiva(pos.solicitud_prueba)) {
                      cargarNombreSolicitante(pos.solicitado_por, pos.id)
                    }
                  } else {
                    console.log('POSICION VACIA')
                    if (puedeAgregarModulos) {
                      setPosicionSeleccionada(pos)
                      setMostrarNuevoModulo(true)
                    }
                  }
                }}
                style={{
                  width: '70px',
                  minHeight: '60px',
                  padding: '3px',
                  borderRadius: '5px',
                  cursor: puedeMoverModulos && pos.serie ? 'grab' : 'pointer',
                  backgroundColor: pos.estado
                    ? colorEstado(pos.estado, pos)
                    : '#222',
                  color: 'white',
                  boxSizing: 'border-box',
                  flex: '0 0 70px',
                  fontSize: '9px',
                  transition: 'opacity 0.2s',
                }}
              >
                {pos.serie ? (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <strong>{pos.serie}</strong>

                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                        {pos.observacion_alerta && (
                          <span
                            title="Ver observación"
                            onClick={(e) => {
                              e.stopPropagation()
                              mostrarObservacionAlerta(pos)
                            }}
                            style={{
                              fontSize: '18px',
                              cursor: 'pointer',
                              lineHeight: 1,
                            }}
                          >
                            🚨
                          </span>
                        )}

                        {pos.nota && (
                          <span
                            title="Este módulo tiene una nota"
                            style={{
                              fontSize: '18px',
                              lineHeight: 1,
                            }}
                          >
                            💬
                          </span>
                        )}
                      </span>
                    </div>
                    <div>{pos.tipo}</div>
                  </>
                ) : (
                  <div>Vacío</div>
                )}
              </div>
            ))}
          {puedeAgregarModulos && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                abrirIngresoModuloEnExtremo(linea, 'fin')
              }}
              style={{
                flex: '0 0 34px',
                minHeight: '60px',
                borderRadius: '5px',
                border: '1px dashed #90caf9',
                background: '#0d47a1',
                color: 'white',
                fontSize: '20px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Ingresar módulo por calle agua"
            >
              +
            </button>
          )}
        </div>
      </div>
    ))}
  </div>
) : (
  <div onClick={cerrarPanelesYModulo}>
    {Array.from({ length: 9 }, (_, i) => i + 1).map((linea) => (
      <div key={linea} style={{ marginBottom: '30px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '22px' }}>
          <span style={{ fontWeight: '800', textTransform: 'uppercase' }}>
            Línea {linea}
          </span>
          <span style={{ fontWeight: '500', fontSize: '18px', color: '#ccc' }}>
            ({datos.filter((x) => x.linea === linea && x.serie).length} módulos)
          </span>
        </h2>

        <div
          onDragOver={(e) => {
            if (!moduloEnDrag) return
            e.preventDefault()
            autoScrollLineaDuranteArrastre(e.currentTarget, e.clientX)
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              detenerAutoScrollArrastre()
            }
          }}
          style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '6px',
          }}
        >
          {puedeAgregarModulos && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                abrirIngresoModuloEnExtremo(linea, 'inicio')
              }}
              style={{
                flex: '0 0 54px',
                minHeight: '120px',
                borderRadius: '8px',
                border: '1px dashed #90caf9',
                background: '#0d47a1',
                color: 'white',
                fontSize: '30px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Ingresar módulo por calle acopio"
            >
              +
            </button>
          )}
          {datos
            .filter((x) => x.linea === linea)
            .filter((x) => x.serie)
            .map((pos) => (
              <div
                key={`${pos.linea}-${pos.posicion}`}
                className={esSolicitudPruebaActiva(pos.solicitud_prueba) ? 'modulo-prueba-pendiente' : undefined}
                draggable={puedeMoverModulos && pos.serie ? true : false}
                onDragStart={() => puedeMoverModulos && pos.serie && setModuloEnDrag(pos)}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.opacity = '0.6'
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.opacity = '1'
                  detenerAutoScrollArrastre()
                  const idValido = typeof moduloEnDrag?.id === 'string' && moduloEnDrag.id !== 'null' && moduloEnDrag.id.trim() !== ''
                  const esMismo = moduloEnDrag?.id === pos.id
                  if (idValido && !esMismo) {
                    moverModulo(moduloEnDrag.id, linea, pos.posicion)
                  }
                  setModuloEnDrag(null)
                }}
                onDragEnd={() => {
                  detenerAutoScrollArrastre()
                  setModuloEnDrag(null)
                }}

                onClick={(e) => {
  e.stopPropagation()
  cerrarVentanasEmergentes()
  console.log('CLICK POSICION', pos)

  if (pos.serie) {

    setNombreSolicitante('')
    setRolSolicitante('')

    setModuloSeleccionado(pos)

    setSerieEditada(pos.serie)
    setTipoEditado(pos.tipo)
    setProyectoEditado(pos.proyecto)
    setResponsableEditado(pos.responsable || '')
    setEstadoEditado(pos.estado)
    setLineaEditada(pos.linea)
    setPosicionEditada(pos.posicion)
    setFechaPruebaEditada(fechaParaInput(pos.fecha_prueba_electrica))
    setNotaEditada(pos.nota || '')

    if (['electrico', 'visor', 'analista', 'operador', 'admin'].includes(perfil?.rol)) {
      cargarMaterialesModulo(pos.id)
    }

    if (esSolicitudPruebaActiva(pos.solicitud_prueba)) {
      cargarNombreSolicitante(pos.solicitado_por, pos.id)
    }

  } else {

    console.log('POSICION VACIA')

    if (puedeAgregarModulos) {
      setPosicionSeleccionada(pos)
      setMostrarNuevoModulo(true)
    }

  }
}}
                style={{
                  width: '150px',
                  minHeight: '120px',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: puedeMoverModulos && pos.serie ? 'grab' : 'pointer',
                  backgroundColor: pos.estado
                    ? colorEstado(pos.estado, pos)
                    : '#222',
                  color: 'white',
                  boxSizing: 'border-box',
                  flex: '0 0 150px',
                  transition: 'opacity 0.2s',
                }}
              >
                {pos.serie ? (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <strong>{pos.serie}</strong>

                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                        {pos.observacion_alerta && (
                          <span
                            title="Ver observación"
                            onClick={(e) => {
                              e.stopPropagation()
                              mostrarObservacionAlerta(pos)
                            }}
                            style={{
                              fontSize: '18px',
                              cursor: 'pointer',
                              lineHeight: 1,
                            }}
                          >
                            🚨
                          </span>
                        )}

                        {pos.nota && (
                          <span
                            title="Este módulo tiene una nota"
                            style={{
                              fontSize: '18px',
                              lineHeight: 1,
                            }}
                          >
                            💬
                          </span>
                        )}
                      </span>
                    </div>
                    <div>{pos.tipo}</div>
                    <div>{pos.proyecto}</div>
                    <div>{pos.estado}</div>
                  </>
                ) : (
                  <div>Vacío</div>
                )}
              </div>
            ))}
          {puedeAgregarModulos && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                abrirIngresoModuloEnExtremo(linea, 'fin')
              }}
              style={{
                flex: '0 0 54px',
                minHeight: '120px',
                borderRadius: '8px',
                border: '1px dashed #90caf9',
                background: '#0d47a1',
                color: 'white',
                fontSize: '30px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Ingresar módulo por calle agua"
            >
              +
            </button>
          )}
        </div>
      </div>
    ))}
  </div>
)}
      

      {esSolicitudPruebaActiva(moduloSeleccionado?.solicitud_prueba) && puedeResolverPrueba && (
        <div
          onClick={cerrarPanelesFlotantes}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'calc(100vw - 32px)',
            maxWidth: '380px',
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto',
            boxSizing: 'border-box',
            background: '#222',
            padding: '20px',
            border: '2px solid orange',
            borderRadius: '10px',
            zIndex: 1100,
            color: 'white',
          }}
        >
          <h2 style={{ marginTop: 0 }}>⚠ PRUEBA ELÉCTRICA SOLICITADA</h2>
          <p style={{ marginBottom: '8px' }}>
            <strong>Módulo:</strong> {moduloSeleccionado.serie}
          </p>
          <p style={{ marginBottom: '20px' }}>
            <strong>Solicitado por:</strong>{' '}
            {nombreSolicitante || 'Cargando...'}
            {rolSolicitante && ` (${rolSolicitante})`}
          </p>

          {puedeFinalizarModulos && (
            <button
              onClick={abrirResumenMateriales}
              style={{ width: '100%', marginBottom: '10px', padding: '12px' }}
            >
              Resumen materiales
            </button>
          )}

          {puedeUsarProtocolo && (
            <button
              onClick={abrirProtocoloEntrega}
              style={{ width: '100%', marginBottom: '10px', padding: '12px' }}
            >
              Protocolo de entrega
            </button>
          )}

          <button
            onClick={aprobarPruebaElectrica}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2e7d32',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ✔ Aprobar prueba
          </button>

          <button
            onClick={rechazarPruebaElectrica}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '12px',
              backgroundColor: '#c62828',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ✖ Rechazar solicitud
          </button>

          <button
            onClick={limpiarEstadosModal}
            style={{ width: '100%', marginTop: '10px', padding: '12px' }}
          >
            Cerrar
          </button>
        </div>
      )}

      {moduloSeleccionado &&
       !(esSolicitudPruebaActiva(moduloSeleccionado.solicitud_prueba) && puedeResolverPrueba) && (
  <div
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#222',
      padding: '20px',
      borderRadius: '10px',
      border: '1px solid white',
      width: 'calc(100vw - 32px)',
      maxWidth: '420px',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
      zIndex: 1000,
      color: 'white',
    }}
  >
    <div style={{ marginBottom: '16px' }}>
      <h2 style={{ margin: '0 0 12px' }}>Módulo</h2>
      {puedeVerMenuModulo && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <button
              type="button"
              aria-label="Opciones del módulo"
              onClick={(e) => {
                e.stopPropagation()
                setMostrarMenuModulo((actual) => !actual)
              }}
              style={{
                width: '44px',
                height: '44px',
                background: 'transparent',
                color: 'white',
                padding: '4px',
                border: 'none',
                cursor: 'pointer',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Opciones del módulo"
            >
              <svg
                viewBox="0 0 64 64"
                width="34"
                height="34"
                aria-hidden="true"
                focusable="false"
              >
                <line x1="16" y1="8" x2="16" y2="56" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
                <circle cx="16" cy="42" r="9" fill="currentColor" />
                <line x1="32" y1="8" x2="32" y2="56" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
                <circle cx="32" cy="20" r="9" fill="currentColor" />
                <line x1="48" y1="8" x2="48" y2="56" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
                <circle cx="48" cy="34" r="9" fill="currentColor" />
              </svg>
            </button>

            {mostrarMenuModulo && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 'calc(100% + 6px)',
                  width: '170px',
                  background: '#111',
                  border: '1px solid #555',
                  borderRadius: '8px',
                  padding: '6px',
                  boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
                  zIndex: 1200,
                  boxSizing: 'border-box',
                }}
              >
                {perfil?.rol === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarMenuModulo(false)
                      eliminarModuloSinRegistro()
                    }}
                    style={{
                      width: '100%',
                      background: '#5d4037',
                      color: 'white',
                      padding: '10px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 700,
                      marginBottom: '6px',
                    }}
                  >
                    Eliminar módulo
                  </button>
                )}

                <button
                  type="button"
                  onClick={abrirEditorMateriales}
                  style={{
                    width: '100%',
                    background: '#455a64',
                    color: 'white',
                    padding: '10px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: 700,
                    marginBottom: '6px',
                  }}
                >
                  Materiales 📝
                </button>

                <button
                  type="button"
                  disabled={
                    esEstadoPruebaElectrica(moduloSeleccionado?.estado) ||
                    esSolicitudPruebaActiva(moduloSeleccionado?.solicitud_prueba)
                  }
                  onClick={() => {
                    setMostrarMenuModulo(false)
                    solicitarPruebaElectrica()
                  }}
                  style={{
                    width: '100%',
                    background: '#1976d2',
                    color: 'white',
                    padding: '10px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor:
                      esEstadoPruebaElectrica(moduloSeleccionado?.estado) ||
                      esSolicitudPruebaActiva(moduloSeleccionado?.solicitud_prueba)
                        ? 'not-allowed'
                        : 'pointer',
                    textAlign: 'left',
                    fontWeight: 700,
                    opacity:
                      esEstadoPruebaElectrica(moduloSeleccionado?.estado) ||
                      esSolicitudPruebaActiva(moduloSeleccionado?.solicitud_prueba)
                        ? 0.65
                        : 1,
                    marginBottom: puedeDejarObservacionAlerta ? '6px' : 0,
                  }}
                >
                  Llamar a prueba eléctrica ⚡
                </button>

                {puedeDejarObservacionAlerta && (
                  <button
                    type="button"
                    onClick={dejarObservacionAlerta}
                    style={{
                      width: '100%',
                      background: '#b71c1c',
                      color: 'white',
                      padding: '10px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 700,
                    }}
                  >
                    Dejar observación 🚨
                  </button>
                )}
              </div>
            )}
          </div>

          {puedeFinalizarModulos && (
            <button
              onClick={finalizarModulo}
              style={{
                background: '#d32f2f',
                color: 'white',
                padding: '10px 14px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                flex: '0 0 180px',
                maxWidth: '55%',
              }}
            >
              Finalizar módulo
            </button>
          )}
        </div>
      )}
    </div>

    {perfil?.rol === 'electrico' ? (
      <>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: '10px 18px',
            textAlign: 'left',
            marginBottom: '12px',
          }}
        >
          <div><strong>Serie:</strong> {serieEditada}</div>
          <div><strong>Tipo:</strong> {tipoEditado}</div>
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>Proyecto:</strong> {proyectoEditado}
          </div>
        </div>

        <div style={{ marginBottom: '12px', textAlign: 'left' }}>
          <strong>Nota:</strong>
          <textarea
            value={notaEditada}
            onChange={(e) => setNotaEditada(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              marginTop: '5px',
              padding: '8px',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <FormularioElectrico
          valores={formulariosElectricos[moduloSeleccionado?.id] || {}}
          onChange={actualizarMaterialFormulario}
        />
      </>
    ) : (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: '10px',
          textAlign: 'left',
        }}
      >
        <div style={{ marginBottom: '10px' }}>
          <strong>Serie</strong>
          <input
            value={serieEditada}
            onChange={(e) => setSerieEditada(e.target.value)}
            disabled={!puedeEditarDatosModulo}
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Tipo</strong>
          <input
            value={tipoEditado}
            onChange={(e) => setTipoEditado(e.target.value)}
            disabled={!puedeEditarDatosModulo}
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '10px', gridColumn: '1 / -1' }}>
          <strong>Proyecto</strong>
          <input
            value={proyectoEditado}
            onChange={(e) => setProyectoEditado(e.target.value)}
            disabled={!puedeEditarDatosModulo}
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <strong style={{ whiteSpace: 'nowrap' }}>Línea</strong>

          <select
            value={lineaEditada}
            onChange={(e) => setLineaEditada(Number(e.target.value))}
            disabled={!puedeEditarDatosModulo}
            style={{
              width: '64px',
              padding: '8px',
              boxSizing: 'border-box',
            }}
          >
            {[1,2,3,4,5,6,7,8,9].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <strong style={{ whiteSpace: 'nowrap' }}>Estado</strong>

          <select
            value={estadoEditado}
            onChange={(e) => setEstadoEditado(e.target.value)}
            disabled={!puedeEditarDatosModulo}
            style={{
              width: '170px',
              maxWidth: 'calc(100% - 62px)',
              padding: '8px',
              boxSizing: 'border-box',
            }}
          >
            <option value="Sin iniciar">Sin iniciar</option>
            <option value="Canalizado">Canalizado</option>
            <option value="Cableado">Cableado</option>
            <option value="Terminaciones">Terminaciones</option>
            <option value="Prueba eléctrica">Prueba eléctrica</option>
            {(esTipoBodega(tipoEditado) || estadoEditado === 'Sin instalación') && (
              <option value="Sin instalación">Sin instalación</option>
            )}
            <option value="En garantía">En garantía</option>
          </select>
        </div>

        {estadoEditado === 'En garantía' && (
          <div style={{ gridColumn: '1 / -1', marginBottom: '10px', textAlign: 'left' }}>
            <strong>Fecha prueba eléctrica</strong>
            <input
              type="date"
              value={fechaPruebaEditada}
              onChange={(e) => setFechaPruebaEditada(e.target.value)}
              disabled={!puedeEditarDatosModulo}
              style={{
                width: '190px',
                maxWidth: '100%',
                padding: '8px',
                marginLeft: '8px',
                boxSizing: 'border-box',
              }}
            />
            {fechaPruebaEditada && !estaDentroDeGarantia(fechaPruebaEditada) && (
              <div style={{ color: '#ff8a80', fontWeight: 800, marginTop: '6px' }}>
                Fuera de garantía
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '10px', gridColumn: '1 / -1' }}>
          <strong>Responsable</strong>
          <input
            value={responsableEditado}
            onChange={(e) => setResponsableEditado(e.target.value)}
            disabled={!puedeEditarDatosModulo}
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '5px', gridColumn: '1 / -1' }}>
          <strong>Nota</strong>
          <textarea
            value={notaEditada}
            onChange={(e) => setNotaEditada(e.target.value)}
            rows={2}
            style={{ width: '100%', marginTop: '5px', padding: '8px', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
      </div>
    )}

    {false && perfil?.rol !== 'electrico' && !['admin', 'operador'].includes(perfil?.rol) && (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: '10px',
          textAlign: 'left',
          marginTop: '10px',
        }}
      >
        <div style={{ marginBottom: '10px', gridColumn: '1 / -1' }}>
          <strong>Estado</strong>

          <select
            value={estadoEditado}
            onChange={(e) => setEstadoEditado(e.target.value)}
            disabled={esRolSoloLectura}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '5px',
            }}
          >
            <option value="Sin iniciar">Sin iniciar</option>
            <option value="Canalizado">Canalizado</option>
            <option value="Cableado">Cableado</option>
            <option value="Terminaciones">Terminaciones</option>
            <option value="Prueba eléctrica">Prueba eléctrica</option>
            {(esTipoBodega(tipoEditado) || estadoEditado === 'Sin instalación') && (
              <option value="Sin instalación">Sin instalación</option>
            )}
            <option value="En garantía">En garantía</option>
          </select>
        </div>

        {estadoEditado === 'En garantía' && (
          <div style={{ marginBottom: '10px', gridColumn: '1 / -1' }}>
            <strong>Fecha prueba eléctrica</strong>
            <input
              type="date"
              value={fechaPruebaEditada}
              onChange={(e) => setFechaPruebaEditada(e.target.value)}
              disabled={esRolSoloLectura}
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '5px',
              }}
            />
            {fechaPruebaEditada && !estaDentroDeGarantia(fechaPruebaEditada) && (
              <div style={{ color: '#ff8a80', fontWeight: 800, marginTop: '6px' }}>
                Fuera de garantía
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '10px' }}>
          <strong>Línea</strong>

          <select
            value={lineaEditada}
            onChange={(e) => setLineaEditada(Number(e.target.value))}
            disabled={esRolSoloLectura}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '5px',
            }}
          >
            {[1,2,3,4,5,6,7,8,9].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

      </div>
    )}

    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      <button
        onClick={guardarCambios}
        style={{
          padding: '10px',
          flex: 1,
        }}
      >
        {puedeEditarDatosModulo ? 'Guardar cambios' : 'Guardar nota'}
      </button>

       {['electrico', 'operador'].includes(perfil?.rol) && (
  esEstadoPruebaElectrica(moduloSeleccionado?.estado) ? (
    <button
      disabled
      style={{
        backgroundColor: '#388e3c',
        color: 'white',
        padding: '10px',
        flex: 1,
        opacity: 0.75,
        cursor: 'not-allowed',
      }}
    >
      ✓ Prueba eléctrica aprobada
    </button>
  ) : esSolicitudPruebaActiva(moduloSeleccionado?.solicitud_prueba) ? (
    <button
      onClick={cancelarSolicitudPruebaElectrica}
      style={{
        backgroundColor: '#ff9800',
        color: 'white',
        padding: '10px',
        flex: 1,
        cursor: 'pointer',
      }}
    >
      <span style={{ display: 'block' }}>🟡 Esperando aprobación</span>
      <small style={{ display: 'block', marginTop: '3px' }}>
        (presione para cancelar)
      </small>
    </button>
  ) : (
    <button
      onClick={solicitarPruebaElectrica}
      style={{
        backgroundColor: '#1976d2',
        color: 'white',
        padding: '10px',
        flex: 1,
      }}
    >
      ⚡ Solicitar Prueba Eléctrica
    </button>
  )
)}
      {['visor', 'analista', 'operador', 'admin'].includes(perfil?.rol) && (
        <button
          onClick={abrirResumenMateriales}
          style={{ padding: '10px', flex: 1 }}
        >
          Resumen materiales
        </button>
      )}
      {puedeUsarProtocolo && (
        <button
          onClick={abrirProtocoloEntrega}
          style={{ padding: '10px', flex: 1 }}
        >
          Protocolo
        </button>
      )}
      <button
        onClick={limpiarEstadosModal}
        style={{
          padding: '10px',
          flex: 1,
        }}
      >
        Cerrar
      </button>
    </div>
  </div>
)}

{mostrarResumenMateriales && moduloSeleccionado && (
  <div
    onClick={cerrarPanelesFlotantes}
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'calc(100vw - 32px)',
      maxWidth: '420px',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
      padding: '20px',
      background: '#222',
      border: '1px solid white',
      borderRadius: '10px',
      zIndex: 1200,
      color: 'white',
      textAlign: 'left',
    }}
  >
    <h2 style={{ marginTop: 0 }}>Materiales — {moduloSeleccionado.serie}</h2>

    {cargandoMateriales ? (
      <p>Cargando...</p>
    ) : resumenMateriales.length === 0 ? (
      <p>No hay materiales registrados.</p>
    ) : (
      <div style={{ display: 'grid', gap: '8px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 64px 76px',
            gap: '7px',
            fontSize: '12px',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          <span />
          <span>Nuevo</span>
          <span>Reutilizado</span>
        </div>

        {resumenMateriales.map(([material, nuevo, reutilizado]) => (
          <div
            key={material}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 64px 76px',
              gap: '7px',
              paddingBottom: '8px',
              borderBottom: '1px solid #444',
              alignItems: 'center',
            }}
          >
            <span>{material}</span>
            <strong style={{ textAlign: 'center' }}>{nuevo || '—'}</strong>
            <strong style={{ textAlign: 'center' }}>{reutilizado || '—'}</strong>
          </div>
        ))}
      </div>
    )}

    <button
      onClick={() => setMostrarResumenMateriales(false)}
      style={{ width: '100%', marginTop: '18px', padding: '12px' }}
    >
      Cerrar
    </button>
  </div>
)}

{mostrarEditorMateriales && moduloSeleccionado && puedeVerMenuModulo && (
  <div
    onClick={cerrarPanelesFlotantes}
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'calc(100vw - 32px)',
      maxWidth: '460px',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
      padding: '20px',
      background: '#222',
      border: '1px solid white',
      borderRadius: '10px',
      zIndex: 1200,
      color: 'white',
      textAlign: 'left',
    }}
  >
    <h2 style={{ marginTop: 0 }}>Materiales 📝 — {moduloSeleccionado.serie}</h2>

    {cargandoMateriales ? (
      <p>Cargando...</p>
    ) : (
      <FormularioElectrico
        valores={formulariosElectricos[moduloSeleccionado?.id] || {}}
        onChange={actualizarMaterialFormulario}
      />
    )}

    <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
      <button
        type="button"
        onClick={guardarMaterialesModulo}
        disabled={cargandoMateriales}
        style={{
          flex: 1,
          padding: '12px',
          background: '#2e7d32',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: cargandoMateriales ? 'not-allowed' : 'pointer',
        }}
      >
        Guardar materiales
      </button>

      <button
        type="button"
        onClick={() => cerrarEditorMateriales()}
        style={{
          flex: 1,
          padding: '12px',
        }}
      >
        Cerrar
      </button>
    </div>
  </div>
)}

{mostrarProtocolosMensuales && puedeVerProtocolosMensuales && (
  <div
    onClick={cerrarPanelesFlotantes}
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'calc(100vw - 24px)',
      maxWidth: '1180px',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
      padding: '20px',
      background: '#222',
      border: '1px solid white',
      borderRadius: '10px',
      zIndex: 1300,
      color: 'white',
      textAlign: 'left',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <h2 style={{ margin: 0 }}>Protocolos mensuales</h2>
      <div style={{ display: 'grid', gap: '8px', minWidth: '150px' }}>
        <button
          type="button"
          onClick={() => setMostrarProtocolosMensuales(false)}
          style={{
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid #777',
            background: '#555',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={abrirIngresoManualProtocolo}
          style={{
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid #66bb6a',
            background: '#1b5e20',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Ingreso manual
        </button>
      </div>
    </div>

    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        marginBottom: '16px',
        borderRadius: '10px',
        background: '#1b5e20',
        border: '1px solid #66bb6a',
        color: 'white',
        fontWeight: 800,
        fontSize: '18px',
      }}
    >
      <span>💰 ingresos</span>
      <span>{formatearPrecioMaterial(ingresosProtocolosMensuales)}</span>
    </div>

    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
      <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <select
          value={rangoProtocolosMensuales}
          onChange={(e) => {
            const nuevoRango = e.target.value
            setRangoProtocolosMensuales(nuevoRango)
            setFechaProtocolosMensuales(obtenerValorInicialRangoProtocolo(nuevoRango))
          }}
          style={{ padding: '8px', fontWeight: 700 }}
          title="Cambiar rango"
        >
          <option value="dia">Dia</option>
          <option value="semana">Semana</option>
          <option value="mes">Mes</option>
        </select>
        <input
          type={rangoProtocolosMensuales === 'dia' ? 'date' : rangoProtocolosMensuales === 'semana' ? 'week' : 'month'}
          value={fechaProtocolosMensuales}
          onChange={(e) => setFechaProtocolosMensuales(e.target.value)}
          style={{ padding: '8px' }}
        />
      </label>
      <button
        type="button"
        onClick={() => cargarProtocolosMensuales(fechaProtocolosMensuales, rangoProtocolosMensuales)}
        disabled={cargandoProtocolosMensuales}
        style={{
          padding: '9px 14px',
          borderRadius: '8px',
          border: '1px solid #777',
          background: '#1565c0',
          color: 'white',
          cursor: cargandoProtocolosMensuales ? 'not-allowed' : 'pointer',
          fontWeight: 700,
        }}
      >
        {cargandoProtocolosMensuales ? 'Cargando...' : 'Actualizar'}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="search"
          value={busquedaProtocolosMensuales}
          onChange={(e) => setBusquedaProtocolosMensuales(e.target.value)}
          placeholder="Buscar serie o ID OT"
          style={{
            padding: '9px 10px',
            minWidth: '210px',
            borderRadius: '6px',
            border: '1px solid #777',
            background: '#333',
            color: 'white',
            fontWeight: 700,
          }}
        />
        {busquedaProtocolosMensuales && (
          <button
            type="button"
            onClick={() => setBusquedaProtocolosMensuales('')}
            title="Limpiar búsqueda"
            style={{
              padding: '9px 11px',
              borderRadius: '6px',
              border: '1px solid #777',
              background: '#444',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            ×
          </button>
        )}
      </div>
      <span style={{ color: '#ddd', fontWeight: 700 }}>
        {busquedaProtocolosMensuales
          ? `${protocolosMensualesFiltrados.length} de ${protocolosMensuales.length} resultados`
          : `${protocolosMensuales.length} resultados`}
      </span>
    </div>

    {protocolosMensuales.length === 0 && !cargandoProtocolosMensuales ? (
      <p style={{ color: '#ccc' }}>No hay protocolos con fecha de prueba electrica en el rango seleccionado.</p>
    ) : protocolosMensualesFiltrados.length === 0 && !cargandoProtocolosMensuales ? (
      <p style={{ color: '#ccc' }}>No hay resultados para la búsqueda indicada.</p>
    ) : (
      <div style={{ overflowX: 'auto', paddingLeft: puedeEliminarProtocolosMensuales ? '38px' : 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
          <thead>
            <tr style={{ background: '#333' }}>
              {encabezadosProtocolosMensuales.map((encabezado) => (
                <th key={encabezado.clave} style={{ padding: '8px 10px', border: '1px solid #555', textAlign: encabezado.align || 'left', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                  {encabezado.lineas.map((linea) => (
                    <span key={linea} style={{ display: 'block' }}>{linea}</span>
                  ))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {protocolosMensualesFiltrados.map((registro) => {
              const claveRegistro = `${registro.origen}-${registro.id}`
              const claveUnica = claveProtocoloUnico(registro.serie, registro.fecha_prueba_electrica)
              const estaDuplicado = claveUnica && conteoClavesProtocolos[claveUnica] > 1
              return (
                <tr key={claveRegistro} style={{ background: estaDuplicado ? 'rgba(255, 152, 0, 0.16)' : 'transparent' }}>
                  <td style={{ padding: '8px', border: '1px solid #444', textAlign: 'center', position: 'relative', overflow: 'visible' }}>
                    {puedeEliminarProtocolosMensuales && (
                      <button
                        type="button"
                        onClick={() => eliminarProtocoloMensual(registro)}
                        title="Eliminar protocolo"
                        style={{
                          position: 'absolute',
                          left: '-34px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '28px',
                          height: '28px',
                          display: 'grid',
                          placeItems: 'center',
                          background: '#050505',
                          border: '1px solid #777',
                          borderRadius: '4px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '18px',
                          lineHeight: 1,
                          zIndex: 2,
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none">
                          <path d="M9 4h6l1 2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M4 6h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M7 9l1 11h8l1-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => abrirProtocoloDesdeBusqueda(registro)}
                      title="Ver protocolo"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '24px',
                      }}
                    >
                      📜
                    </button>
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #444', fontWeight: 700 }}>
                    {registro.serie}
                    {estaDuplicado && (
                      <div style={{ color: '#ffb74d', fontSize: '11px', marginTop: '2px' }}>
                        Duplicado
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #444' }}>
                    {registro.fecha_prueba_electrica ? formatearFecha(registro.fecha_prueba_electrica) : '-'}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #444' }}>{registro.tipo || '-'}</td>
                  <td style={{ padding: '8px', border: '1px solid #444', textAlign: 'right' }}>
                    <BotonValorCobro registro={registro} tipo="mantencion">
                      {formatearPrecioMaterial(registro.valorMantencion)}
                      {registro.tieneAjusteValorizacion ? ' *' : ''}
                    </BotonValorCobro>
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #444', textAlign: 'right' }}>
                    <BotonValorCobro registro={registro} tipo="modificacion">
                      {formatearPrecioMaterial(registro.valorModificacion)}
                      {registro.tieneAjusteValorizacion ? ' *' : ''}
                    </BotonValorCobro>
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #444', textAlign: 'right', fontWeight: 800 }}>
                    <BotonValorCobro registro={registro} tipo="total" destacado>
                      {formatearPrecioMaterial(registro.valorTotal)}
                      {registro.tieneAjusteValorizacion ? ' *' : ''}
                    </BotonValorCobro>
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #444' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {idOtEnEdicion === claveRegistro ? (
                        <div style={{ display: 'grid', gap: '4px' }}>
                          {idsOtEnEdicion.map((valorOt, indiceOt) => (
                            <input
                              key={indiceOt}
                              type="text"
                              value={valorOt}
                              placeholder={`OT ${indiceOt + 1}`}
                              onChange={(e) => {
                                const nuevosValores = [...idsOtEnEdicion]
                                nuevosValores[indiceOt] = e.target.value
                                setIdsOtEnEdicion(nuevosValores)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') guardarIdOtProtocoloMensual(registro, unirIdsOt(idsOtEnEdicion))
                              }}
                              style={{
                                width: '92px',
                                padding: '6px',
                                background: 'white',
                                color: '#111',
                                border: '1px solid #777',
                                borderRadius: '6px',
                                font: 'inherit',
                                fontWeight: 700,
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minWidth: '98px' }}>
                          {separarIdsOt(registro.idOt).filter(Boolean).length > 0 ? (
                            separarIdsOt(registro.idOt).filter(Boolean).map((valorOt, indiceOt) => (
                              <span
                                key={`${valorOt}-${indiceOt}`}
                                style={{
                                  padding: '3px 7px',
                                  borderRadius: '999px',
                                  background: '#263238',
                                  border: '1px solid #546e7a',
                                  color: 'white',
                                  fontWeight: 700,
                                  fontSize: '13px',
                                }}
                              >
                                {valorOt}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: '#aaa', fontWeight: 700 }}>-</span>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (idOtEnEdicion === claveRegistro) {
                            guardarIdOtProtocoloMensual(registro, unirIdsOt(idsOtEnEdicion))
                          } else {
                            setIdsOtEnEdicion(separarIdsOt(registro.idOt))
                            setIdOtEnEdicion(claveRegistro)
                          }
                        }}
                        title={idOtEnEdicion === claveRegistro ? 'Guardar ID OT' : 'Editar ID OT'}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          border: idOtEnEdicion === claveRegistro ? '1px solid #66bb6a' : '1px solid #555',
                          background: idOtEnEdicion === claveRegistro ? '#2e7d32' : 'transparent',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        {idOtEnEdicion === claveRegistro ? '✓' : '✏️'}
                      </button>
                    </div>
                  </td>
                  {false && (
                  <td style={{ padding: '8px', border: '1px solid #444', textAlign: 'center' }}>
                    {puedeEliminarProtocolosMensuales && registro.origen !== 'actual' ? (
                      <button
                        type="button"
                        onClick={() => eliminarProtocoloMensual(registro)}
                        title="Eliminar protocolo"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ff8a80',
                          cursor: 'pointer',
                          fontSize: '20px',
                        }}
                      >
                        🗑️
                      </button>
                    ) : (
                      <span title={registro.origen === 'actual' ? 'Módulo activo: no se elimina desde esta vista' : 'Sin permiso para eliminar'} style={{ color: '#777' }}>
                        —
                      </span>
                    )}
                  </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )}

  </div>
)}

{mostrarPreciosMateriales && puedeVerPreciosMateriales && (
  <div
    onClick={cerrarPanelesFlotantes}
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'calc(100vw - 32px)',
      maxWidth: '520px',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
      padding: '20px',
      background: '#222',
      border: '1px solid white',
      borderRadius: '10px',
      zIndex: 1300,
      color: 'white',
      textAlign: 'left',
    }}
  >
    <h2 style={{ marginTop: 0 }}>Precios materiales</h2>
    <p style={{ marginTop: 0, color: '#ccc' }}>
      {puedeEditarPreciosMateriales
        ? 'Estos precios quedan como catálogo global para cálculos futuros.'
        : 'Consulta de precios de materiales.'}
    </p>

    {cargandoPreciosMateriales ? (
      <p>Cargando precios...</p>
    ) : (
      <div style={{ display: 'grid', gap: '8px' }}>
        {seccionesCatalogoPrecios.map((seccion, index) => (
          <details
            key={seccion}
            defaultOpen={index === 0}
            style={{ border: '1px solid #555', borderRadius: '8px', overflow: 'hidden' }}
          >
            <summary
              style={{
                padding: '10px 12px',
                background: '#333',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {seccion}
            </summary>

            <div style={{ padding: '8px 10px' }}>
              {catalogoPreciosProtocolo
                .filter((item) => item.seccion === seccion)
                .map((item) => (
                <div
                  key={item.material}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: puedeEditarPreciosMateriales
                      ? '72px minmax(0, 1fr) 120px 42px'
                      : '72px minmax(0, 1fr) 120px',
                    gap: '10px',
                    alignItems: 'center',
                    padding: '7px 0',
                    borderBottom: '1px solid #444',
                  }}
                >
                  <strong style={{ color: '#bbb', fontSize: '13px' }}>
                    {item.idArt}
                  </strong>
                  <span style={{ lineHeight: 1.2 }}>{item.material}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatearPrecioMaterial(preciosMateriales[item.material])}
                    onChange={(e) => actualizarPrecioMaterial(item.material, e.target.value)}
                    disabled={!puedeEditarPreciosMateriales || precioMaterialEnEdicion !== item.material}
                    placeholder="$ 0"
                    style={{
                      width: '100%',
                      padding: '8px',
                      boxSizing: 'border-box',
                      textAlign: 'right',
                      opacity: puedeEditarPreciosMateriales ? 1 : 0.8,
                      background: precioMaterialEnEdicion === item.material ? 'white' : '#ddd',
                      color: '#111',
                    }}
                  />
                  {puedeEditarPreciosMateriales && (
                    <button
                      type="button"
                      onClick={() => setPrecioMaterialEnEdicion((actual) => (
                        actual === item.material ? null : item.material
                      ))}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        border: '1px solid #777',
                        background: precioMaterialEnEdicion === item.material ? '#fbc02d' : '#333',
                        color: precioMaterialEnEdicion === item.material ? '#111' : 'white',
                        cursor: 'pointer',
                        fontSize: '18px',
                      }}
                      title="Editar precio"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    )}

    <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
      {puedeEditarPreciosMateriales && (
        <button
          type="button"
          onClick={guardarPreciosMateriales}
          disabled={cargandoPreciosMateriales || guardandoPreciosMateriales}
          style={{
            flex: 1,
            padding: '12px',
            background: '#2e7d32',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: cargandoPreciosMateriales || guardandoPreciosMateriales ? 'not-allowed' : 'pointer',
          }}
        >
          {guardandoPreciosMateriales ? 'Guardando...' : 'Guardar precios'}
        </button>
      )}

      <button
        type="button"
        onClick={() => setMostrarPreciosMateriales(false)}
        style={{ flex: 1, padding: '12px' }}
      >
        Cerrar
      </button>
    </div>
  </div>
)}

{detalleCobroSeleccionado && (
  <div
    onClick={cerrarPanelesFlotantes}
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'calc(100vw - 32px)',
      maxWidth: '560px',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
      padding: '18px',
      background: '#222',
      border: '1px solid white',
      borderRadius: '10px',
      zIndex: 1500,
      color: 'white',
      textAlign: 'left',
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', marginBottom: '12px' }}>
      <div>
        <h3 style={{ margin: 0 }}>Detalle de cobro</h3>
        <div style={{ color: '#ccc', marginTop: '4px' }}>
          Serie: {detalleCobroSeleccionado.serie || '-'}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDetalleCobroSeleccionado(null)}
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #777',
          background: '#555',
          color: 'white',
          cursor: 'pointer',
        }}
      >
        Cerrar
      </button>
    </div>

    {detalleCobroSeleccionado.lineas.length === 0 ? (
      <p style={{ color: '#ccc' }}>No hay cobros asociados a este valor.</p>
    ) : (
      <div style={{ display: 'grid', gap: '8px' }}>
        {detalleCobroSeleccionado.lineas.map((item, index) => (
          <div
            key={`${item.material}-${index}`}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: '8px',
              padding: '10px',
              border: '1px solid #444',
              borderRadius: '8px',
              background: '#2b2b2b',
            }}
          >
            <div>
              <div style={{ fontWeight: 800 }}>{item.material}</div>
              <div style={{ color: '#ccc', fontSize: '13px', marginTop: '3px' }}>
                {item.cantidad} x {formatearPrecioMaterial(item.precioUnitario)}
                {item.tipoCantidad ? ` · ${item.tipoCantidad}` : ''}
                {item.materialPrecio && item.materialPrecio !== item.material ? ` · precio: ${item.materialPrecio}` : ''}
              </div>
            </div>
            <div style={{ display: 'grid', gap: '6px', justifyItems: 'end' }}>
              <div style={{ fontWeight: 800, textAlign: 'right' }}>
                {formatearPrecioMaterial(item.subtotal)}
              </div>
              {item.ajusteValorizacionItem && (
                <div style={{ color: '#ffcc80', fontSize: '12px', textAlign: 'right' }}>
                  Ajustado{item.subtotalOriginal !== undefined ? ` desde ${formatearPrecioMaterial(item.subtotalOriginal)}` : ''}
                </div>
              )}
              {puedeAjustarValoresProtocolos && (
                <button
                  type="button"
                  onClick={() => setAjusteCobroMensual({
                    itemKey: item.claveAjuste || claveItemCobro(item.tipoCobro || detalleCobroSeleccionado.tipo, item),
                    itemLabel: item.material,
                    tipoCobro: item.tipoCobro || detalleCobroSeleccionado.tipo,
                    valor: String(item.subtotal ?? 0),
                    motivo: item.ajusteValorizacionItem?.motivo || '',
                  })}
                  title="Modificar este cobro"
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    border: '1px solid #777',
                    background: '#333',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  ✏️
                </button>
              )}
            </div>
            {ajusteCobroMensual.itemKey === (item.claveAjuste || claveItemCobro(item.tipoCobro || detalleCobroSeleccionado.tipo, item)) && (
              <div style={{ gridColumn: '1 / -1', display: 'grid', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #555' }}>
                <strong>Modificar: {item.material}</strong>
                <input
                  value={ajusteCobroMensual.valor}
                  onChange={(e) => setAjusteCobroMensual((actual) => ({ ...actual, valor: e.target.value }))}
                  inputMode="numeric"
                  placeholder="Nuevo valor"
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #777' }}
                />
                <textarea
                  value={ajusteCobroMensual.motivo}
                  onChange={(e) => setAjusteCobroMensual((actual) => ({ ...actual, motivo: e.target.value }))}
                  rows={2}
                  placeholder="Motivo de la modificación"
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #777', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={guardarAjusteValorizacionProtocolo}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #66bb6a', background: '#1b5e20', color: 'white', cursor: 'pointer', fontWeight: 800 }}
                  >
                    Guardar item
                  </button>
                  <button
                    type="button"
                    onClick={() => setAjusteCobroMensual({ itemKey: '', itemLabel: '', tipoCobro: '', valor: '', motivo: '' })}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #777', background: '#555', color: 'white', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    )}

    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '14px',
        paddingTop: '12px',
        borderTop: '1px solid #555',
        fontWeight: 900,
        fontSize: '18px',
      }}
    >
      <span>Total detalle</span>
      <span>{formatearPrecioMaterial(detalleCobroSeleccionado.total)}</span>
    </div>

    {false && puedeAjustarValoresProtocolos && (
      <div
        style={{
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid #555',
          display: 'grid',
          gap: '10px',
        }}
      >
        <div style={{ fontWeight: 900 }}>Modificar valorización</div>
        {detalleCobroSeleccionado.registro?.ajusteValorizacion?.motivo && (
          <div style={{ color: '#ffcc80', fontSize: '13px' }}>
            Ajuste actual: {detalleCobroSeleccionado.registro.ajusteValorizacion.motivo}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span>Valor mantención</span>
            <input
              value={ajusteCobroMensual.mantencion}
              onChange={(e) => setAjusteCobroMensual((actual) => ({ ...actual, mantencion: e.target.value }))}
              inputMode="numeric"
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #777' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span>Valor modificación</span>
            <input
              value={ajusteCobroMensual.modificacion}
              onChange={(e) => setAjusteCobroMensual((actual) => ({ ...actual, modificacion: e.target.value }))}
              inputMode="numeric"
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #777' }}
            />
          </label>
        </div>
        <label style={{ display: 'grid', gap: '4px' }}>
          <span>Motivo de la modificación</span>
          <textarea
            value={ajusteCobroMensual.motivo}
            onChange={(e) => setAjusteCobroMensual((actual) => ({ ...actual, motivo: e.target.value }))}
            rows={3}
            placeholder="Ej: se anula cobro por garantía / se agrega cobro adicional..."
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #777', resize: 'vertical' }}
          />
        </label>
        <button
          type="button"
          onClick={guardarAjusteValorizacionProtocolo}
          style={{
            justifySelf: 'start',
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid #66bb6a',
            background: '#1b5e20',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 800,
          }}
        >
          Guardar modificación
        </button>
      </div>
    )}
  </div>
)}

{mostrarProtocoloEntrega && moduloSeleccionado && (
  <ProtocoloEntrega
    key={`${protocoloManualMensual ? 'manual' : protocoloDesdeHistorial ? 'historial' : 'actual'}-${moduloSeleccionado.id}-${versionProtocoloEntrega}`}
    modulo={moduloSeleccionado}
    responsable={responsableProtocolo}
    datosIniciales={datosProtocoloEntrega}
    materiales={formulariosElectricos[moduloSeleccionado.id] || {}}
    onGuardar={guardarProtocoloEntrega}
    soloLectura={protocoloManualMensual ? false : protocoloSoloLecturaBusqueda || (protocoloDesdeHistorial ? perfil?.rol !== 'admin' : !puedeEditarDatosProtocolo)}
    materialesSoloLectura={protocoloManualMensual ? false : protocoloSoloLecturaBusqueda || (protocoloDesdeHistorial ? perfil?.rol !== 'admin' : !puedeEditarProtocolo)}
    moduloEditable={protocoloManualMensual}
    datosModuloEditables={perfil?.rol === 'admin' && !protocoloSoloLecturaBusqueda}
    onCerrar={() => {
      setMostrarProtocoloEntrega(false)
      setProtocoloSoloLecturaBusqueda(false)
      setProtocoloDesdeHistorial(false)
      setProtocoloManualMensual(false)
    }}
  />
)}

{mostrarReintegrar && puedeAgregarModulos && (
  <div
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#222',
      padding: '20px',
      borderRadius: '10px',
      border: '1px solid white',
      width: 'calc(100vw - 32px)',
      maxWidth: '430px',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
      zIndex: 3200,
      color: 'white',
      textAlign: 'left',
    }}
  >
    <h2 style={{ marginTop: 0 }}>Reintegrar módulo</h2>
    <p style={{ color: '#ccc', marginTop: 0 }}>
      Selecciona uno de los últimos finalizados o ingresa una serie.
    </p>

    <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
      {ultimosFinalizados.length === 0 ? (
        <p style={{ margin: 0 }}>No hay módulos finalizados recientes.</p>
      ) : (
        ultimosFinalizados.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => seleccionarHistorialParaReintegrar(item)}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: historialSeleccionadoReintegrar?.id === item.id ? '2px solid #64b5f6' : '1px solid #555',
              background: historialSeleccionadoReintegrar?.id === item.id ? '#0d47a1' : '#333',
              color: 'white',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <strong>{item.serie}</strong>
            <span style={{ display: 'block', color: '#ccc', fontSize: '12px', marginTop: '2px' }}>
              {item.tipo} · Salida {formatearFecha(item.fecha_salida) || 'sin fecha'}
            </span>
          </button>
        ))
      )}
    </div>

    <label style={{ display: 'block', marginBottom: '12px' }}>
      <strong>Serie</strong>
      <input
        value={serieReintegrar}
        onChange={(e) => {
          setSerieReintegrar(e.target.value)
          setHistorialSeleccionadoReintegrar(null)
        }}
        placeholder="Ingresar serie"
        style={{
          width: '100%',
          padding: '9px',
          marginTop: '5px',
          boxSizing: 'border-box',
        }}
      />
    </label>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
      <label>
        <strong>Línea</strong>
        <select
          value={lineaReintegrar}
          onChange={(e) => setLineaReintegrar(Number(e.target.value))}
          style={{ width: '100%', padding: '9px', marginTop: '5px' }}
        >
          {[1,2,3,4,5,6,7,8,9].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      <label>
        <strong>Ubicación</strong>
        <select
          value={extremoReintegrar}
          onChange={(e) => setExtremoReintegrar(e.target.value)}
          style={{ width: '100%', padding: '9px', marginTop: '5px' }}
        >
          <option value="inicio">Calle acopio</option>
          <option value="fin">Calle agua</option>
        </select>
      </label>
    </div>

    <div style={{ display: 'flex', gap: '10px' }}>
      <button
        type="button"
        onClick={reintegrarModuloFinalizado}
        disabled={reintegrandoModulo}
        style={{ flex: 1, padding: '12px', background: '#2e7d32', color: 'white' }}
      >
        {reintegrandoModulo ? 'Reintegrando...' : 'Reintegrar'}
      </button>
      <button
        type="button"
        onClick={() => setMostrarReintegrar(false)}
        style={{ flex: 1, padding: '12px' }}
      >
        Cerrar
      </button>
    </div>
  </div>
)}

{mostrarKPI && (
  <div className="kpi-grid">
    <div style={{ color: '#ccc' }}>KPIs próximos a implementarse</div>
  </div>
)}

{mostrarDescargaProtocolos && puedeDescargarProtocolosDiarios && (
  <div
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#222',
      padding: '20px',
      borderRadius: '10px',
      border: '1px solid white',
      width: 'calc(100vw - 32px)',
      maxWidth: '380px',
      boxSizing: 'border-box',
      zIndex: 3200,
      color: 'white',
      textAlign: 'left',
    }}
  >
    <h2 style={{ marginTop: 0 }}>Descargar protocolos diarios</h2>
    <p style={{ color: '#ccc', marginTop: 0 }}>
      Selecciona la fecha de prueba eléctrica.
    </p>

    <label style={{ display: 'block', marginBottom: '16px' }}>
      <strong>Fecha</strong>
      <input
        type="date"
        value={fechaProtocolosDiarios}
        onChange={(e) => setFechaProtocolosDiarios(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          marginTop: '6px',
          boxSizing: 'border-box',
        }}
      />
      <small style={{ display: 'block', color: '#bbb', marginTop: '5px' }}>
        Formato visual: dd-mm-aaaa
      </small>
    </label>

    <div style={{ display: 'flex', gap: '10px' }}>
      <button
        type="button"
        onClick={generarDescargaProtocolosDiarios}
        disabled={descargandoProtocolos}
        style={{ flex: 1, padding: '12px', background: '#2e7d32', color: 'white' }}
      >
        {descargandoProtocolos ? 'Generando...' : 'Descargar'}
      </button>
      <button
        type="button"
        onClick={() => setMostrarDescargaProtocolos(false)}
        style={{ flex: 1, padding: '12px' }}
      >
        Cerrar
      </button>
    </div>
  </div>
)}

{mostrarNuevoModulo && puedeAgregarModulos && (
  <div
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#222',
      padding: '20px',
      borderRadius: '10px',
      border: '1px solid white',
      width: '90vw',
      maxWidth: '360px',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxSizing: 'border-box',
      zIndex: 1000,
      color: 'white',
    }}
  >
    <h2>Nuevo módulo</h2>

    <p>
      <strong>Línea:</strong> {posicionSeleccionada?.linea}
    </p>

    <input
      placeholder="Serie"
      value={serieNueva}
      onChange={(e) => setSerieNueva(e.target.value)}
      disabled={creandoModulo}
      style={{
        width: '100%',
        padding: '8px',
        marginBottom: '10px',
        opacity: creandoModulo ? 0.7 : 1,
      }}
    />

    <input
      placeholder="Tipo"
      value={tipoNuevo}
      onChange={(e) => setTipoNuevo(e.target.value)}
      disabled={creandoModulo}
      style={{
        width: '100%',
        padding: '8px',
        marginBottom: '10px',
        opacity: creandoModulo ? 0.7 : 1,
      }}
    />

    <input
      placeholder="Proyecto"
      value={proyectoNuevo}
      onChange={(e) => setProyectoNuevo(e.target.value)}
      disabled={creandoModulo}
      style={{
        width: '100%',
        padding: '8px',
        marginBottom: '10px',
        opacity: creandoModulo ? 0.7 : 1,
      }}
    />

    <input
      placeholder="Responsable"
      value={responsableNuevo}
      onChange={(e) => setResponsableNuevo(e.target.value)}
      disabled={creandoModulo}
      style={{
        width: '100%',
        padding: '8px',
        marginBottom: '10px',
        opacity: creandoModulo ? 0.7 : 1,
      }}
    />

    {creandoModulo && (
      <div style={{ marginBottom: '10px', color: '#90caf9', fontWeight: 700 }}>
        Guardando módulo...
      </div>
    )}

    <div
      style={{
        display: 'flex',
        gap: '10px',
      }}
    >
      <button
        onClick={crearModulo}
        disabled={creandoModulo}
        style={{
          padding: '10px',
          flex: 1,
          opacity: creandoModulo ? 0.7 : 1,
          cursor: creandoModulo ? 'not-allowed' : 'pointer',
        }}
      >
        {creandoModulo ? 'Guardando...' : 'Guardar'}
      </button>

      <button
        onClick={() => {
          if (!creandoModulo) setMostrarNuevoModulo(false)
        }}
        disabled={creandoModulo}
        style={{
          padding: '10px',
          flex: 1,
          opacity: creandoModulo ? 0.7 : 1,
          cursor: creandoModulo ? 'not-allowed' : 'pointer',
        }}
      >
        Cancelar
      </button>
    </div>
  </div>
)}
    </>
  )
}

export default App
