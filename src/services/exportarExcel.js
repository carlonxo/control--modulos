import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { formatearFecha, obtenerRangoFechasProtocolos, parseLocalDate } from '../utils/fechas'
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

export function exportarProyeccionMaterialesExcel(filas = [], periodos = [], periodosFuturos = []) {
  if (!filas.length) {
    alert('No hay materiales para exportar')
    return
  }

  const encabezadosMeses = periodos.map((periodo, indice) => {
    const nombre = nombrePeriodoExcel(periodo)
    if (indice === 0) return `${nombre} (base ${nombrePeriodoExcel(periodos[1])})`
    if (indice === 2) return `Estimado ${nombre}`
    return nombre
  })
  const encabezadosFuturos = periodosFuturos.map((periodo) => `Estimado ${nombrePeriodoExcel(periodo)}`)
  const encabezados = [
    'Código',
    'Material',
    ...encabezadosMeses,
    'Promedio',
    ...encabezadosFuturos,
    'Proyección 3 meses',
  ]
  const filasExcel = filas.map((fila) => ([
    fila.codigo || '',
    fila.material || '',
    ...(fila.meses || []).map(numeroExcel),
    numeroExcel(fila.promedio),
    ...periodosFuturos.map(() => numeroExcel(fila.estimadoMensual)),
    numeroExcel(fila.estimadoTresMeses),
  ]))
  const fechaExportacion = new Date().toISOString().slice(0, 10)
  const datos = [
    ['Proyección de materiales'],
    [`Generado: ${fechaExportacion}`],
    ['Basado exclusivamente en pedidos de bodega entregados.'],
    [],
    encabezados,
    ...filasExcel,
  ]
  const hoja = XLSX.utils.aoa_to_sheet(datos)
  const ultimaColumna = XLSX.utils.encode_col(encabezados.length - 1)
  hoja['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: encabezados.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: encabezados.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: encabezados.length - 1 } },
  ]
  hoja['!cols'] = [
    { wch: 20 },
    { wch: 52 },
    ...encabezados.slice(2).map(() => ({ wch: 19 })),
  ]
  hoja['!autofilter'] = { ref: `A5:${ultimaColumna}${datos.length}` }
  hoja['!rows'] = [{ hpt: 24 }, { hpt: 19 }, { hpt: 19 }, {}, { hpt: 32 }]

  for (let fila = 6; fila <= datos.length; fila += 1) {
    for (let columna = 2; columna < encabezados.length; columna += 1) {
      asignarFormatoNumero(hoja, `${XLSX.utils.encode_col(columna)}${fila}`, '#,##0.0')
    }
  }

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Proyección')
  XLSX.writeFile(libro, `proyeccion_materiales_${fechaExportacion}.xlsx`)
}

function nombrePeriodoExcel(periodo = '') {
  const [anio, mes] = String(periodo).split('-').map(Number)
  if (!anio || !mes) return String(periodo || '')
  const nombreMes = new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date(anio, mes - 1, 1))
  return `${nombreMes} ${anio}`
}

