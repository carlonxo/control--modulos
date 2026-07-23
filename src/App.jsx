import { useEffect, useRef, useState } from 'react'
import { supabase } from './services/supabase'
import { exportarHistorialExcel } from './services/exportarExcel'
import Notificacion from './components/Notificacion'
import Login from './components/Login'
import RegistroAcciones from './components/RegistroAcciones'
import ModalModulo from './components/ModalModulo'
import EncabezadoModalModulo from './components/EncabezadoModalModulo'
import FormularioDatosModulo from './components/FormularioDatosModulo'
import VistaElectricoModulo from './components/VistaElectricoModulo'
import FormularioElectrico from './components/FormularioElectrico'
import BotonesModalModulo from './components/BotonesModalModulo'
import ResumenMaterialesModal from './components/ResumenMaterialesModal'
import EditorMaterialesModal from './components/EditorMaterialesModal'
import ProtocolosMensualesToolbar from './components/ProtocolosMensualesToolbar'
import ProtocolosMensualesTabla from './components/ProtocolosMensualesTabla'
import ProtocolosMensualesModal from './components/ProtocolosMensualesModal'
import PreciosMaterialesModal from './components/PreciosMaterialesModal'
import DetalleCobroModal from './components/DetalleCobroModal'
import BotonValorCobro from './components/BotonValorCobro'
import ReintegrarModuloModal from './components/ReintegrarModuloModal'
import DescargaProtocolosDiariosModal from './components/DescargaProtocolosDiariosModal'
import BalanceMaterialesModal from './components/BalanceMaterialesModal'
import ValesBodegaModal from './components/ValesBodegaModal'
import ProtocoloEntrega, { camposMateriales, parsearCantidadProtocolo } from './components/ProtocoloEntrega'
import { obtenerHistorial } from './services/modulosService'
import {
  fechaDentroDeRangoProtocolo,
  formatearFecha,
  formatearFechaInput,
  obtenerRangoFechasProtocolos,
  obtenerValorInicialRangoProtocolo,
} from './utils/fechas'
import { colorEstado } from './utils/colores'
import { descargarProtocolosDiariosPdf } from './services/protocolosDiariosPdf'
import { tienePermiso } from './utils/permisos'
import {
  cargarRegistroAccionesDia,
  marcarRegistroAccionDeshecha,
  registrarRegistroAccionModulo,
} from './services/registroAccionesService'
import { leerFilasValeBodegaDesdeArchivo } from './services/valesBodegaArchivoService'
import { compilarBalanceMateriales } from './services/balanceMaterialesService'
import {
  cargarConfigBalanceMateriales as cargarConfigBalanceMaterialesSupabase,
  guardarConfigBalanceMaterial,
} from './services/balanceMaterialesConfigService'
import {
  cargarItemsValesBodegaPorRango,
  cargarValesBodegaDia as cargarValesBodegaDiaSupabase,
  guardarValeBodega as guardarValeBodegaSupabase,
} from './services/valesBodegaService'
import {
  cargarCatalogoMaterialesGuardado,
  cargarPreciosMateriales as cargarPreciosMaterialesSupabase,
  eliminarMaterialPrecio,
  guardarPreciosMateriales as guardarPreciosMaterialesSupabase,
  propagarRenombradoMaterial,
  renombrarMaterialPrecio,
} from './services/preciosMaterialesService'
import {
  cargarProtocolosDiarios,
  cargarRegistrosProtocolosPorRango,
} from './services/protocolosConsultaService'
import {
  claveItemCobro,
  prepararRegistroProtocoloMensual as prepararRegistroProtocoloMensualBase,
} from './services/protocolosValorizacionService'
import {
  eliminarRegistroProtocoloMensual,
  guardarAjusteValorizacionProtocoloSupabase,
  guardarIdOtProtocoloMensualSupabase,
  guardarProtocoloManualMensualSupabase,
  guardarProtocoloModuloSupabase,
  cargarDatosProtocoloModuloActivo,
  cargarModuloActualParaProtocolo,
  limpiarProtocoloModuloActivo,
} from './services/protocolosMensualesService'
import {
  cargarModuloPorId,
  construirHistorialModulo,
  eliminarModuloActivo,
  guardarHistorialModuloFinalizado,
} from './services/finalizacionModulosService'
import {
  crearModuloActivo,
  prepararLineaParaIngresoModulo,
} from './services/ingresoModulosService'
import { moverModuloEnTablero } from './services/movimientoModulosService'
import {
  buscarUltimoModuloFinalizadoPorSerie,
  reintegrarModuloDesdeHistorial,
} from './services/reintegroModulosService'
import {
  aprobarPruebaElectricaModulo,
  cancelarSolicitudPruebaElectricaModulo,
  guardarObservacionAlertaModulo,
  rechazarPruebaElectricaModulo,
  solicitarPruebaElectricaModulo,
} from './services/pruebaElectricaService'
import {
  actualizarModuloEditado,
  aplicarDatosPruebaElectricaEnPayload,
  aplicarGarantiaEnPayload,
  cargarModuloParaEdicion,
  construirPayloadEdicionModulo,
} from './services/edicionModulosService'
import {
  cargarDatosTablero,
  cargarPerfilUsuario,
  cargarSolicitantesPruebaPendiente,
} from './services/tableroService'
import { buscarRegistrosPorSerie } from './services/busquedaSeriesService'
import {
  deshacerAccionModuloSupabase,
  nombreTipoAccionModulo,
} from './services/accionesModuloService'
import {
  cargarMaterialesModuloSupabase,
  fusionarMaterialesEditados,
  guardarMaterialesModuloSupabase,
} from './services/materialesModuloService'
import {
  cargarSolicitantePrueba,
  obtenerNombrePerfilPorId,
} from './services/perfilesService'
import {
  claveProtocoloUnico,
  esEstadoConObservacionAlerta,
  esEstadoGarantia,
  esEstadoPruebaElectrica,
  esSolicitudPruebaActiva,
  esTipoBodega,
  estaDentroDeGarantia,
  fechaDocumentoProtocolo,
  fechaParaInput,
  normalizarTexto,
} from './utils/modulos'
import {
  formatearPrecioMaterial,
  limpiarPrecioMaterial,
  normalizarPrecioMaterial,
  separarIdsOt,
  unirIdsOt,
} from './utils/formatoValores'
import {
  agregarNotaGarantiaProtocolo,
  completarDatosPruebaEnProtocolo,
  sincronizarDatosModuloEnProtocolo,
} from './utils/protocolo'
import {
  actualizarFilaValeBodegaLista,
  agregarFilaValeBodegaLista,
  eliminarFilaValeBodegaLista,
  prepararItemsValeBodega,
} from './utils/valesBodega'
import {
  actualizarConfigBalanceMaterialLista,
  programarGuardadoConfigBalance,
} from './utils/balanceMaterialesConfig'
import {
  crearModuloManualProtocolo,
  obtenerFechaInicialProtocoloManual,
} from './utils/protocolosMensuales'
import { calcularIndicadoresTablero } from './utils/indicadores'
import {
  ejecutarSetters,
  eliminarEntradaPorId,
  hayCambiosPendientesPorId,
} from './utils/ventanas'

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
  { seccion: 'Canalización', material: 'Ducto Flex/Rig 32mm LH (Incl Acc)', idArt: 1682, precio: 3744 },
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
const seccionNoCatalogadosBalance = 'Consumibles'
const seccionCatalogoPrecios = (item) => (
  item.material === 'Ducto Flex/Rig 32mm LH (Incl Acc)'
    ? 'Canalización'
    : item.seccion
)
const opcionesMaterialesBalance = [...new Set(camposMateriales.map(([item]) => item))]
  .sort((a, b) => a.localeCompare(b))
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

