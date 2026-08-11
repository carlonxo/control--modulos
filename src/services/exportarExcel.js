import * as XLSX from 'xlsx'
import { formatearFecha, parseLocalDate } from '../utils/fechas'

export function exportarHistorialExcel(historial, fechaDesde, fechaHasta) {
  if (!historial || historial.length === 0) {
    alert('No hay datos para exportar')
    return
  }

  const filtrado = historial.filter((item) => {
    const fecha = new Date(item.fecha_ingreso)
    const desde = fechaDesde ? parseLocalDate(fechaDesde) : null
    const hasta = fechaHasta ? parseLocalDate(fechaHasta) : null

    if (desde) {
      desde.setHours(0, 0, 0, 0)
    }

    if (hasta) {
      hasta.setHours(23, 59, 59, 999)
    }

    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false

    return true
  })

  const datos = filtrado.map((item) => ({
    Serie: item.serie,
    Tipo: item.tipo,
    Proyecto: item.proyecto,
    Estado: item.estado,
    Linea: item.linea,
    Posicion: item.posicion,
    FechaIngreso: formatearFecha(item.fecha_ingreso),
    FechaPruebaElectrica: formatearFecha(item.fecha_prueba_electrica),
    FechaSalida: formatearFecha(item.fecha_salida),
    Nota: item.nota,
  }))

  const hoja = XLSX.utils.json_to_sheet(datos)
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Historial')
  XLSX.writeFile(libro, `historial_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportarInventarioBodegaExcel(inventario) {
  if (!inventario?.items?.length) {
    alert('No hay inventario para exportar')
    return
  }

  const fechaExportacion = new Date().toISOString().slice(0, 10)
  const fechaInventario = inventario.fecha || fechaExportacion
  const nombreHoja = limpiarNombreHoja(inventario.hoja || `inv. ${formatearFechaHoja(fechaInventario)}`)

  const filas = [
    ['', '', '', '', '', '', '', 'salida', 'vales de salida', 'vales de salida'],
    ['', '', '', '', '', '', fechaInventario, fechaExportacion, '', ''],
    ['Recurso', 'Descripción', 'Unidad', 'Entradas', 'Salidas', 'Saldo inicial', 'saldo', 'saldo', '', ''],
    ...inventario.items.map((item) => ([
      item.codigo || '',
      item.descripcion || '',
      item.unidad || '',
      numeroExcel(item.entradas),
      numeroExcel(item.salidas),
      numeroExcel(item.saldoInicial),
      numeroExcel(item.saldoFinal),
      numeroExcel(item.saldoFinal),
      '',
      '',
    ])),
  ]

  const hoja = XLSX.utils.aoa_to_sheet(filas)
  hoja['!cols'] = [
    { wch: 18 },
    { wch: 56 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
  ]
  hoja['!autofilter'] = { ref: `A3:H${filas.length}` }

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja)
  XLSX.writeFile(libro, `inventario_bodega_${fechaInventario}.xlsx`)
}

function numeroExcel(valor) {
  const numero = Number(valor || 0)
  return Number.isFinite(numero) ? numero : 0
}

function formatearFechaHoja(fecha) {
  const partes = String(fecha || '').slice(0, 10).split('-')
  if (partes.length !== 3) return String(fecha || '').slice(0, 31)
  return `${partes[2]}-${partes[1]}-${partes[0].slice(2)}`
}

function limpiarNombreHoja(nombre) {
  return String(nombre || 'Inventario')
    .replace(/[\\/?*[\]:]/g, ' ')
    .slice(0, 31)
}