export async function exportarDetalleReutilizadosExcel(registros = [], opciones = {}) {
  const registrosConReutilizados = construirDetalleReutilizadosPorRegistro(registros)

  if (registrosConReutilizados.length === 0) {
    alert('No hay materiales reutilizados para imprimir en el rango seleccionado.')
    return
  }

  const filasDetalle = []
  const gruposDetalle = []
  let contadorModulo = 0

  registrosConReutilizados.forEach((registro) => {
    contadorModulo += 1
    const filaInicioGrupo = 7 + filasDetalle.length
    registro.items.forEach((item, indiceItem) => {
      filasDetalle.push([
        indiceItem === 0 ? contadorModulo : '',
        indiceItem === 0 ? registro.modulo : '',
        indiceItem === 0 ? registro.fecha : '',
        item.insumo,
        item.cantidad,
        item.valorCompleto,
        item.valorReutilizado,
      ])
    })
    gruposDetalle.push({
      inicio: filaInicioGrupo,
      fin: filaInicioGrupo + registro.items.length - 1,
    })
  })

  const montoAdeudado = filasDetalle.reduce((total, fila) => total + numeroExcel(fila[6]), 0)
  const periodo = describirPeriodoInformeReutilizados(opciones.rango, opciones.fecha)
  const filas = [
    ['', 'Listado Insumos Reutilizados y Valoración del 50%', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['', 'Período:', '', periodo, '', '', ''],
    ['', 'Monto Adeudado:', '', montoAdeudado, '', '', ''],
    ['', '', '', '', '', '', ''],
    ['N°', 'Módulo', 'Fecha', 'Insumo', 'Cantidad', 'Valor', '50%'],
    ...filasDetalle,
  ]

  const hoja = XLSX.utils.aoa_to_sheet(filas)
  hoja['!cols'] = [
    { wch: 8 },
    { wch: 16 },
    { wch: 14 },
    { wch: 46 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
  ]
  hoja['!merges'] = [{ s: { r: 0, c: 1 }, e: { r: 0, c: 6 } }]
  hoja['!autofilter'] = { ref: `A6:G${filas.length}` }

  asignarFormatoNumero(hoja, 'D4', '$ #,##0')
  for (let fila = 7; fila <= filas.length; fila += 1) {
    asignarFormatoNumero(hoja, `E${fila}`, '#,##0.##')
    asignarFormatoNumero(hoja, `F${fila}`, '$ #,##0')
    asignarFormatoNumero(hoja, `G${fila}`, '$ #,##0')
  }

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Reutilizados')
  const buffer = XLSX.write(libro, { bookType: 'xlsx', type: 'array' })
  const blob = await agregarBordesInformeReutilizados(buffer, filas.length, gruposDetalle)
  descargarBlob(blob, `detalle_reutilizados_${nombreArchivoSeguro(opciones.fecha || new Date().toISOString().slice(0, 10))}.xlsx`)
}

export async function exportarPedidosBodegaExcel(pedidos = [], opciones = {}) {
  const pedidosValidos = (pedidos || []).filter((pedido) => (pedido.items || []).length > 0)
  const modo = opciones.modo || 'detalle'

  if (pedidosValidos.length === 0) {
    alert('No hay pedidos con materiales para imprimir')
    return
  }

  const grupos = modo === 'general'
    ? agruparPedidosParaValesGeneral(pedidosValidos)
    : agruparPedidosParaVales(pedidosValidos)
  const fecha = pedidosValidos[0]?.fecha || new Date().toISOString().slice(0, 10)

  if (grupos.length === 1) {
    const blob = await crearValePedidosGrupoDesdePlantilla(grupos[0], opciones)
    const sufijoModo = modo === 'general' ? '_general' : ''
    descargarBlob(blob, `vale_${nombreArchivoSeguro(grupos[0].proyecto || fecha)}${sufijoModo}.xlsx`)
    return
  }

  const zip = new JSZip()
  for (const [indice, grupo] of grupos.entries()) {
    const blob = await crearValePedidosGrupoDesdePlantilla(grupo, opciones)
    const sufijo = grupo.bloque > 1 ? `_parte_${grupo.bloque}` : ''
    const sufijoModo = modo === 'general' ? '_general' : ''
    const nombre = `vale_${nombreArchivoSeguro(grupo.proyecto || `vale_${indice + 1}`)}${sufijo}${sufijoModo}.xlsx`
    zip.file(nombre, blob)
  }

  const blobZip = await zip.generateAsync({ type: 'blob' })
  descargarBlob(blobZip, `vales_bodega_${modo}_${fecha}.zip`)
}

async function limpiarReferenciasCalculoExcel(zip) {
  zip.remove('xl/calcChain.xml')

  const contentTypes = zip.file('[Content_Types].xml')
  if (contentTypes) {
    const xml = await contentTypes.async('string')
    const limpio = xml.replace(/<Override[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, '')
    zip.file('[Content_Types].xml', limpio)
  }

  const workbookRels = zip.file('xl/_rels/workbook.xml.rels')
  if (workbookRels) {
    const xml = await workbookRels.async('string')
    const limpio = xml.replace(/<Relationship[^>]*Type="[^"]*\/calcChain"[^>]*\/>/g, '')
    zip.file('xl/_rels/workbook.xml.rels', limpio)
  }

  const workbook = zip.file('xl/workbook.xml')
  if (workbook) {
    const xml = await workbook.async('string')
    const limpio = xml.replace(/<calcPr\b[^>]*\/>/g, '<calcPr calcMode="auto"/>')
    zip.file('xl/workbook.xml', limpio)
  }
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

function agruparPedidosParaValesGeneral(pedidos = []) {
  return [{
    proyecto: 'GENERAL',
    bloque: 1,
    pedidos,
  }]
}

function normalizarClaveVale(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

async function crearValePedidosGrupoDesdePlantilla(grupo = {}, opciones = {}) {
  const respuesta = await fetch(plantillaValeBodegaUrl)
  const buffer = await respuesta.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)
  await limpiarReferenciasCalculoExcel(zip)
  let sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string')
  const archivoSharedStrings = zip.file('xl/sharedStrings.xml')
  const sharedStringsXml = archivoSharedStrings ? await archivoSharedStrings.async('string') : ''
  const sharedStrings = sharedStringsXml ? crearEditorSharedStrings(sharedStringsXml) : null
  const modo = opciones.modo || 'detalle'

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
    const serie = modo === 'general' ? '' : (pedido?.serie || extraerDatoObservacion(pedido?.observacion, 'serie') || '')
    sheetXml = setCellValue(sheetXml, `${columna}8`, serie, serie ? 'string' : 'blank', sharedStrings)
  })

  for (let fila = 9; fila <= 55; fila += 1) {
    ;['A', 'B', 'F', 'T', 'W', 'Z', 'AD', 'AG', 'AH'].forEach((columna) => {
      sheetXml = setCellValue(sheetXml, `${columna}${fila}`, '', 'blank', sharedStrings)
    })
  }

  const materiales = modo === 'general'
    ? compilarMaterialesPedidosGeneral(pedidos)
    : compilarMaterialesPedidosPorSerie(pedidos)
  materiales.slice(0, 47).forEach((material, indice) => {
    const fila = 9 + indice
    sheetXml = setCellValue(sheetXml, `A${fila}`, indice + 1, 'number', sharedStrings)
    sheetXml = setCellValue(sheetXml, `B${fila}`, material.codigo, 'string', sharedStrings)
    sheetXml = setCellValue(sheetXml, `F${fila}`, material.descripcion, 'string', sharedStrings)

    columnasSeries.forEach((columna, indiceSerie) => {
      const cantidad = modo === 'general' ? 0 : (material.cantidades[indiceSerie] || 0)
      sheetXml = setCellValue(sheetXml, `${columna}${fila}`, cantidad || '', cantidad ? 'number' : 'blank', sharedStrings)
    })

    sheetXml = setCellValue(sheetXml, `AH${fila}`, material.total, material.total ? 'number' : 'blank', sharedStrings)
  })

  if (sharedStrings) {
    zip.file('xl/sharedStrings.xml', sharedStrings.finalizar())
  }
  zip.file('xl/worksheets/sheet1.xml', sheetXml)
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function compilarMaterialesPedidosGeneral(pedidos = []) {
  const mapa = new Map()

  pedidos.forEach((pedido) => {
    ;(pedido.items || []).forEach((item) => {
      const { codigo, descripcion } = obtenerMaterialPedidoParaImpresion(item)
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

      mapa.get(clave).total += numeroExcel(item.cantidad)
    })
  })

  return Array.from(mapa.values())
}

function compilarMaterialesPedidosPorSerie(pedidos = []) {
  const mapa = new Map()

  pedidos.forEach((pedido, indicePedido) => {
    ;(pedido.items || []).forEach((item) => {
      const { codigo, descripcion } = obtenerMaterialPedidoParaImpresion(item)
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

function obtenerMaterialPedidoParaImpresion(item = {}) {
  const materialVale = String(item.material_vale || '').trim()
  const materialBalance = String(item.material_balance || '').trim()
  const codigoRespaldo = String(item.codigo || '').trim()
  const materialValeEsCodigo = esCodigoBodegaImpresion(materialVale)
  const codigoRespaldoEsCodigo = esCodigoBodegaImpresion(codigoRespaldo)
  const codigo = materialValeEsCodigo
    ? materialVale
    : codigoRespaldoEsCodigo
      ? codigoRespaldo
      : ''
  const descripcion = String(
    materialVale && !materialValeEsCodigo
      ? materialVale
      : materialBalance || item.descripcion || item.material || materialVale || codigoRespaldo || ''
  ).trim()

  return { codigo, descripcion }
}

function esCodigoBodegaImpresion(valor = '') {
  const limpio = String(valor || '').trim()
  if (!limpio) return false
  if (/^MM[A-Z0-9]{4,}$/i.test(limpio)) return true
  if (/^[A-Z]{2,}[A-Z0-9-]{2,}$/i.test(limpio) && !/\s/.test(limpio)) return true
  return /^\d{1,6}$/.test(limpio)
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

function construirDetalleReutilizadosPorRegistro(registros = []) {
  return (registros || [])
    .map((registro) => {
      const items = [
        ...(registro.detalleCobro?.mantencion || []),
        ...(registro.detalleCobro?.modificacion || []),
      ]
        .filter(esItemReutilizado)
        .map(normalizarItemReutilizadoInforme)
        .filter((item) => item.cantidad > 0 && item.valorReutilizado > 0)

      return {
        modulo: registro.serie || registro.protocolo_entrega?.serie || registro.modulo || registro.id || '',
        fecha: formatearFechaRegistroInforme(registro.fecha_prueba_electrica || registro.protocolo_entrega?.fecha_prueba_electrica || registro.fecha || registro.created_at),
        items,
      }
    })
    .filter((registro) => registro.items.length > 0)
}

function esItemReutilizado(item = {}) {
  return normalizarClaveVale(item.tipoCantidad || item.material).includes('reutilizado')
}

function normalizarItemReutilizadoInforme(item = {}) {
  const cantidad = numeroExcel(item.cantidad)
  const valorReutilizado = numeroExcel(item.subtotal)
  const precioUnitarioReutilizado = numeroExcel(item.precioUnitario)
  const valorCompleto = cantidad > 0 && precioUnitarioReutilizado > 0
    ? cantidad * precioUnitarioReutilizado * 2
    : valorReutilizado * 2

  return {
    insumo: String(item.materialPrecio || item.material || '')
      .replace(/\s+reutilizado$/i, '')
      .trim(),
    cantidad,
    valorCompleto,
    valorReutilizado,
  }
}

function describirPeriodoInformeReutilizados(rango = 'mes', valor = '') {
  const rangoFechas = obtenerRangoFechasProtocolos(rango, valor || new Date().toISOString().slice(0, 10))
  const inicio = parseLocalDate(String(rangoFechas.inicio || '').slice(0, 10))
  const fin = parseLocalDate(String(rangoFechas.fin || '').slice(0, 10))

  if (!inicio || !fin) return String(valor || '')

  fin.setDate(fin.getDate() - 1)
  if (inicio.getTime() === fin.getTime()) return formatearFechaLargaInforme(inicio)

  const mismoMes = inicio.getMonth() === fin.getMonth() && inicio.getFullYear() === fin.getFullYear()
  if (mismoMes) {
    return `${inicio.getDate()} de ${nombreMesInforme(inicio)} al ${fin.getDate()} ${nombreMesInforme(fin)} ${fin.getFullYear()}`
  }

  return `${formatearFechaLargaInforme(inicio)} al ${formatearFechaLargaInforme(fin)}`
}

function formatearFechaLargaInforme(fecha) {
  return `${fecha.getDate()} de ${nombreMesInforme(fecha)} ${fecha.getFullYear()}`
}

function formatearFechaRegistroInforme(valor) {
  const textoFecha = String(valor || '').slice(0, 10)
  const fechaLocal = parseLocalDate(textoFecha)
  return fechaLocal ? formatearFecha(fechaLocal) : formatearFecha(valor)
}

function nombreMesInforme(fecha) {
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]
  return meses[fecha.getMonth()] || ''
}

function asignarFormatoNumero(hoja, referencia, formato) {
  if (hoja[referencia]) hoja[referencia].z = formato
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

async function agregarBordesInformeReutilizados(buffer, totalFilas, gruposDetalle = []) {
  const zip = await JSZip.loadAsync(buffer)
  const archivoEstilos = zip.file('xl/styles.xml')
  const archivoHoja = zip.file('xl/worksheets/sheet1.xml')

  if (!archivoEstilos || !archivoHoja) {
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  let stylesXml = await archivoEstilos.async('string')
  let sheetXml = await archivoHoja.async('string')
  const bordersPorClave = new Map()
  const estilosConBorde = new Map()

  const obtenerBorderId = (borde) => {
    const clave = claveBordeExcel(borde)
    if (bordersPorClave.has(clave)) return bordersPorClave.get(clave)

    const borderId = obtenerSiguienteIndiceEstilo(stylesXml, 'borders')
    stylesXml = agregarBorderExcel(stylesXml, borde)
    bordersPorClave.set(clave, borderId)
    return borderId
  }

  const obtenerEstiloConBorde = (estiloBase = 0, borde = {}) => {
    const base = Number(estiloBase || 0)
    const claveEstilo = `${base}|${claveBordeExcel(borde)}`
    if (estilosConBorde.has(claveEstilo)) return estilosConBorde.get(claveEstilo)

    const estiloBaseXml = obtenerXfPorIndice(stylesXml, base) || '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    const borderId = obtenerBorderId(borde)
    const estiloNuevo = clonarXfConBorde(estiloBaseXml, borderId)
    const nuevoIndice = obtenerSiguienteIndiceEstilo(stylesXml, 'cellXfs')
    stylesXml = agregarXfEstilo(stylesXml, estiloNuevo)
    estilosConBorde.set(claveEstilo, nuevoIndice)
    return nuevoIndice
  }

  const bordeCompleto = { left: true, right: true, top: true, bottom: true }
  crearReferenciasRangoExcel(2, 3, 7, 4).forEach((referencia) => {
    sheetXml = aplicarBordeACeldaExcel(sheetXml, referencia, obtenerEstiloConBorde, bordeCompleto)
  })

  crearReferenciasRangoExcel(1, 6, 7, 6).forEach((referencia) => {
    sheetXml = aplicarBordeACeldaExcel(sheetXml, referencia, obtenerEstiloConBorde, bordeCompleto)
  })

  gruposDetalle.forEach((grupo) => {
    for (let fila = grupo.inicio; fila <= grupo.fin; fila += 1) {
      for (let columna = 1; columna <= 7; columna += 1) {
        const referencia = `${nombreColumnaExcel(columna)}${fila}`
        const bordeGrupo = {
          left: true,
          right: true,
          top: fila === grupo.inicio,
          bottom: fila === grupo.fin,
        }
        sheetXml = aplicarBordeACeldaExcel(sheetXml, referencia, obtenerEstiloConBorde, bordeGrupo)
      }
    }
  })

  zip.file('xl/styles.xml', stylesXml)
  zip.file('xl/worksheets/sheet1.xml', sheetXml)

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function claveBordeExcel(borde = {}) {
  return ['left', 'right', 'top', 'bottom']
    .filter((lado) => borde[lado])
    .join('-') || 'none'
}

function agregarBorderExcel(stylesXml, borde = {}) {
  const borderXml = [
    '<border>',
    ladoBordeExcel('left', borde.left),
    ladoBordeExcel('right', borde.right),
    ladoBordeExcel('top', borde.top),
    ladoBordeExcel('bottom', borde.bottom),
    '<diagonal/>',
    '</border>',
  ].join('')

  return stylesXml.replace(
    /<borders([^>]*)count="(\d+)"([^>]*)>([\s\S]*?)<\/borders>/,
    (match, antesCount, count, despuesCount, contenido) => (
      `<borders${antesCount}count="${Number(count) + 1}"${despuesCount}>${contenido}${borderXml}</borders>`
    )
  )
}

function ladoBordeExcel(lado, activo) {
  return activo
    ? `<${lado} style="thin"><color auto="1"/></${lado}>`
    : `<${lado}/>`
}

function obtenerSiguienteIndiceEstilo(stylesXml, etiqueta) {
  const coincidencia = stylesXml.match(new RegExp(`<${etiqueta}[^>]*count="(\\d+)"`))
  return coincidencia ? Number(coincidencia[1]) : 0
}

function obtenerXfPorIndice(stylesXml, indice) {
  const contenido = stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] || ''
  const estilos = contenido.match(/<xf\b[^>]*(?:\/>|>[\s\S]*?<\/xf>)/g) || []
  return estilos[indice] || estilos[0] || ''
}

function clonarXfConBorde(xfXml, borderId) {
  let salida = xfXml
  if (/\sborderId="[^"]*"/.test(salida)) {
    salida = salida.replace(/\sborderId="[^"]*"/, ` borderId="${borderId}"`)
  } else {
    salida = salida.replace('<xf', `<xf borderId="${borderId}"`)
  }

  if (/\sapplyBorder="[^"]*"/.test(salida)) {
    salida = salida.replace(/\sapplyBorder="[^"]*"/, ' applyBorder="1"')
  } else if (salida.endsWith('/>')) {
    salida = salida.replace(/\/>$/, ' applyBorder="1"/>')
  } else {
    salida = salida.replace(/<xf\b([^>]*)>/, '<xf$1 applyBorder="1">')
  }

  return salida
}

function agregarXfEstilo(stylesXml, xfXml) {
  return stylesXml.replace(
    /<cellXfs([^>]*)count="(\d+)"([^>]*)>([\s\S]*?)<\/cellXfs>/,
    (match, antesCount, count, despuesCount, contenido) => (
      `<cellXfs${antesCount}count="${Number(count) + 1}"${despuesCount}>${contenido}${xfXml}</cellXfs>`
    )
  )
}

function crearReferenciasRangoExcel(columnaInicio, filaInicio, columnaFin, filaFin) {
  const referencias = []
  for (let fila = filaInicio; fila <= filaFin; fila += 1) {
    for (let columna = columnaInicio; columna <= columnaFin; columna += 1) {
      referencias.push(`${nombreColumnaExcel(columna)}${fila}`)
    }
  }
  return referencias
}

function nombreColumnaExcel(indice) {
  let numero = indice
  let nombre = ''
  while (numero > 0) {
    const resto = (numero - 1) % 26
    nombre = String.fromCharCode(65 + resto) + nombre
    numero = Math.floor((numero - resto - 1) / 26)
  }
  return nombre
}

function aplicarBordeACeldaExcel(sheetXml, referencia, obtenerEstiloConBorde, borde = {}) {
  const celdaRegex = new RegExp(`<c\\s+([^>]*\\br="${referencia}"[^>]*)\\s*\\/\\s*>|<c\\s+([^>]*\\br="${referencia}"[^>]*)>([\\s\\S]*?)<\\/c>`)
  const reemplazarAtributos = (atributos) => {
    const estiloBase = Number(atributos.match(/\ss="(\d+)"/)?.[1] || 0)
    const estiloConBorde = obtenerEstiloConBorde(estiloBase, borde)
    return /\ss="[^"]*"/.test(atributos)
      ? atributos.replace(/\ss="[^"]*"/, ` s="${estiloConBorde}"`)
      : `${atributos} s="${estiloConBorde}"`
  }

  if (celdaRegex.test(sheetXml)) {
    return sheetXml.replace(celdaRegex, (match, atributosVacios, atributosConContenido, contenido = '') => {
      const atributos = reemplazarAtributos(atributosVacios || atributosConContenido || `r="${referencia}"`)
      return atributosVacios ? `<c ${atributos}/>` : `<c ${atributos}>${contenido}</c>`
    })
  }

  const fila = referencia.match(/\d+/)?.[0]
  if (!fila) return sheetXml

  const rowRegex = new RegExp(`(<row[^>]*\\br="${fila}"[^>]*>)([\\s\\S]*?)(<\\/row>)`)
  if (!rowRegex.test(sheetXml)) return sheetXml

  const estiloConBorde = obtenerEstiloConBorde(0, borde)
  return sheetXml.replace(rowRegex, (match, inicio, contenido, cierre) => (
    `${inicio}${contenido}<c r="${referencia}" s="${estiloConBorde}"/>${cierre}`
  ))
}
