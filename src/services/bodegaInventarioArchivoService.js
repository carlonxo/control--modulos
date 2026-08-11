import * as XLSX from 'xlsx'

export async function leerInventariosBodegaDesdeExcel(archivo) {
  if (!archivo) return []

  const buffer = await archivo.arrayBuffer()
  const libro = XLSX.read(buffer, { type: 'array', cellDates: true })

  return libro.SheetNames
    .map((nombreHoja) => leerInventarioDesdeHoja(libro.Sheets[nombreHoja], nombreHoja))
    .filter(Boolean)
    .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')))
}

function leerInventarioDesdeHoja(hoja, nombreHoja) {
  const fecha = fechaDesdeNombreHoja(nombreHoja)
  if (!fecha) return null

  const filas = XLSX.utils.sheet_to_json(hoja, {
    header: 1,
    raw: false,
    defval: '',
  })

  const indiceEncabezado = filas.findIndex((fila) => {
    const texto = fila.map(normalizarTexto).join('|')
    return texto.includes('recurso') && texto.includes('descripcion') && texto.includes('unidad')
  })

  if (indiceEncabezado < 0) return null

  const encabezados = filas[indiceEncabezado].map((valor) => String(valor || '').trim())
  const filaTipos = (filas[indiceEncabezado - 2] || []).map((valor) => String(valor || '').trim())
  const filaContexto = (filas[indiceEncabezado - 1] || []).map((valor) => String(valor || '').trim())
  const columnas = detectarColumnasInventario(encabezados)

  const items = filas
    .slice(indiceEncabezado + 1)
    .map((fila, indice) => normalizarItemInventarioBodega({
      fila,
      indiceFilaExcel: indiceEncabezado + indice + 2,
      columnas,
      encabezados,
      filaTipos,
      filaContexto,
      fecha,
    }))
    .filter(Boolean)

  if (items.length === 0) return null

  const resumen = items.reduce((total, item) => ({
    entradas: total.entradas + Number(item.entradas || 0),
    salidas: total.salidas + Number(item.salidas || 0),
    saldoInicial: total.saldoInicial + Number(item.saldoInicial || 0),
    saldoFinal: total.saldoFinal + Number(item.saldoFinal || 0),
  }), { entradas: 0, salidas: 0, saldoInicial: 0, saldoFinal: 0 })

  const movimientos = items.reduce((total, item) => total + item.movimientos.length, 0)

  return {
    id: `${fecha}|${nombreHoja}`,
    fecha,
    hoja: nombreHoja,
    totalItems: items.length,
    movimientos,
    resumen,
    items,
  }
}

function detectarColumnasInventario(encabezados) {
  const normalizados = encabezados.map(normalizarTexto)
  const indicesSaldo = normalizados
    .map((valor, indice) => valor === 'saldo' ? indice : -1)
    .filter((indice) => indice >= 0)

  return {
    recurso: normalizados.findIndex((valor) => valor === 'recurso'),
    descripcion: normalizados.findIndex((valor) => valor === 'descripcion'),
    unidad: normalizados.findIndex((valor) => valor === 'unidad'),
    entradas: normalizados.findIndex((valor) => valor === 'entradas'),
    salidas: normalizados.findIndex((valor) => valor === 'salidas'),
    saldoInicial: normalizados.findIndex((valor) => valor === 'saldoinicial' || valor === 'stockenbodega'),
    stockContainer: normalizados.findIndex((valor) => valor === 'stockencontainer'),
    totalInicial: normalizados.findIndex((valor) => valor === 'total'),
    saldoFinal: indicesSaldo.length ? indicesSaldo[indicesSaldo.length - 1] : normalizados.findIndex((valor) => valor === 'total'),
  }
}

function normalizarItemInventarioBodega({
  fila,
  indiceFilaExcel,
  columnas,
  encabezados,
  filaTipos,
  filaContexto,
  fecha,
}) {
  const codigo = String(fila[columnas.recurso] || '').trim()
  const descripcion = String(fila[columnas.descripcion] || '').replace(/\s+/g, ' ').trim()
  const unidad = String(fila[columnas.unidad] || '').trim()

  if (!codigo || !descripcion || normalizarTexto(codigo) === 'recurso') return null

  const entradas = numero(fila[columnas.entradas])
  const salidas = numero(fila[columnas.salidas])
  const saldoInicial = columnas.saldoInicial >= 0
    ? numero(fila[columnas.saldoInicial])
    : 0
  const saldoFinal = columnas.saldoFinal >= 0
    ? numero(fila[columnas.saldoFinal])
    : numero(fila[columnas.totalInicial])
  const stockContainer = columnas.stockContainer >= 0 ? numero(fila[columnas.stockContainer]) : 0

  return {
    filaExcel: indiceFilaExcel,
    codigo,
    descripcion,
    unidad,
    entradas,
    salidas,
    saldoInicial,
    stockContainer,
    saldoFinal,
    movimientos: extraerMovimientosFila({
      fila,
      encabezados,
      filaTipos,
      filaContexto,
      columnas,
      fecha,
    }),
  }
}

function extraerMovimientosFila({
  fila,
  encabezados,
  filaTipos,
  filaContexto,
  columnas,
  fecha,
}) {
  const desde = Math.max(columnas.saldoFinal + 1, 0)

  return fila
    .slice(desde)
    .map((valor, indiceRelativo) => {
      const indice = desde + indiceRelativo
      const cantidad = numero(valor)
      const documento = String(encabezados[indice] || '').trim()
      if (!cantidad || !documento) return null

      return {
        fecha,
        tipo: detectarTipoMovimiento(filaTipos[indice], documento),
        documento,
        contexto: filaContexto[indice] || '',
        cantidad,
      }
    })
    .filter(Boolean)
}

function detectarTipoMovimiento(tipo, documento) {
  const texto = normalizarTexto(`${tipo} ${documento}`)
  if (texto.includes('entrada') || texto.includes('guia') || /^n\d/.test(texto)) return 'entrada'
  if (texto.includes('salida') || texto.includes('vale')) return 'salida'
  return 'movimiento'
}

function fechaDesdeNombreHoja(nombreHoja) {
  const match = String(nombreHoja || '').match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/)
  if (!match) return ''

  const dia = match[1].padStart(2, '0')
  const mes = match[2].padStart(2, '0')
  const ano = match[3].length === 2 ? `20${match[3]}` : match[3]
  return `${ano}-${mes}-${dia}`
}

function numero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0
  const texto = String(valor ?? '').trim()
  if (!texto) return 0
  const limpio = texto.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const valorNumerico = Number(limpio)
  return Number.isFinite(valorNumerico) ? valorNumerico : 0
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}
