import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { formatearFecha, parseLocalDate } from '../utils/fechas'
import plantillaValeBodegaUrl from '../assets/vales-template.xlsx?url'

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

export async function exportarPedidosBodegaExcel(pedidos = []) {
  const pedidosValidos = (pedidos || []).filter((pedido) => (pedido.items || []).length > 0)

  if (pedidosValidos.length === 0) {
    alert('No hay pedidos con materiales para imprimir')
    return
  }

  const grupos = agruparPedidosParaVales(pedidosValidos)
  const fecha = pedidosValidos[0]?.fecha || new Date().toISOString().slice(0, 10)

  if (grupos.length === 1) {
    const blob = await crearValePedidosGrupoDesdePlantilla(grupos[0])
    descargarBlob(blob, `vale_${nombreArchivoSeguro(grupos[0].proyecto || fecha)}.xlsx`)
    return
  }

  const zip = new JSZip()
  for (const [indice, grupo] of grupos.entries()) {
    const blob = await crearValePedidosGrupoDesdePlantilla(grupo)
    const sufijo = grupo.bloque > 1 ? `_parte_${grupo.bloque}` : ''
    const nombre = `vale_${nombreArchivoSeguro(grupo.proyecto || `vale_${indice + 1}`)}${sufijo}.xlsx`
    zip.file(nombre, blob)
  }

  const blobZip = await zip.generateAsync({ type: 'blob' })
  descargarBlob(blobZip, `vales_bodega_${fecha}.zip`)
}

function extraerDatoObservacion(observacion = '', etiqueta = '') {
  const etiquetaNormalizada = String(etiqueta || '').toLowerCase()
  const parte = String(observacion || '')
    .split('|')
    .map((item) => item.trim())
    .find((item) => item.toLowerCase().startsWith(`${etiquetaNormalizada}:`))

  return parte ? parte.split(':').slice(1).join(':').trim() : ''
}

function agruparPedidosParaVales(pedidos = []) {
  const gruposPorProyecto = new Map()

  pedidos.forEach((pedido) => {
    const proyecto = pedido.proyecto || extraerDatoObservacion(pedido.observacion, 'proyecto') || 'Sin proyecto'
    const clave = normalizarClaveVale(proyecto)
    if (!gruposPorProyecto.has(clave)) {
      gruposPorProyecto.set(clave, { proyecto, pedidos: [] })
    }
    gruposPorProyecto.get(clave).pedidos.push(pedido)
  })

  return Array.from(gruposPorProyecto.values()).flatMap((grupo) => {
    const chunks = []
    for (let indice = 0; indice < grupo.pedidos.length; indice += 5) {
      chunks.push({
        proyecto: grupo.proyecto,
        bloque: Math.floor(indice / 5) + 1,
        pedidos: grupo.pedidos.slice(indice, indice + 5),
      })
    }
    return chunks
  })
}