function normalizarTextoComparacion(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/°/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function construirCatalogoPreciosMaterialesCompleto({
  catalogoBase,
}) {
  return catalogoBase.map((item) => ({
    ...item,
    seccion: seccionCatalogoPrecios(item),
  }))
}

function asignarIdsInternosMateriales(catalogo = []) {
  const secciones = [...new Set(catalogo.map((item) => item.seccion || 'Consumibles'))]
  const codigosUsados = new Set(catalogo
    .map((item) => item.idArtInterno || '')
    .filter(Boolean))
  const obtenerSiguienteCodigo = () => {
    let indice = 0
    while (codigosUsados.has(`Z${String(indice).padStart(2, '0')}`)) {
      indice += 1
    }
    const codigo = `Z${String(indice).padStart(2, '0')}`
    codigosUsados.add(codigo)
    return codigo
  }
  const materialesSinIdOrdenados = catalogo
    .filter((item) => !item.idArt && !item.idArtInterno)
    .map((item, indiceOriginal) => ({ item, indiceOriginal }))
    .sort((a, b) => {
      const ordenSeccionA = secciones.indexOf(a.item.seccion || 'Consumibles')
      const ordenSeccionB = secciones.indexOf(b.item.seccion || 'Consumibles')
      if (ordenSeccionA !== ordenSeccionB) return ordenSeccionA - ordenSeccionB

      const nombreA = String(a.item.material || '')
      const nombreB = String(b.item.material || '')
      const comparacionNombre = nombreA.localeCompare(nombreB, 'es', {
        numeric: true,
        sensitivity: 'base',
      })
      return comparacionNombre || a.indiceOriginal - b.indiceOriginal
    })
  const idsPorMaterial = new Map()

  materialesSinIdOrdenados.forEach(({ item }) => {
    idsPorMaterial.set(normalizarTextoComparacion(item.material), obtenerSiguienteCodigo())
  })

  return catalogo.map((item) => {
    if (item.idArt) {
      return {
        ...item,
        idArtVisible: String(item.idArt),
      }
    }

    const idArtInterno = item.idArtInterno || idsPorMaterial.get(normalizarTextoComparacion(item.material)) || ''
    return {
      ...item,
      idArtInterno,
      idArtVisible: idArtInterno,
    }
  })
}

function obtenerSiguienteIdInternoMaterial(catalogo = []) {
  const codigosUsados = new Set(catalogo
    .map((item) => item.idArtInterno || item.idArtVisible || '')
    .filter((codigo) => /^Z\d+$/i.test(String(codigo))))
  let indice = 0
  while (codigosUsados.has(`Z${String(indice).padStart(2, '0')}`)) {
    indice += 1
  }
  return `Z${String(indice).padStart(2, '0')}`
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
  [normalizarTextoComparacion('Barra repartidora')]: 'Repartidor 4x80A',
  [normalizarTextoComparacion('Falso polo')]: 'Falso Polo 1Mts',
  [normalizarTextoComparacion('BPC LH 100x45 + acces')]: 'BPC LH 100x45 + Acces',
  [normalizarTextoComparacion('Tapa idrobox IP65')]: 'Tapa Idrobox IP55',
  [normalizarTextoComparacion('Foco sobrep LED 18w')]: 'Foco Sobrep LED 18W',
  [normalizarTextoComparacion('Panel led 600x600 mm')]: 'Panel Led 600x600mm',
  [normalizarTextoComparacion('Accesorio Montaje Panel Led')]: 'Accesorio Mtaje Panel Led',
  [normalizarTextoComparacion('Foco sobrep led 24w')]: 'Foco Sobrep LED 24W',
}

const equivalenciasValeBodega = {
  [normalizarTextoComparacion('INT. 9/12 modulo R.5001 MATIX')]: 'INT. 9/12 modulo R.5001 MATIX',
  [normalizarTextoComparacion('CINTA DE AISLAR')]: 'CINTA DE AISLAR',
  [normalizarTextoComparacion('TAPA 1MOD.')]: 'Artefacto Simple',
  [normalizarTextoComparacion('TAPA 2MOD.')]: 'Artefacto Doble',
  [normalizarTextoComparacion('TAPA 2MOD')]: 'TAPA 2 MODULOS',
  [normalizarTextoComparacion('TAPA CIEGA')]: 'Tapa Ciega + Soporte',
  [normalizarTextoComparacion('ENCHUFE MACHO DE 32a SOBRE')]: 'Enchufe Mch Indep 32A',
  [normalizarTextoComparacion('ENCHUFE HEMBRA DE 32a SOBRE')]: 'Ench. ind. 32A hembra',
  [normalizarTextoComparacion('FOCO TORTUGA')]: 'Foco Tortuga Led',
  [normalizarTextoComparacion('TUBO FLUORESCENTE')]: 'Tubo Led',
  [normalizarTextoComparacion('EQU. FLUOR. 2 * 18 W HERMETICO')]: 'Eq. Herm. Led 40w (Tubo/Placa)',
  [normalizarTextoComparacion('CABLE EVA RZ-1 VERDE 2.5 MM')]: 'Cable rz1 2.5 MM',
  [normalizarTextoComparacion('CABLE EVA RZ-1 BLANCO 2.5 MM')]: 'Cable rz1 2.5 MM',
  [normalizarTextoComparacion('CABLE EVA RZ-1 AZUL 2.5 MM')]: 'Cable rz1 2.5 MM',
  [normalizarTextoComparacion('CONDUIT PVC TIGREFLEX 20MM 25MM 32MM LIB. HALOG')]: 'Ducto Flex/Rig 20mm LH (Incl Acc)',
  [normalizarTextoComparacion('CONDUIT PVC TIGREFLEX 20MM LIB')]: 'Conduit 20mm',
  [normalizarTextoComparacion('CAJA PVC 5/8" O/METALICO')]: 'Caja Tabique 3 Puestos LH',
  [normalizarTextoComparacion('CAJA ESTANCA 100 * 100 *')]: 'Caja PVC 100x100x65',
  [normalizarTextoComparacion('TORNILLO PHILIPS AUTORR. 6*2')]: 'TORNILLO PHILIPS AUTORR. 6*2',
  [normalizarTextoComparacion('TORNILLO AUTOPERFORANTE 8*3')]: 'TORNILLO AUTOPERFORANTE 8*3',
  [normalizarTextoComparacion('TDA EMBUTIDO 24 MODULOS ARMAI')]: 'Tablero armado',
  [normalizarTextoComparacion('AUTOM. * 10A LEXO / LEGRAND /STECK')]: 'Aut. Monof 10-16-20A',
  [normalizarTextoComparacion('AUTOM. * 16A 10KA LEXO / LEGRAND / BTICINO')]: 'Auto. Bifásico 2x16A',
  [normalizarTextoComparacion('AUTOM. * 20A 10KA LEXO / LEGRAND / BTICINO')]: 'Auto. Bifásico 2x20A',
  [normalizarTextoComparacion('AUTOM. * 25A 10KA LEXO / LEGRAND / BTICINO')]: 'Auto. Bifásico 2x25-32A',
  [normalizarTextoComparacion('AUTOM. * 32A 10KA LEXO / LEGRAND / BTICINO')]: 'Auto. Bifásico 2x25-32A',
  [normalizarTextoComparacion('DIFERENCIAL 2 * 25A 30MA LEXO / LEGRAND / BTICINO')]: 'Diferencial 2x25A',
  [normalizarTextoComparacion('LUZ PILOTO')]: 'Luz Piloto',
  [normalizarTextoComparacion('PORTA FUSIBLE CON FUSIBLE')]: 'Porta Fusibles',
  [normalizarTextoComparacion('FALSO POLO')]: 'Falso Polo 1Mts',
  [normalizarTextoComparacion('RETENEDORES DE 20')]: 'Retenedor 20mm',
  [normalizarTextoComparacion('RETENEDOR 20MM')]: 'Retenedor 20mm',
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
const [mostrarBalanceMateriales, setMostrarBalanceMateriales] = useState(false)
const [mostrarValesBodega, setMostrarValesBodega] = useState(false)
const [preciosMateriales, setPreciosMateriales] = useState({})
const [preciosCompraMateriales, setPreciosCompraMateriales] = useState({})
const [catalogoMaterialesGuardado, setCatalogoMaterialesGuardado] = useState([])
const [cargandoPreciosMateriales, setCargandoPreciosMateriales] = useState(false)
const [guardandoPreciosMateriales, setGuardandoPreciosMateriales] = useState(false)
const [precioMaterialEnEdicion, setPrecioMaterialEnEdicion] = useState(null)
const [rangoProtocolosMensuales, setRangoProtocolosMensuales] = useState('mes')
const [fechaProtocolosMensuales, setFechaProtocolosMensuales] = useState(new Date().toISOString().slice(0, 7))
const [protocolosMensuales, setProtocolosMensuales] = useState([])
const [cargandoProtocolosMensuales, setCargandoProtocolosMensuales] = useState(false)
const [busquedaProtocolosMensuales, setBusquedaProtocolosMensuales] = useState('')
const [rangoBalanceMateriales, setRangoBalanceMateriales] = useState('mes')
const [fechaBalanceMateriales, setFechaBalanceMateriales] = useState(new Date().toISOString().slice(0, 7))
const [protocolosBalanceMateriales, setProtocolosBalanceMateriales] = useState([])
const [valesBalanceMateriales, setValesBalanceMateriales] = useState([])
const [configBalanceMateriales, setConfigBalanceMateriales] = useState({})
const [catalogoBalanceMateriales, setCatalogoBalanceMateriales] = useState([])
const [cargandoBalanceMateriales, setCargandoBalanceMateriales] = useState(false)
const [fechaValeBodega, setFechaValeBodega] = useState(new Date().toISOString().slice(0, 10))
const [archivoValeBodega, setArchivoValeBodega] = useState(null)
const [filasValeBodega, setFilasValeBodega] = useState([])
const [valesBodegaDia, setValesBodegaDia] = useState([])
const [cargandoValesBodegaDia, setCargandoValesBodegaDia] = useState(false)
const [leyendoValeBodega, setLeyendoValeBodega] = useState(false)
const [guardandoValeBodega, setGuardandoValeBodega] = useState(false)
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
const guardadoBalanceMaterialesRef = useRef({})
const esRolSoloLectura = tienePermiso(perfil?.rol, 'soloLectura')
const puedeAgregarModulos = tienePermiso(perfil?.rol, 'agregarModulos')
const puedeMoverModulos = tienePermiso(perfil?.rol, 'moverModulos')
const puedeFinalizarModulos = tienePermiso(perfil?.rol, 'finalizarModulos')
const puedeResolverPrueba = tienePermiso(perfil?.rol, 'resolverPrueba')
const puedeUsarProtocolo = tienePermiso(perfil?.rol, 'usarProtocolo')
const puedeEditarProtocolo = tienePermiso(perfil?.rol, 'editarProtocolo')
const puedeEditarDatosProtocolo = tienePermiso(perfil?.rol, 'editarDatosProtocolo')
const puedeEditarDatosModulo = puedeEditarDatosProtocolo
const recibeAvisosPrueba = tienePermiso(perfil?.rol, 'recibirAvisosPrueba')
const puedeDescargarProtocolosDiarios = tienePermiso(perfil?.rol, 'descargarProtocolosDiarios')
const puedeVerPreciosMateriales = tienePermiso(perfil?.rol, 'verPreciosMateriales')
const puedeEditarPreciosMateriales = tienePermiso(perfil?.rol, 'editarPreciosMateriales')
const puedeVerProtocolosMensuales = tienePermiso(perfil?.rol, 'verProtocolosMensuales')
const puedeVerBalanceMateriales = tienePermiso(perfil?.rol, 'verBalanceMateriales')
const puedeVerValesBodega = tienePermiso(perfil?.rol, 'verValesBodega')
const puedeEliminarProtocolosMensuales = tienePermiso(perfil?.rol, 'eliminarProtocolosMensuales')
const puedeAjustarValoresProtocolos = tienePermiso(perfil?.rol, 'ajustarValoresProtocolos')
const puedeVerMenuAcciones = puedeAgregarModulos || puedeDescargarProtocolosDiarios || puedeVerPreciosMateriales
const puedeVerMenuModulo = tienePermiso(perfil?.rol, 'verMenuModulo')
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
const catalogoMaterialesGuardadoActivos = catalogoMaterialesGuardado.filter((item) => item.activo !== false)
const primerPrecioDisponible = (...valores) => {
  const valoresNormalizados = valores.map((valor) => normalizarPrecioMaterial(valor))
  return valoresNormalizados.find((valor) => Number(valor) > 0) ?? 0
}
const materialPrecioEliminado = (itemBase) => catalogoMaterialesGuardado.some((itemGuardado) => (
  itemGuardado.activo === false &&
  (
    (itemGuardado.idArt && itemBase.idArt && String(itemGuardado.idArt) === String(itemBase.idArt)) ||
    normalizarTextoComparacion(itemGuardado.materialOriginal || itemGuardado.material) === normalizarTextoComparacion(itemBase.material)
  )
))
const catalogoPreciosBaseYGuardado = [
  ...catalogoPreciosProtocolo
    .filter((itemBase) => !materialPrecioEliminado(itemBase))
    .map((itemBase) => {
    const itemGuardadoPorId = catalogoMaterialesGuardadoActivos.find((item) => (
      item.idArt && itemBase.idArt && String(item.idArt) === String(itemBase.idArt)
    ))
    const itemGuardadoPorNombre = catalogoMaterialesGuardadoActivos.find((item) => (
      !item.idArt &&
      normalizarTextoComparacion(item.materialOriginal || item.material) === normalizarTextoComparacion(itemBase.material)
    ))
    const itemGuardado = itemGuardadoPorId || itemGuardadoPorNombre
    return itemGuardado
      ? {
          ...itemBase,
          materialOriginal: itemGuardado.materialOriginal || itemBase.material,
          idArtInterno: itemGuardado.idArtInterno || itemBase.idArtInterno || '',
          material: itemGuardado.material || itemBase.material,
          seccion: seccionCatalogoPrecios(itemGuardado),
          precio: primerPrecioDisponible(itemGuardado.precio, itemBase.precio),
          precioCompra: primerPrecioDisponible(itemGuardado.precioCompra, itemBase.precioCompra),
        }
      : itemBase
  }),
  ...catalogoMaterialesGuardadoActivos.filter((itemGuardado) => {
    const existePorId = itemGuardado.idArt && catalogoPreciosProtocolo.some(
      (itemBase) => itemBase.idArt && String(itemBase.idArt) === String(itemGuardado.idArt)
    )
    if (existePorId) return false
    return !catalogoPreciosProtocolo.some(
      (itemBase) => normalizarTextoComparacion(itemBase.material) === normalizarTextoComparacion(itemGuardado.material)
    )
  }),
]
const catalogoPreciosParaBalance = catalogoPreciosBaseYGuardado.map((item) => ({
  ...item,
    precio: primerPrecioDisponible(preciosMateriales[item.material], preciosMateriales[item.materialOriginal], item.precio),
  precioCompra: primerPrecioDisponible(
    preciosCompraMateriales[item.material],
    preciosCompraMateriales[item.materialOriginal],
    item.precioCompra
  ),
}))
const balanceMateriales = compilarBalanceMateriales(protocolosBalanceMateriales, valesBalanceMateriales, {
  configMateriales: configBalanceMateriales,
  catalogoPreciosProtocolo: catalogoPreciosParaBalance,
  equivalenciasPrecioProtocolo,
  equivalenciasValeBodega,
  normalizarTextoComparacion,
})
const catalogoPreciosMaterialesBaseCompleto = construirCatalogoPreciosMaterialesCompleto({
  catalogoBase: catalogoPreciosBaseYGuardado,
  balanceMateriales,
  configMateriales: configBalanceMateriales,
  equivalenciasPrecioProtocolo,
  normalizarPrecioMaterial,
})
const catalogoPreciosMaterialesCompleto = asignarIdsInternosMateriales(catalogoPreciosMaterialesBaseCompleto)
const seccionesCatalogoPreciosCompleto = [
  ...new Set(catalogoPreciosMaterialesCompleto.map((item) => item.seccion)),
]
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

function nombreTipoAccion(tipo) {
  return nombreTipoAccionModulo(tipo)
}

async function cargarAccionesDia() {
  if (perfil?.rol !== 'admin') return

  setCargandoAccionesDia(true)
  const { data, error } = await cargarRegistroAccionesDia()
  setCargandoAccionesDia(false)

  if (error) {
    console.error(error)
    mostrarNotificacion('No se pudo cargar el registro de acciones. Revisa si existe la tabla en Supabase.')
    return
  }

  setAccionesDia(data || [])
}

async function registrarAccionModulo({ tipo, modulo = {}, datosAntes = null, datosDespues = null, descripcion = '' }) {
  const { error } = await registrarRegistroAccionModulo({
    tipo,
    descripcion,
    modulo,
    datosAntes,
    datosDespues,
    usuarioId: session?.user?.id || null,
    usuarioNombre: perfil?.nombre || perfil?.email || session?.user?.email || perfil?.rol || '',
  })

  if (error) {
    console.error(error)
    if (!error.message?.includes('registro_acciones_modulos')) {
      mostrarNotificacion('La acción se realizó, pero no se pudo guardar en el registro: ' + error.message)
    }
  }
}

async function marcarAccionDeshecha(accion) {
  const { error } = await marcarRegistroAccionDeshecha(
    accion.id,
    perfil?.nombre || session?.user?.email || ''
  )

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

  const resultado = await deshacerAccionModuloSupabase({
    supabase,
    accion,
  })

  if (!resultado.ok) {
    mostrarNotificacion(resultado.mensaje || 'No se pudo deshacer la acción')
    return
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
  ejecutarSetters([
    setMostrarLlamadosPendientes,
    setMostrarRegistroAcciones,
    setMostrarTodasAccionesDia,
    setMostrarMenuAcciones,
    setMostrarMenuModulo,
  ])
}

function cerrarPanelesYModulo() {
  limpiarBusquedaSerie()
  cerrarVentanasEmergentes()
}

function hayMaterialesPendientes(moduloId = moduloSeleccionado?.id) {
  return hayCambiosPendientesPorId(materialesEditados, moduloId)
}

function cerrarEditorMateriales({ forzar = false } = {}) {
  if (!forzar && hayMaterialesPendientes()) {
    const confirmar = window.confirm('Hay cambios de materiales sin guardar. ¿Cerrar de todas formas?')
    if (!confirmar) return
  }
  if (moduloSeleccionado?.id) {
    setMaterialesEditados((actuales) => eliminarEntradaPorId(actuales, moduloSeleccionado.id))
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
  ejecutarSetters([
    setMostrarProtocoloEntrega,
    setProtocoloSoloLecturaBusqueda,
    setProtocoloDesdeHistorial,
    setProtocoloManualMensual,
    setMostrarNuevoModulo,
    setCreandoModulo,
    setMostrarReintegrar,
    setMostrarDescargaProtocolos,
    setMostrarPreciosMateriales,
    setMostrarBalanceMateriales,
    setMostrarValesBodega,
  ])
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
    const { data, error } = await cargarSolicitantesPruebaPendiente({
      supabase,
      idsModulos,
    })

    if (error) {
      console.error(error)
      return
    }

    setSolicitantesPendientes(data || {})
  }

  cargarSolicitantesPendientes()
}, [datos, recibeAvisosPrueba])

if (!session) {
  return <Login supabase={supabase} />
}

async function cargarPerfil() {
  const usuario = session?.user

  if (!usuario) return

  const { data, error } = await cargarPerfilUsuario({
    supabase,
    usuarioId: usuario.id,
  })

  if (error) {
    console.error(error)
    return
  }

  setPerfil(data)
}
  
  async function cargarTablero() {
    const { data: mergedData, error } = await cargarDatosTablero({
      supabase,
      esSolicitudPruebaActiva,
    })

    if (error) {
      console.error(error)
      return
    }

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

  const { data, error } = await buscarRegistrosPorSerie({
    supabase,
    serie,
  })

  if (error) {
    alert(error.message)
    return
  }

  setResultadoBusqueda(data || [])
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
      posicionIngreso = await prepararLineaParaIngresoModulo({
        supabase,
        linea: posicionSeleccionada.linea,
        extremo: posicionSeleccionada.extremo,
      })
    } catch (error) {
      mostrarNotificacion(error.message)
      await cargarTablero()
      setCreandoModulo(false)
      return
    }
  }

  const { data: moduloCreado, error } = await crearModuloActivo({
    supabase,
    serie: serieNueva,
    tipo: tipoNuevo,
    proyecto: proyectoNuevo,
    responsable: responsableNuevo,
    linea: lineaIngreso,
    posicion: posicionIngreso,
  })

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

async function cargarPreciosMateriales(catalogo = catalogoPreciosMaterialesCompleto) {
  setCargandoPreciosMateriales(true)
  const { catalogo: catalogoGuardado, error: errorCatalogoGuardado } = await cargarCatalogoMaterialesGuardado({
    supabase,
  })
  if (!errorCatalogoGuardado) {
    setCatalogoMaterialesGuardado(catalogoGuardado)
  }
  const catalogoGuardadoActivo = (catalogoGuardado || []).filter((item) => item.activo !== false)
  const catalogoConGuardado = [
    ...catalogo.map((itemBase) => {
      const itemGuardadoPorId = catalogoGuardadoActivo.find((item) => (
        item.idArt && itemBase.idArt && String(item.idArt) === String(itemBase.idArt)
      ))
      const itemGuardadoPorNombre = catalogoGuardadoActivo.find((item) => (
        normalizarTextoComparacion(item.material) === normalizarTextoComparacion(itemBase.material)
      ))
      const itemGuardado = itemGuardadoPorId || itemGuardadoPorNombre
      return itemGuardado
        ? {
            ...itemBase,
            materialOriginal: itemGuardado.materialOriginal || itemBase.material,
            idArtInterno: itemGuardado.idArtInterno || itemBase.idArtInterno || '',
            material: itemGuardado.material || itemBase.material,
            seccion: itemGuardado.seccion || itemBase.seccion,
            precio: primerPrecioDisponible(itemGuardado.precio, itemBase.precio),
            precioCompra: primerPrecioDisponible(itemGuardado.precioCompra, itemBase.precioCompra),
          }
        : itemBase
    }),
    ...catalogoGuardadoActivo.filter((itemGuardado) => !catalogo.some((itemBase) => (
      (itemGuardado.idArt && itemBase.idArt && String(itemGuardado.idArt) === String(itemBase.idArt)) ||
      normalizarTextoComparacion(itemGuardado.material) === normalizarTextoComparacion(itemBase.material)
    ))),
  ]

  const { precios, preciosCompra, error } = await cargarPreciosMaterialesSupabase({
    supabase,
    catalogo: catalogoConGuardado,
  })
  setCargandoPreciosMateriales(false)

  if (error) {
    mostrarNotificacion('No se pudieron cargar los precios: ' + error.message)
    setPreciosMateriales(precios)
    setPreciosCompraMateriales(preciosCompra || {})
    return precios
  }

  setPreciosMateriales(precios)
  setPreciosCompraMateriales(preciosCompra || {})
  return precios
}

async function abrirPreciosMateriales() {
  if (!puedeVerPreciosMateriales) return
  cerrarVentanasEmergentes()
  setMostrarMenuAcciones(false)
  setMostrarPreciosMateriales(true)
  await cargarPreciosMateriales(catalogoPreciosMaterialesCompleto)
}

function prepararRegistroProtocoloMensual(registro, origen, precios = preciosMateriales) {
  return prepararRegistroProtocoloMensualBase({
    registro,
    origen,
    precios,
    catalogoPreciosProtocolo: catalogoPreciosMaterialesCompleto,
    camposMateriales,
    equivalenciasPrecioProtocolo,
    normalizarTextoComparacion,
    normalizarPrecioMaterial,
    parsearCantidadProtocolo,
    esEstadoGarantia,
    fechaDocumentoProtocolo,
  })
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

  const {
    data: registroGuardado,
    error,
    mensaje,
    protocoloActualizado,
  } = await guardarAjusteValorizacionProtocoloSupabase({
    supabase,
    registro,
    ajuste: {
      ...ajusteCobroMensual,
      motivo,
    },
    perfil,
    normalizarPrecioMaterial,
  })

  if (error) {
    mostrarNotificacion(mensaje || ('No se pudo guardar el ajuste de valorización: ' + error.message))
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

async function obtenerRegistrosProtocolosPorRango(valor, rango) {
  const preciosParaCalculo = Object.keys(preciosMateriales).length === 0
    ? await cargarPreciosMateriales()
    : preciosMateriales

  const { inicio, fin: finTexto } = obtenerRangoFechasProtocolos(rango, valor)

  const {
    registrosActivos,
    registrosHistorial,
    registrosManuales,
    error,
  } = await cargarRegistrosProtocolosPorRango({
    supabase,
    inicio,
    fin: finTexto,
    fechaDocumentoProtocolo,
    fechaDentroDeRangoProtocolo,
  })

  if (error) {
    return { error, registros: [] }
  }

  const preciosActuales = Object.keys(preciosParaCalculo || {}).length > 0
    ? preciosParaCalculo
    : Object.fromEntries(catalogoPreciosMaterialesCompleto.map((item) => [item.material, item.precio]))

  const registros = [
    ...registrosActivos.map((item) => prepararRegistroProtocoloMensual(item, 'actual', preciosActuales)),
    ...registrosHistorial.map((item) => prepararRegistroProtocoloMensual(item, 'historial', preciosActuales)),
    ...registrosManuales.map((item) => prepararRegistroProtocoloMensual(item, 'manual', preciosActuales)),
  ].sort((a, b) => new Date(b.fecha_prueba_electrica || 0) - new Date(a.fecha_prueba_electrica || 0))

  return { registros, error: null }
}

async function cargarProtocolosMensuales(valor = fechaProtocolosMensuales, rango = rangoProtocolosMensuales) {
  if (!puedeVerProtocolosMensuales || !valor) return

  setCargandoProtocolosMensuales(true)
  const { registros, error } = await obtenerRegistrosProtocolosPorRango(valor, rango)
  setCargandoProtocolosMensuales(false)

  if (error) {
    mostrarNotificacion('No se pudieron cargar los protocolos mensuales: ' + error.message)
    return
  }

  setProtocolosMensuales(registros)
}

async function abrirProtocolosMensuales() {
  if (!puedeVerProtocolosMensuales) return
  cerrarVentanasEmergentes()
  setMostrarMenuAcciones(false)
  setMostrarProtocolosMensuales(true)
  await cargarProtocolosMensuales()
}

async function cargarConfigBalanceMateriales() {
  if (!puedeVerBalanceMateriales) return {}

  const { config, error } = await cargarConfigBalanceMaterialesSupabase({
    supabase,
    normalizarPrecioMaterial,
  })

  if (error) {
    if (!error.message?.includes('balance_materiales_config')) {
      mostrarNotificacion('No se pudo cargar la configuración de balance: ' + error.message)
    }
    return {}
  }

  setConfigBalanceMateriales(config)
  return config
}

function guardarConfigBalanceMaterialesDebounced(clave, config) {
  programarGuardadoConfigBalance({
    refGuardado: guardadoBalanceMaterialesRef,
    clave,
    config,
    guardar: (claveGuardar, configGuardar) => guardarConfigBalanceMaterial({
      supabase,
      clave: claveGuardar,
      config: configGuardar,
      normalizarPrecioMaterial,
    }),
    onError: (error) => mostrarNotificacion('No se pudo guardar el valor compra en Supabase: ' + error.message),
  })
}

function actualizarConfigBalanceMaterial(clave, cambios) {
  setConfigBalanceMateriales((actual) => {
    const { configActualizada, configCompleta } = actualizarConfigBalanceMaterialLista({
      configActual: actual,
      clave,
      cambios,
    })

    guardarConfigBalanceMaterialesDebounced(clave, configActualizada)

    return configCompleta
  })
}

async function cargarBalanceMateriales(valor = fechaBalanceMateriales, rango = rangoBalanceMateriales) {
  if (!puedeVerBalanceMateriales || !valor) return { registros: [], vales: [] }

  setCargandoBalanceMateriales(true)
  const { catalogo: catalogoGuardado, error: errorCatalogoGuardado } = await cargarCatalogoMaterialesGuardado({ supabase })
  if (!errorCatalogoGuardado) {
    setCatalogoMaterialesGuardado(catalogoGuardado)
  }
  const catalogoGuardadoActivo = (catalogoGuardado || []).filter((item) => item.activo !== false)
  const catalogoParaBalanceActualizado = [
    ...catalogoPreciosProtocolo.map((itemBase) => {
      const itemGuardado = catalogoGuardadoActivo.find((item) => (
        (item.idArt && itemBase.idArt && String(item.idArt) === String(itemBase.idArt)) ||
        normalizarTextoComparacion(item.material) === normalizarTextoComparacion(itemBase.material)
      ))
      return itemGuardado
        ? {
            ...itemBase,
            materialOriginal: itemGuardado.materialOriginal || itemBase.material,
            idArtInterno: itemGuardado.idArtInterno || itemBase.idArtInterno || '',
            material: itemGuardado.material || itemBase.material,
            seccion: itemGuardado.seccion || itemBase.seccion,
            precio: primerPrecioDisponible(itemGuardado.precio, itemBase.precio),
            precioCompra: primerPrecioDisponible(itemGuardado.precioCompra, itemBase.precioCompra),
          }
        : itemBase
    }),
    ...catalogoGuardadoActivo.filter((itemGuardado) => !catalogoPreciosProtocolo.some((itemBase) => (
      (itemGuardado.idArt && itemBase.idArt && String(itemGuardado.idArt) === String(itemBase.idArt)) ||
      normalizarTextoComparacion(itemBase.material) === normalizarTextoComparacion(itemGuardado.material)
    ))),
  ]
  setCatalogoBalanceMateriales(catalogoParaBalanceActualizado)
  await cargarPreciosMateriales(catalogoParaBalanceActualizado)
  const [{ registros, error }, vales] = await Promise.all([
    obtenerRegistrosProtocolosPorRango(valor, rango),
    cargarValesBodegaPorRango(valor, rango),
  ])
  setCargandoBalanceMateriales(false)

  if (error) {
    mostrarNotificacion('No se pudo cargar el balance de materiales: ' + error.message)
    return { registros: [], vales: [] }
  }

  setProtocolosBalanceMateriales(registros)
  setValesBalanceMateriales(vales)
  return { registros, vales }
}

async function abrirBalanceMateriales() {
  if (!puedeVerBalanceMateriales) return
  cerrarVentanasEmergentes()
  setMostrarMenuAcciones(false)
  setMostrarBalanceMateriales(true)
  await Promise.all([
    cargarConfigBalanceMateriales(),
    cargarBalanceMateriales(),
  ])
}

async function cargarValesBodegaPorRango(valor = fechaBalanceMateriales, rango = rangoBalanceMateriales) {
  const { inicio, fin } = obtenerRangoFechasProtocolos(rango, valor)
  const fechaInicio = inicio.slice(0, 10)
  const fechaFin = fin.slice(0, 10)

  const { items, error } = await cargarItemsValesBodegaPorRango({
    supabase,
    fechaInicio,
    fechaFin,
  })

  if (error) {
    if (error.message?.includes('vales_bodega_items')) return []
    mostrarNotificacion('No se pudieron cargar los vales de bodega: ' + error.message)
    return []
  }

  return items
}

async function cargarValesBodegaDia(fecha = fechaValeBodega) {
  if (!fecha || !puedeVerValesBodega) return

  setCargandoValesBodegaDia(true)

  const { vales, error } = await cargarValesBodegaDiaSupabase({
    supabase,
    fecha,
  })

  setCargandoValesBodegaDia(false)

  if (error) {
    if (!error.message?.includes('vales_bodega')) {
      mostrarNotificacion('No se pudieron cargar los vales del día: ' + error.message)
    }
    setValesBodegaDia(vales)
    return
  }

  setValesBodegaDia(vales)
}

function cambiarFechaValeBodega(fecha) {
  setFechaValeBodega(fecha)
  cargarValesBodegaDia(fecha)
}

function agregarFilaValeBodega(fila = {}) {
  setFilasValeBodega((actuales) => agregarFilaValeBodegaLista(actuales, fila))
}

function actualizarFilaValeBodega(index, cambios) {
  setFilasValeBodega((actuales) => actualizarFilaValeBodegaLista(actuales, index, cambios))
}

function eliminarFilaValeBodega(index) {
  setFilasValeBodega((actuales) => eliminarFilaValeBodegaLista(actuales, index))
}

async function leerValeBodega() {
  if (!archivoValeBodega) return

  setLeyendoValeBodega(true)
  let filas = []
  try {
    filas = await leerFilasValeBodegaDesdeArchivo(archivoValeBodega, {
      equivalenciasValeBodega,
      normalizarTextoComparacion,
    })
  } catch (error) {
    console.error(error)
    mostrarNotificacion(error.message || 'No se pudo leer el archivo automáticamente. Puedes ingresar los materiales manualmente.')
  } finally {
    setLeyendoValeBodega(false)
  }

  if (filas.length === 0) {
    mostrarNotificacion('No se pudieron detectar materiales autom?ticamente. Puedes ingresarlos manualmente.')
    return
  }

  setFilasValeBodega(filas)
  mostrarNotificacion(`Se detectaron ${filas.length} materiales del vale`)
}

async function guardarValeBodega() {
  if (!fechaValeBodega || filasValeBodega.length === 0) return

  const items = prepararItemsValeBodega(filasValeBodega)

  if (items.length === 0) {
    mostrarNotificacion('No hay materiales válidos para guardar')
    return
  }

  setGuardandoValeBodega(true)

  const { error, etapa } = await guardarValeBodegaSupabase({
    supabase,
    fecha: fechaValeBodega,
    archivoNombre: archivoValeBodega?.name || '',
    usuarioNombre: perfil?.nombre || perfil?.email || session?.user?.email || '',
    items,
  })

  setGuardandoValeBodega(false)

  if (error && etapa === 'vale') {
    mostrarNotificacion('No se pudo guardar el vale. Revisa si existen las tablas vales_bodega y vales_bodega_items.')
    return
  }

  if (error) {
    mostrarNotificacion('No se pudieron guardar los materiales del vale: ' + error.message)
    return
  }

  mostrarNotificacion('Vale de bodega guardado')
  setFilasValeBodega([])
  setArchivoValeBodega(null)
  await cargarValesBodegaDia(fechaValeBodega)
  setMostrarValesBodega(false)

  if (mostrarBalanceMateriales) {
    await cargarBalanceMateriales(fechaBalanceMateriales, rangoBalanceMateriales)
  }
}

async function abrirValesBodega() {
  if (!puedeVerValesBodega) return
  cerrarVentanasEmergentes()
  setMostrarMenuAcciones(false)
  setFechaValeBodega(new Date().toISOString().slice(0, 10))
  setArchivoValeBodega(null)
  setFilasValeBodega([])
  setMostrarValesBodega(true)
  await cargarValesBodegaDia(new Date().toISOString().slice(0, 10))
}

function fechaInicialProtocoloManual() {
  return obtenerFechaInicialProtocoloManual({
    fechaProtocolosMensuales,
    rangoProtocolosMensuales,
    obtenerRangoFechasProtocolos,
  })
}

function abrirIngresoManualProtocolo() {
  if (!puedeVerProtocolosMensuales) return

  const fecha = fechaInicialProtocoloManual()
  const moduloManual = crearModuloManualProtocolo({
    fecha,
    responsable: perfil?.nombre || '',
  })

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

  const {
    data: registroGuardado,
    error,
    mensaje,
    registroActual,
    protocoloActualizado,
    tablaDestino,
  } = await guardarIdOtProtocoloMensualSupabase({
    supabase,
    registro,
    valorIdOt,
  })

  if (error) {
    mostrarNotificacion(mensaje || ('No se pudo guardar el ID OT: ' + error.message))
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

    const { error } = await limpiarProtocoloModuloActivo({
      supabase,
      id: registro.id,
    })

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

  const { error } = await eliminarRegistroProtocoloMensual({
    supabase,
    origen: registro.origen,
    id: registro.id,
  })

  if (error) {
    mostrarNotificacion('No se pudo eliminar el protocolo: ' + error.message)
    return
  }

  setProtocolosMensuales((actuales) => actuales.filter((item) => !(
    item.origen === registro.origen && item.id === registro.id
  )))
  mostrarNotificacion('Protocolo eliminado')
}

function actualizarPrecioMaterial(material, tipo, valor) {
  const setter = tipo === 'compra'
    ? setPreciosCompraMateriales
    : setPreciosMateriales

  setter((actuales) => ({
    ...actuales,
    [material]: limpiarPrecioMaterial(valor),
  }))
}

function renombrarClaveObjetoMaterialesLocal(valor, materialAnterior, materialNuevo) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return valor

  const claveAnterior = normalizarTextoComparacion(materialAnterior)
  return Object.fromEntries(Object.entries(valor).map(([clave, contenido]) => (
    normalizarTextoComparacion(clave) === claveAnterior
      ? [materialNuevo, contenido]
      : [clave, contenido]
  )))
}

function renombrarMaterialEnProtocoloLocal(protocolo, materialAnterior, materialNuevo) {
  if (!protocolo || typeof protocolo !== 'object' || Array.isArray(protocolo)) return protocolo

  return {
    ...protocolo,
    materiales: renombrarClaveObjetoMaterialesLocal(protocolo.materiales, materialAnterior, materialNuevo),
    detalleMateriales: renombrarClaveObjetoMaterialesLocal(protocolo.detalleMateriales, materialAnterior, materialNuevo),
  }
}

function renombrarMaterialEnEstadoLocal(materialAnterior, materialNuevo) {
  setFormulariosElectricos((actuales) => Object.fromEntries(Object.entries(actuales || {}).map(([moduloId, materiales]) => [
    moduloId,
    renombrarClaveObjetoMaterialesLocal(materiales, materialAnterior, materialNuevo),
  ])))

  setDatos((actuales) => actuales.map((modulo) => ({
    ...modulo,
    materiales: renombrarClaveObjetoMaterialesLocal(modulo.materiales, materialAnterior, materialNuevo),
    protocolo_entrega: renombrarMaterialEnProtocoloLocal(modulo.protocolo_entrega, materialAnterior, materialNuevo),
  })))

  setProtocolosMensuales((actuales) => actuales.map((registro) => ({
    ...registro,
    materiales: renombrarClaveObjetoMaterialesLocal(registro.materiales, materialAnterior, materialNuevo),
    protocolo_entrega: renombrarMaterialEnProtocoloLocal(registro.protocolo_entrega, materialAnterior, materialNuevo),
  })))

  setProtocolosBalanceMateriales((actuales) => actuales.map((registro) => ({
    ...registro,
    materiales: renombrarClaveObjetoMaterialesLocal(registro.materiales, materialAnterior, materialNuevo),
    protocolo_entrega: renombrarMaterialEnProtocoloLocal(registro.protocolo_entrega, materialAnterior, materialNuevo),
  })))

  setValesBalanceMateriales((actuales) => actuales.map((item) => (
    normalizarTextoComparacion(item.material_balance) === normalizarTextoComparacion(materialAnterior)
      ? { ...item, material_balance: materialNuevo }
      : item
  )))

  setValesBodegaDia((actuales) => actuales.map((vale) => ({
    ...vale,
    items: (vale.items || []).map((item) => (
      normalizarTextoComparacion(item.material_balance) === normalizarTextoComparacion(materialAnterior)
        ? { ...item, material_balance: materialNuevo }
        : item
    )),
  })))

  setConfigBalanceMateriales((actuales) => {
    const claveAnterior = normalizarTextoComparacion(materialAnterior)
    const claveNueva = normalizarTextoComparacion(materialNuevo)
    const actualizados = { ...actuales }
    Object.entries(actuales || {}).forEach(([clave, config]) => {
      if (clave === claveAnterior) {
        actualizados[claveNueva] = { ...config, nombreVisible: materialNuevo }
        delete actualizados[claveAnterior]
      } else if (normalizarTextoComparacion(config?.nombreVisible) === claveAnterior) {
        actualizados[clave] = { ...config, nombreVisible: materialNuevo }
      }
    })
    return actualizados
  })
}

function agregarMaterialCatalogoPrecios(seccion) {
  if (!puedeEditarPreciosMateriales) return

  const nombre = window.prompt(`Nombre del nuevo material para ${seccion}:`)
  const material = String(nombre || '').trim()
  if (!material) return

  const existe = catalogoPreciosMaterialesCompleto.some(
    (item) => normalizarTextoComparacion(item.material) === normalizarTextoComparacion(material)
  )

  if (existe) {
    mostrarNotificacion('Ese material ya existe en la tabla de precios')
    return
  }

  const idArtInterno = obtenerSiguienteIdInternoMaterial(catalogoPreciosMaterialesCompleto)
  const nuevoMaterial = {
    material,
    idArt: '',
    idArtInterno,
    idArtVisible: idArtInterno,
    seccion,
    precio: 0,
    precioCompra: 0,
  }

  setCatalogoMaterialesGuardado((actuales) => [...actuales, nuevoMaterial])
  setPreciosMateriales((actuales) => ({
    ...actuales,
    [material]: 0,
  }))
  setPreciosCompraMateriales((actuales) => ({
    ...actuales,
    [material]: 0,
  }))
  setPrecioMaterialEnEdicion(`venta::${material}`)
  mostrarNotificacion('Material agregado. Recuerda guardar precios para conservarlo.')
}

async function renombrarMaterialCatalogoPrecios(item, nuevoNombre) {
  if (!puedeEditarPreciosMateriales) return

  const material = String(nuevoNombre || '').trim()
  const materialActual = String(item?.material || '').trim()
  if (!material || !materialActual) return

  const claveActual = normalizarTextoComparacion(materialActual)
  const claveNueva = normalizarTextoComparacion(material)
  if (claveActual === claveNueva) return

  const existe = catalogoPreciosMaterialesCompleto.some((otro) => (
    normalizarTextoComparacion(otro.material) === claveNueva &&
    !(
      item.idArt &&
      otro.idArt &&
      String(otro.idArt) === String(item.idArt)
    )
  ))

  if (existe) {
    mostrarNotificacion('Ese material ya existe en la tabla de precios')
    return
  }

  const precioVentaActual = normalizarPrecioMaterial(preciosMateriales[materialActual] ?? item.precio ?? 0)
  const precioCompraActual = normalizarPrecioMaterial(preciosCompraMateriales[materialActual] ?? item.precioCompra ?? 0)
  const itemRenombrado = {
    ...item,
    materialOriginal: item.materialOriginal || materialActual,
    idArtInterno: item.idArtInterno || '',
    idArtVisible: item.idArtVisible || item.idArtInterno || '',
    material,
    seccion: seccionCatalogoPrecios(item),
    precio: precioVentaActual,
    precioCompra: precioCompraActual,
  }

  const { error, requierePermisoInsert } = await renombrarMaterialPrecio({
    supabase,
    itemAnterior: item,
    itemNuevo: itemRenombrado,
    precioVenta: precioVentaActual,
    precioCompra: precioCompraActual,
    normalizarPrecioMaterial,
  })

  if (error) {
    if (requierePermisoInsert) {
      mostrarNotificacion('No se pudo renombrar: Supabase no permite crear el registro base en material_precios. Detalle: ' + error.message)
    } else {
      mostrarNotificacion('No se pudo renombrar el material: ' + error.message)
    }
    return
  }

  const propagacion = await propagarRenombradoMaterial({
    supabase,
    materialAnterior: materialActual,
    materialNuevo: material,
  })

  if (propagacion.error) {
    mostrarNotificacion('El nombre cambió en el catálogo, pero no se pudo actualizar todos los registros: ' + propagacion.error.message)
    return
  }

  const actualizarListaCatalogo = (actuales) => {
    const indice = actuales.findIndex((actual) => (
      (item.idArt && actual.idArt && String(actual.idArt) === String(item.idArt)) ||
      normalizarTextoComparacion(actual.materialOriginal || actual.material) === claveActual ||
      normalizarTextoComparacion(actual.material) === claveActual
    ))

    if (indice >= 0) {
      return actuales.map((actual, posicion) => (
        posicion === indice
          ? { ...actual, ...itemRenombrado }
          : actual
      ))
    }

    return [...actuales, itemRenombrado]
  }

  setCatalogoMaterialesGuardado(actualizarListaCatalogo)
  setCatalogoBalanceMateriales(actualizarListaCatalogo)
  renombrarMaterialEnEstadoLocal(materialActual, material)

  setPreciosMateriales((actuales) => {
    const actualizados = {
      ...actuales,
      [material]: precioVentaActual,
    }
    if (!item.idArt) delete actualizados[materialActual]
    return actualizados
  })

  setPreciosCompraMateriales((actuales) => {
    const actualizados = {
      ...actuales,
      [material]: precioCompraActual,
    }
    if (!item.idArt) delete actualizados[materialActual]
    return actualizados
  })

  setPrecioMaterialEnEdicion(null)
  mostrarNotificacion(`Nombre de material actualizado en catálogo y registros (${propagacion.actualizados} cambio(s)).`)
}

async function eliminarMaterialCatalogoPrecios(item) {
  if (!puedeEditarPreciosMateriales) return

  const confirmado = window.confirm(`¿Eliminar el material "${item.material}" del catálogo de precios?`)
  if (!confirmado) return

  const itemEliminado = {
    ...item,
    materialOriginal: item.materialOriginal || item.material,
    activo: false,
  }

  const { error, requiereColumnaActivo } = await eliminarMaterialPrecio({
    supabase,
    item: itemEliminado,
    precios: preciosMateriales,
    preciosCompra: preciosCompraMateriales,
    normalizarPrecioMaterial,
  })

  if (error) {
    if (requiereColumnaActivo) {
      mostrarNotificacion('Para ocultar materiales base falta agregar la columna activo en Supabase.')
    } else {
      mostrarNotificacion('No se pudo eliminar el material: ' + error.message)
    }
    return
  }

  const quitarDeLista = (actuales) => {
    if (item.idArt) {
      const sinDuplicado = actuales.filter((actual) => !(
        actual.idArt && String(actual.idArt) === String(item.idArt)
      ))
      return [...sinDuplicado, itemEliminado]
    }

    return actuales.filter((actual) => (
      normalizarTextoComparacion(actual.material) !== normalizarTextoComparacion(item.material)
    ))
  }

  setCatalogoMaterialesGuardado(quitarDeLista)
  setCatalogoBalanceMateriales(quitarDeLista)
  setPreciosMateriales((actuales) => {
    const actualizados = { ...actuales }
    delete actualizados[item.material]
    return actualizados
  })
  setPreciosCompraMateriales((actuales) => {
    const actualizados = { ...actuales }
    delete actualizados[item.material]
    return actualizados
  })
  setPrecioMaterialEnEdicion(null)
  mostrarNotificacion('Material eliminado del catálogo')
}

async function guardarPreciosMateriales() {
  if (!puedeEditarPreciosMateriales || guardandoPreciosMateriales) return

  setGuardandoPreciosMateriales(true)
  const { error, catalogo: catalogoConfirmado } = await guardarPreciosMaterialesSupabase({
    supabase,
    catalogo: catalogoPreciosMaterialesCompleto,
    precios: preciosMateriales,
    preciosCompra: preciosCompraMateriales,
    normalizarPrecioMaterial,
  })

  setGuardandoPreciosMateriales(false)

  if (error) {
    mostrarNotificacion('No se pudieron guardar los precios: ' + error.message)
    return
  }

  setPrecioMaterialEnEdicion(null)
  if (catalogoConfirmado) {
    setCatalogoMaterialesGuardado(catalogoConfirmado)
  }
  mostrarNotificacion('Precios de materiales guardados correctamente')
}

async function generarDescargaProtocolosDiarios() {
  if (!puedeDescargarProtocolosDiarios || !fechaProtocolosDiarios || descargandoProtocolos) return

  setDescargandoProtocolos(true)
  try {
    const { registros, error } = await cargarProtocolosDiarios({
      supabase,
      fecha: fechaProtocolosDiarios,
    })
    if (error) {
      mostrarNotificacion('No se pudieron cargar los protocolos: ' + error.message)
      return
    }

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

      const { data, error } = await buscarUltimoModuloFinalizadoPorSerie({
        supabase,
        serie,
      })

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

    const resultado = await reintegrarModuloDesdeHistorial({
      supabase,
      moduloHistorial,
      linea: lineaReintegrar,
      extremo: extremoReintegrar,
    })

    if (!resultado.ok) {
      if (resultado.tipo === 'error_verificacion_activo') {
        mostrarNotificacion('No se pudo verificar el módulo activo: ' + resultado.error.message)
        return
      }

      if (resultado.tipo === 'ya_activo') {
        mostrarNotificacion('Ese módulo ya se encuentra activo en una línea')
        return
      }

      if (resultado.tipo === 'error_insert') {
        mostrarNotificacion('No se pudo reintegrar el módulo: ' + resultado.error.message)
        await cargarTablero()
        return
      }

      mostrarNotificacion('No se pudo reintegrar el módulo')
      await cargarTablero()
      return
    }

    if (resultado.tipo === 'reintegrado_sin_borrar_historial') {
      mostrarNotificacion('Módulo reintegrado, pero no se pudo retirar del historial: ' + resultado.error.message)
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

  let updatePayload = construirPayloadEdicionModulo({
    puedeEditarDatosModulo,
    perfil,
    formulariosElectricos,
    moduloSeleccionado,
    serieEditada,
    tipoEditado,
    proyectoEditado,
    responsableEditado,
    estadoEditado,
    lineaEditada,
    posicionEditada,
    notaEditada,
  })

  let moduloAntesCambio = null

  if (puedeEditarDatosModulo) {
    const { data: moduloActual, error: errorCargaModulo } = await cargarModuloParaEdicion({
      supabase,
      id: moduloSeleccionado.id,
    })

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

  if (shouldSetFechaPrueba) {
    updatePayload = aplicarDatosPruebaElectricaEnPayload({
      payload: updatePayload,
      moduloSeleccionado,
      moduloAntesCambio,
      serieEditada,
      tipoEditado,
      proyectoEditado,
      responsableEditado,
      lineaEditada,
      perfil,
      formatearFechaInput,
      completarDatosPruebaEnProtocolo,
    })
  }

  if (isEnGarantia) {
    updatePayload = aplicarGarantiaEnPayload({
      payload: updatePayload,
      moduloSeleccionado,
      fechaPruebaEditada,
      agregarNotaGarantiaProtocolo,
    })
  }

  let { error } = await actualizarModuloEditado({
    supabase,
    id: moduloSeleccionado.id,
    payload: updatePayload,
  })

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

  const { error } = await solicitarPruebaElectricaModulo({
    supabase,
    moduloId: moduloSeleccionado.id,
    usuarioId: usuario.id,
    materiales: perfil?.rol === 'electrico'
      ? formulariosElectricos[moduloSeleccionado.id] || {}
      : null,
  })

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

  const { error } = await guardarObservacionAlertaModulo({
    supabase,
    moduloId: moduloSeleccionado.id,
    observacion: observacionLimpia,
  })

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

  const { error } = await cancelarSolicitudPruebaElectricaModulo({
    supabase,
    moduloId: moduloSeleccionado.id,
  })

  if (error) {
    mostrarNotificacion(error.message)
    return
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
    mostrarNotificacion('No se pudo cargar el módulo para aprobar la prueba: ' + errorCargaModulo.message)
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

  const { error } = await aprobarPruebaElectricaModulo({
    supabase,
    moduloId: moduloSeleccionado.id,
    fechaPruebaDb,
    protocoloActualizado,
  })

  if (error) {
    mostrarNotificacion(error.message)
    return
  }

  await registrarAccionModulo({
    tipo: 'aprobacion_prueba_electrica',
    modulo: {
      ...moduloParaAprobar,
      estado: 'Prueba eléctrica',
      fecha_prueba_electrica: fechaPruebaDb,
    },
    datosAntes: moduloParaAprobar,
    datosDespues: {
      ...moduloParaAprobar,
      solicitud_prueba: false,
      estado: 'Prueba eléctrica',
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
    mostrarNotificacion('No se pudo cargar el módulo para rechazar la prueba: ' + errorCargaModulo.message)
    return
  }

  const { error } = await rechazarPruebaElectricaModulo({
    supabase,
    moduloId: moduloSeleccionado.id,
  })

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
  const { data, error } = await cargarSolicitantePrueba({
    supabase,
    idSolicitante,
    moduloId,
  })

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

  const { data, error } = await obtenerNombrePerfilPorId({
    supabase,
    idPerfil,
  })

  if (error) {
    console.error(error)
    return ''
  }

  return data?.nombre || ''
}

async function cargarMaterialesModulo(moduloId) {
  if (!moduloId) return

  setCargandoMateriales(true)
  const { data, error } = await cargarMaterialesModuloSupabase({
    supabase,
    moduloId,
  })
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

  const { data: registroActual, error: errorCarga } = await cargarMaterialesModuloSupabase({
    supabase,
    moduloId,
  })

  if (errorCarga) {
    mostrarNotificacion('No se pudieron cargar los materiales actuales: ' + errorCarga.message)
    return
  }

  const materialesFusionados = fusionarMaterialesEditados({
    materialesActuales: registroActual?.materiales || {},
    materialesLocales,
    camposEditados,
  })

  const { error } = await guardarMaterialesModuloSupabase({
    supabase,
    moduloId,
    materiales: materialesFusionados,
  })

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

  const { data: modulo, error } = await cargarDatosProtocoloModuloActivo({
    supabase,
    moduloId: moduloSeleccionado.id,
  })

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
    const { data: modulo, error } = await cargarModuloActualParaProtocolo({
      supabase,
      moduloId: item.id,
    })

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

    const {
      data: registroGuardado,
      error,
      mensaje,
    } = await guardarProtocoloManualMensualSupabase({
      supabase,
      moduloSeleccionado,
      protocoloNormalizado,
      fechaProtocolo,
      esManualExistente,
    })

    if (error) {
      mostrarNotificacion(mensaje || ('No se pudo guardar el protocolo manual: ' + error.message))
      return
    }

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

  const protocoloParaGuardar = esEstadoGarantia(moduloSeleccionado?.estado || protocolo?.estado)
    ? agregarNotaGarantiaProtocolo(protocolo, protocolo?.fecha || moduloSeleccionado?.fecha_prueba_electrica)
    : protocolo

  const {
    data: registroGuardado,
    error,
    mensaje,
  } = await guardarProtocoloModuloSupabase({
    supabase,
    moduloSeleccionado,
    protocoloParaGuardar,
    protocoloDesdeHistorial,
  })

  if (error) {
    mostrarNotificacion(mensaje || ('No se pudo guardar el protocolo: ' + error.message))
    return
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

  const { data: modulo, error: errorModulo } = await cargarModuloPorId({
    supabase,
    id: moduloSeleccionado.id,
  })

  if (errorModulo) {
    mostrarNotificacion(errorModulo.message)
    return
  }

  if (normalizarTexto(modulo.estado) === 'sin instalacion') {
    const { error: errorDeleteSinInstalacion } = await eliminarModuloActivo({
      supabase,
      id: modulo.id,
    })

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

  const historialPayload = construirHistorialModulo({
    modulo,
    protocoloHistorial,
  })

  const {
    data: historialCreado,
    error: errorHistorial,
    historialPayload: historialGuardadoPayload,
  } = await guardarHistorialModuloFinalizado({
    supabase,
    historialPayload,
  })

  if (errorHistorial) {
    mostrarNotificacion(errorHistorial.message)
    return
  }

  const { error: errorDelete } = await eliminarModuloActivo({
    supabase,
    id: modulo.id,
  })

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
    datosDespues: historialCreado || historialGuardadoPayload,
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

  const { error } = await eliminarModuloActivo({
    supabase,
    id: moduloSeleccionado.id,
  })

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

  try {
    const resultado = await moverModuloEnTablero({
      supabase,
      moduloId,
      lineaDestino,
      posicionDestino,
    })

    if (!resultado.ok) {
      if (resultado.tipo === 'modulo_invalido') {
        mostrarNotificacion('Error: Módulo inválido')
        return
      }

      if (resultado.tipo === 'error_carga') {
        mostrarNotificacion('Error al cargar módulos: ' + resultado.error.message)
        return
      }

      if (resultado.tipo === 'no_encontrado') {
        mostrarNotificacion('Error: No se encontró el módulo')
        return
      }

      if (resultado.tipo === 'linea_llena') {
        mostrarNotificacion(`La línea ${resultado.lineaDestino} ya está completa`)
        return
      }

      mostrarNotificacion('Error desconocido al mover el módulo')
      return
    }

    await cargarTablero()

    if (resultado.tipo === 'misma_posicion') {
      mostrarNotificacion('El módulo ya está en esa posición')
    } else if (resultado.tipo === 'insertado_misma_linea') {
      mostrarNotificacion('Módulo insertado correctamente')
    } else if (resultado.tipo === 'agregado_otra_linea') {
      mostrarNotificacion('Módulo agregado a la línea correctamente')
    } else {
      mostrarNotificacion(resultado.tipo === 'intercambiado' ? 'Módulos intercambiados correctamente' : 'Módulo movido correctamente')
    }
  } catch (err) {
    console.error(err)
    mostrarNotificacion('Error: ' + (err?.message || 'Error desconocido'))
    await cargarTablero()
  }
}

  const {
    modulosActivos,
    ocupacion,
    canalizados,
    cableados,
    terminaciones,
    pruebas,
    pruebasElectricasHoy,
    terminadosHoy,
    pruebasElectricasMes,
    ultimosFinalizados,
  } = calcularIndicadoresTablero(datos, historial)

  

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
          <RegistroAcciones
            visible={mostrarRegistroAcciones}
            acciones={accionesDia}
            cargando={cargandoAccionesDia}
            mostrarTodas={mostrarTodasAccionesDia}
            nombreTipoAccion={nombreTipoAccion}
            onToggle={async (e) => {
              e.stopPropagation()
              const abrir = !mostrarRegistroAcciones
              cerrarVentanasEmergentes()
              setMostrarRegistroAcciones(abrir)
              setMostrarTodasAccionesDia(false)
              if (abrir) await cargarAccionesDia()
            }}
            onToggleVerMas={() => setMostrarTodasAccionesDia((actual) => !actual)}
            onActualizar={cargarAccionesDia}
            onDeshacer={deshacerAccionModulo}
          />
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
              {'\u{1F514}'}
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
  {puedeVerBalanceMateriales && (
    <button
      onClick={(e) => {
        e.stopPropagation()
        abrirBalanceMateriales()
      }}
      style={{
        padding: '10px 20px',
        borderRadius: '8px',
        cursor: 'pointer',
        background: '#37474f',
        color: 'white',
        border: '1px solid #78909c',
      }}
    >
      Balance materiales
    </button>
  )}
  {puedeVerValesBodega && (
    <button
      onClick={(e) => {
        e.stopPropagation()
        abrirValesBodega()
      }}
      style={{
        padding: '10px 20px',
        borderRadius: '8px',
        cursor: 'pointer',
        background: '#4e342e',
        color: 'white',
        border: '1px solid #8d6e63',
      }}
    >
      Vales bodega
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
          <span style={{ display: 'block', fontSize: '24px', marginTop: '4px' }}>{'\u{1F4DC}'}</span>
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
                            {'\u{1F6A8}'}
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
                            {'\u{1F4DD}'}
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
                            {'\u{1F6A8}'}
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
                            {'\u{1F4DD}'}
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
          <h2 style={{ marginTop: 0 }}>{'\u26A1'} PRUEBA ELÉCTRICA SOLICITADA</h2>
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
  <ModalModulo>
    <EncabezadoModalModulo
      puedeVerMenuModulo={puedeVerMenuModulo}
      puedeFinalizarModulos={puedeFinalizarModulos}
      puedeEliminarModulo={perfil?.rol === 'admin'}
      mostrarMenuModulo={mostrarMenuModulo}
      pruebaBloqueada={
        esEstadoPruebaElectrica(moduloSeleccionado?.estado) ||
        esSolicitudPruebaActiva(moduloSeleccionado?.solicitud_prueba)
      }
      puedeDejarObservacionAlerta={puedeDejarObservacionAlerta}
      onToggleMenu={(e) => {
        e.stopPropagation()
        setMostrarMenuModulo((actual) => !actual)
      }}
      onEliminarModulo={() => {
        setMostrarMenuModulo(false)
        eliminarModuloSinRegistro()
      }}
      onAbrirEditorMateriales={abrirEditorMateriales}
      onSolicitarPrueba={() => {
        setMostrarMenuModulo(false)
        solicitarPruebaElectrica()
      }}
      onDejarObservacion={dejarObservacionAlerta}
      onFinalizarModulo={finalizarModulo}
    />

    {perfil?.rol === 'electrico' ? (
      <VistaElectricoModulo
        serieEditada={serieEditada}
        tipoEditado={tipoEditado}
        proyectoEditado={proyectoEditado}
        notaEditada={notaEditada}
        setNotaEditada={setNotaEditada}
      >
        <FormularioElectrico
          secciones={seccionesFormularioElectrico}
          valores={formulariosElectricos[moduloSeleccionado?.id] || {}}
          onChange={actualizarMaterialFormulario}
        />
      </VistaElectricoModulo>
    ) : (
      <FormularioDatosModulo
        serieEditada={serieEditada}
        setSerieEditada={setSerieEditada}
        tipoEditado={tipoEditado}
        setTipoEditado={setTipoEditado}
        proyectoEditado={proyectoEditado}
        setProyectoEditado={setProyectoEditado}
        lineaEditada={lineaEditada}
        setLineaEditada={setLineaEditada}
        estadoEditado={estadoEditado}
        setEstadoEditado={setEstadoEditado}
        fechaPruebaEditada={fechaPruebaEditada}
        setFechaPruebaEditada={setFechaPruebaEditada}
        responsableEditado={responsableEditado}
        setResponsableEditado={setResponsableEditado}
        notaEditada={notaEditada}
        setNotaEditada={setNotaEditada}
        puedeEditarDatosModulo={puedeEditarDatosModulo}
        esTipoBodega={esTipoBodega}
        estaDentroDeGarantia={estaDentroDeGarantia}
      />
    )}
    <BotonesModalModulo
      perfilRol={perfil?.rol}
      moduloSeleccionado={moduloSeleccionado}
      puedeEditarDatosModulo={puedeEditarDatosModulo}
      puedeUsarProtocolo={puedeUsarProtocolo}
      esEstadoPruebaElectrica={esEstadoPruebaElectrica}
      esSolicitudPruebaActiva={esSolicitudPruebaActiva}
      onGuardarCambios={guardarCambios}
      onSolicitarPrueba={solicitarPruebaElectrica}
      onCancelarSolicitudPrueba={cancelarSolicitudPruebaElectrica}
      onAbrirResumenMateriales={abrirResumenMateriales}
      onAbrirProtocolo={abrirProtocoloEntrega}
      onCerrar={limpiarEstadosModal}
    />
  </ModalModulo>
)}

{mostrarResumenMateriales && moduloSeleccionado && (
  <ResumenMaterialesModal
    modulo={moduloSeleccionado}
    cargandoMateriales={cargandoMateriales}
    resumenMateriales={resumenMateriales}
    onCerrar={() => setMostrarResumenMateriales(false)}
    onClickFondo={cerrarPanelesFlotantes}
  />
)}

{mostrarEditorMateriales && moduloSeleccionado && puedeVerMenuModulo && (
  <EditorMaterialesModal
    modulo={moduloSeleccionado}
    cargandoMateriales={cargandoMateriales}
    onGuardar={guardarMaterialesModulo}
    onCerrar={cerrarEditorMateriales}
    onClickFondo={cerrarPanelesFlotantes}
  >
    <FormularioElectrico
      secciones={seccionesFormularioElectrico}
      valores={formulariosElectricos[moduloSeleccionado?.id] || {}}
      onChange={actualizarMaterialFormulario}
    />
  </EditorMaterialesModal>
)}

{mostrarProtocolosMensuales && puedeVerProtocolosMensuales && (
  <ProtocolosMensualesModal onClickFondo={cerrarPanelesFlotantes}>
    <ProtocolosMensualesToolbar
      ingresos={ingresosProtocolosMensuales}
      formatearPrecio={formatearPrecioMaterial}
      rango={rangoProtocolosMensuales}
      fecha={fechaProtocolosMensuales}
      busqueda={busquedaProtocolosMensuales}
      totalResultados={protocolosMensuales.length}
      resultadosFiltrados={protocolosMensualesFiltrados.length}
      cargando={cargandoProtocolosMensuales}
      onCerrar={() => setMostrarProtocolosMensuales(false)}
      onIngresoManual={abrirIngresoManualProtocolo}
      onCambiarRango={(nuevoRango) => {
        setRangoProtocolosMensuales(nuevoRango)
        setFechaProtocolosMensuales(obtenerValorInicialRangoProtocolo(nuevoRango))
      }}
      onCambiarFecha={setFechaProtocolosMensuales}
      onActualizar={() => cargarProtocolosMensuales(fechaProtocolosMensuales, rangoProtocolosMensuales)}
      onCambiarBusqueda={setBusquedaProtocolosMensuales}
      onLimpiarBusqueda={() => setBusquedaProtocolosMensuales('')}
    />

    <ProtocolosMensualesTabla
      protocolos={protocolosMensuales}
      protocolosFiltrados={protocolosMensualesFiltrados}
      cargando={cargandoProtocolosMensuales}
      encabezados={encabezadosProtocolosMensuales}
      conteoClaves={conteoClavesProtocolos}
      puedeEliminarProtocolosMensuales={puedeEliminarProtocolosMensuales}
      BotonValorCobro={(props) => (
        <BotonValorCobro {...props} onAbrirDetalle={abrirDetalleCobro} />
      )}
      formatearFecha={formatearFecha}
      formatearPrecio={formatearPrecioMaterial}
      claveProtocoloUnico={claveProtocoloUnico}
      idOtEnEdicion={idOtEnEdicion}
      idsOtEnEdicion={idsOtEnEdicion}
      setIdsOtEnEdicion={setIdsOtEnEdicion}
      setIdOtEnEdicion={setIdOtEnEdicion}
      separarIdsOt={separarIdsOt}
      unirIdsOt={unirIdsOt}
      onEliminar={eliminarProtocoloMensual}
      onAbrirProtocolo={abrirProtocoloDesdeBusqueda}
      onGuardarIdOt={guardarIdOtProtocoloMensual}
    />

  </ProtocolosMensualesModal>
)}

{mostrarBalanceMateriales && puedeVerBalanceMateriales && (
  <BalanceMaterialesModal
    rango={rangoBalanceMateriales}
    fecha={fechaBalanceMateriales}
    cargando={cargandoBalanceMateriales}
    filas={balanceMateriales}
    configMateriales={configBalanceMateriales}
    materialesCatalogados={catalogoPreciosMaterialesCompleto.flatMap((item) => [
      item.material,
      item.materialOriginal,
    ]).filter(Boolean)}
    catalogoPrecios={catalogoPreciosMaterialesCompleto}
    preciosMateriales={preciosMateriales}
    preciosCompraMateriales={preciosCompraMateriales}
    formatearPrecio={formatearPrecioMaterial}
    onCambiarRango={(nuevoRango) => {
      setRangoBalanceMateriales(nuevoRango)
      setFechaBalanceMateriales(obtenerValorInicialRangoProtocolo(nuevoRango))
    }}
    onCambiarFecha={setFechaBalanceMateriales}
    onActualizar={() => cargarBalanceMateriales(fechaBalanceMateriales, rangoBalanceMateriales)}
    onActualizarConfigMaterial={actualizarConfigBalanceMaterial}
    onCerrar={() => setMostrarBalanceMateriales(false)}
    onClickFondo={cerrarPanelesFlotantes}
  />
)}

{mostrarValesBodega && puedeVerValesBodega && (
  <ValesBodegaModal
    fecha={fechaValeBodega}
    archivo={archivoValeBodega}
    filas={filasValeBodega}
    valesDia={valesBodegaDia}
    cargando={leyendoValeBodega}
    cargandoValesDia={cargandoValesBodegaDia}
    guardando={guardandoValeBodega}
    opcionesMaterialBalance={opcionesMaterialesBalance}
    onCambiarFecha={cambiarFechaValeBodega}
    onCambiarArchivo={setArchivoValeBodega}
    onLeerVale={leerValeBodega}
    onAgregarFila={() => agregarFilaValeBodega()}
    onActualizarFila={actualizarFilaValeBodega}
    onEliminarFila={eliminarFilaValeBodega}
    onGuardar={guardarValeBodega}
    onCerrar={() => setMostrarValesBodega(false)}
    onClickFondo={cerrarPanelesFlotantes}
  />
)}

{mostrarPreciosMateriales && puedeVerPreciosMateriales && (
  <PreciosMaterialesModal
    puedeEditar={puedeEditarPreciosMateriales}
    cargando={cargandoPreciosMateriales}
    guardando={guardandoPreciosMateriales}
    secciones={seccionesCatalogoPreciosCompleto}
    catalogo={catalogoPreciosMaterialesCompleto}
    precios={preciosMateriales}
    preciosCompra={preciosCompraMateriales}
    precioEnEdicion={precioMaterialEnEdicion}
    formatearPrecio={formatearPrecioMaterial}
    onActualizarPrecio={actualizarPrecioMaterial}
    onCambiarEdicion={setPrecioMaterialEnEdicion}
    onRenombrarMaterial={renombrarMaterialCatalogoPrecios}
    onAgregarMaterial={agregarMaterialCatalogoPrecios}
    onEliminarMaterial={eliminarMaterialCatalogoPrecios}
    onGuardar={guardarPreciosMateriales}
    onCerrar={() => setMostrarPreciosMateriales(false)}
    onClickFondo={cerrarPanelesFlotantes}
  />
)}

{detalleCobroSeleccionado && (
  <DetalleCobroModal
    detalle={detalleCobroSeleccionado}
    puedeAjustar={puedeAjustarValoresProtocolos}
    ajusteCobro={ajusteCobroMensual}
    setAjusteCobro={setAjusteCobroMensual}
    formatearPrecio={formatearPrecioMaterial}
    claveItemCobro={claveItemCobro}
    onGuardarAjuste={guardarAjusteValorizacionProtocolo}
    onCerrar={() => setDetalleCobroSeleccionado(null)}
    onClickFondo={cerrarPanelesFlotantes}
  />
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
  <ReintegrarModuloModal
    ultimosFinalizados={ultimosFinalizados}
    historialSeleccionado={historialSeleccionadoReintegrar}
    serie={serieReintegrar}
    linea={lineaReintegrar}
    extremo={extremoReintegrar}
    reintegrando={reintegrandoModulo}
    formatearFecha={formatearFecha}
    onSeleccionarHistorial={seleccionarHistorialParaReintegrar}
    onCambiarSerie={setSerieReintegrar}
    onLimpiarHistorialSeleccionado={() => setHistorialSeleccionadoReintegrar(null)}
    onCambiarLinea={setLineaReintegrar}
    onCambiarExtremo={setExtremoReintegrar}
    onReintegrar={reintegrarModuloFinalizado}
    onCerrar={() => setMostrarReintegrar(false)}
  />
)}

{mostrarKPI && (
  <div className="kpi-grid">
    <div style={{ color: '#ccc' }}>KPIs próximos a implementarse</div>
  </div>
)}

{mostrarDescargaProtocolos && puedeDescargarProtocolosDiarios && (
  <DescargaProtocolosDiariosModal
    fecha={fechaProtocolosDiarios}
    descargando={descargandoProtocolos}
    onCambiarFecha={setFechaProtocolosDiarios}
    onDescargar={generarDescargaProtocolosDiarios}
    onCerrar={() => setMostrarDescargaProtocolos(false)}
  />
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

