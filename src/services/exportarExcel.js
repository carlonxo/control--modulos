import * as XLSX from 'xlsx'
import { parseLocalDate } from '../utils/fechas'

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
    FechaIngreso: item.fecha_ingreso,
    FechaPruebaElectrica: item.fecha_prueba_electrica,
    Nota: item.nota,
  }))

  const hoja = XLSX.utils.json_to_sheet(datos)
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Historial')
  XLSX.writeFile(libro, `historial_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