function normalizarClaveVale(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

async function crearValePedidosGrupoDesdePlantilla(grupo = {}) {
  const respuesta = await fetch(plantillaValeBodegaUrl)
  const buffer = await respuesta.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)
  let sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string')
  let sharedStringsXml = await zip.file('xl/sharedStrings.xml').async('string')
  const sharedStrings = crearEditorSharedStrings(sharedStringsXml)

  const pedidos = grupo.pedidos || []
  const primerPedido = pedidos[0] || {}
  const fecha = primerPedido.fecha || new Date().toISOString().slice(0, 10)
  const proyecto = grupo.proyecto || primerPedido.proyecto || extraerDatoObservacion(primerPedido.observacion, 'proyecto') || ''
  const tipos = [...new Set(pedidos.map((pedido) => (
    pedido.tipo_modulo || extraerDatoObservacion(pedido.observacion, 'tipo modulo') || ''
  )).filter(Boolean))]
  const tipoModulo = tipos.length === 1 ? tipos[0] : tipos.length > 1 ? 'VARIOS' : ''
  const lineas = [...new Set(pedidos.map((pedido) => (
    pedido.linea || extraerDatoObservacion(pedido.observacion, 'linea') || ''
  )).filter(Boolean))]
  const linea = lineas.length === 1 ? lineas[0] : lineas.length > 1 ? 'VARIAS' : ''

  sheetXml = setCellValue(sheetXml, 'C3', excelSerialFecha(fecha), 'number', sharedStrings)
  sheetXml = setCellValue(sheetXml, 'J4', 'X', 'string', sharedStrings)
  sheetXml = setCellValue(sheetXml, 'D5', proyecto, 'string', sharedStrings)
  sheetXml = setCellValue(sheetXml, 'X5', linea, linea ? 'string' : 'blank', sharedStrings)
  sheetXml = setCellValue(sheetXml, 'E6', tipoModulo, 'string', sharedStrings)

  const columnasSeries = ['T', 'W', 'Z', 'AD', 'AG']
  columnasSeries.forEach((columna, indice) => {
    const pedido = pedidos[indice]
    const serie = pedido?.serie || extraerDatoObservacion(pedido?.observacion, 'serie') || ''
    sheetXml = setCellValue(sheetXml, `${columna}8`, serie, serie ? 'string' : 'blank', sharedStrings)
  })

  for (let fila = 9; fila <= 55; fila += 1) {
    ;['A', 'B', 'F', 'Q', 'T', 'W', 'Z', 'AD', 'AG', 'AH'].forEach((columna) => {
      sheetXml = setCellValue(sheetXml, `${columna}${fila}`, '', 'blank', sharedStrings)
    })
  }

  const materiales = compilarMaterialesPedidosPorSerie(pedidos)
  materiales.slice(0, 47).forEach((material, indice) => {
    const fila = 9 + indice
    sheetXml = setCellValue(sheetXml, `A${fila}`, indice + 1, 'number', sharedStrings)
    sheetXml = setCellValue(sheetXml, `B${fila}`, material.codigo, 'string', sharedStrings)
    sheetXml = setCellValue(sheetXml, `F${fila}`, material.descripcion, 'string', sharedStrings)
    sheetXml = setCellValue(sheetXml, `Q${fila}`, material.unidad, material.unidad ? 'string' : 'blank', sharedStrings)

    columnasSeries.forEach((columna, indiceSerie) => {
      const cantidad = material.cantidades[indiceSerie] || 0
      sheetXml = setCellValue(sheetXml, `${columna}${fila}`, cantidad || '', cantidad ? 'number' : 'blank', sharedStrings)
    })

    sheetXml = setCellValue(sheetXml, `AH${fila}`, material.total, material.total ? 'number' : 'blank', sharedStrings)
  })

  zip.file('xl/sharedStrings.xml', sharedStrings.finalizar())
  zip.file('xl/worksheets/sheet1.xml', sheetXml)
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function compilarMaterialesPedidosPorSerie(pedidos = []) {
  const mapa = new Map()

  pedidos.forEach((pedido, indicePedido) => {
    ;(pedido.items || []).forEach((item) => {
      const codigo = String(item.material_vale || item.codigo || '').trim()
      const descripcion = String(item.material_balance || item.material_vale || '').trim()
      const unidad = String(item.unidad || '').trim()
      const clave = `${normalizarClaveVale(codigo)}|${normalizarClaveVale(descripcion)}`

      if (!mapa.has(clave)) {
        mapa.set(clave, {
          codigo,
          descripcion,
          unidad,
          cantidades: [0, 0, 0, 0, 0],
          total: 0,
        })
      }

      const registro = mapa.get(clave)
      const cantidad = numeroExcel(item.cantidad)
      registro.cantidades[indicePedido] += cantidad
      registro.total += cantidad
    })
  })

  return Array.from(mapa.values())
}

function crearEditorSharedStrings(xml) {
  let contenido = xml
  let cantidad = (contenido.match(/<si>/g) || []).length

  return {
    agregar(valor) {
      const indice = cantidad
      const si = `<si><t>${escapeXml(valor)}</t></si>`
      contenido = contenido.replace('</sst>', `${si}</sst>`)
      cantidad += 1
      return indice
    },
    finalizar() {
      return contenido
        .replace(/\scount="[^"]*"/, ` count="${cantidad}"`)
        .replace(/\suniqueCount="[^"]*"/, ` uniqueCount="${cantidad}"`)
    },
  }
}

function setCellValue(sheetXml, ref, value, type = 'string', sharedStrings = null) {
  const celdaRegex = new RegExp(`<c\\s+([^>]*\\br="${ref}"[^>]*)\\s*\\/\\s*>|<c\\s+([^>]*\\br="${ref}"[^>]*)>(?:[\\s\\S]*?)<\\/c>`)
  const reemplazo = (atributos1, atributos2) => {
    const atributos = limpiarAtributosCelda(atributos1 || atributos2 || `r="${ref}"`, ref, type, sharedStrings)
    const contenido = contenidoCelda(value, type, sharedStrings)
    return contenido ? `<c ${atributos}>${contenido}</c>` : `<c ${atributos}/>`
  }

  if (celdaRegex.test(sheetXml)) {
    return sheetXml.replace(celdaRegex, (match, atributos1, atributos2) => reemplazo(atributos1, atributos2))
  }

  const fila = ref.match(/\d+/)?.[0]
  if (!fila) return sheetXml

  const rowRegex = new RegExp(`(<row[^>]*\\br="${fila}"[^>]*>)([\\s\\S]*?)(<\\/row>)`)
  if (!rowRegex.test(sheetXml)) return sheetXml

  return sheetXml.replace(rowRegex, (match, inicio, contenido, cierre) => (
    `${inicio}${contenido}${reemplazo(`r="${ref}"`, '')}${cierre}`
  ))
}

function limpiarAtributosCelda(atributos, ref, type, sharedStrings = null) {
  let salida = atributos
    .replace(/\st="[^"]*"/g, '')
    .replace(/\scm="[^"]*"/g, '')
    .replace(/\sph="[^"]*"/g, '')
    .replace(/\s*\/\s*$/, '')

  if (!/\sr="/.test(` ${salida}`)) {
    salida = `r="${ref}" ${salida}`.trim()
  }

  if (type === 'string') {
    salida += sharedStrings ? ' t="s"' : ' t="inlineStr"'
  }

  return salida.trim()
}

function contenidoCelda(value, type, sharedStrings = null) {
  if (type === 'blank' || value === null || value === undefined || value === '') return ''
  if (type === 'number') return `<v>${numeroExcel(value)}</v>`
  if (sharedStrings) return `<v>${sharedStrings.agregar(value)}</v>`
  return `<is><t>${escapeXml(value)}</t></is>`
}

function excelSerialFecha(fecha) {
  const fechaLocal = parseLocalDate(String(fecha || '').slice(0, 10))
  if (!fechaLocal || Number.isNaN(fechaLocal.getTime())) return excelSerialFecha(new Date().toISOString().slice(0, 10))
  const utc = Date.UTC(fechaLocal.getFullYear(), fechaLocal.getMonth(), fechaLocal.getDate())
  return Math.round(utc / 86400000 + 25569)
}

function escapeXml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

function nombreArchivoSeguro(valor) {
  return String(valor || 'vale')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 80)
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
