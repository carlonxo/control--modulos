import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth/mammoth.browser'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString()

export async function leerFilasValeBodegaDesdeArchivo(archivo, opciones = {}) {
  const texto = await leerTextoArchivoVale(archivo)
  return detectarFilasValeDesdeTexto(texto, opciones)
}

async function leerTextoArchivoVale(archivo) {
  const buffer = await archivo.arrayBuffer()
  const nombreArchivo = archivo.name?.toLowerCase() || ''
  const esPdf = archivo.type === 'application/pdf' || nombreArchivo.endsWith('.pdf')
  const esDocx = archivo.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || nombreArchivo.endsWith('.docx')
  const esDoc = archivo.type === 'application/msword' || nombreArchivo.endsWith('.doc')

  if (esPdf) {
    const documento = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
    const lineas = []

    for (let numeroPagina = 1; numeroPagina <= documento.numPages; numeroPagina += 1) {
      const pagina = await documento.getPage(numeroPagina)
      const contenido = await pagina.getTextContent()
      const grupos = []

      contenido.items.forEach((item) => {
        const y = item.transform?.[5] || 0
        const x = item.transform?.[4] || 0
        const texto = String(item.str || '').trim()
        if (!texto) return

        const grupoExistente = grupos.find((grupo) => Math.abs(grupo.y - y) <= 2)
        if (grupoExistente) {
          grupoExistente.items.push({ x, texto })
          grupoExistente.y = (grupoExistente.y + y) / 2
        } else {
          grupos.push({ y, items: [{ x, texto }] })
        }
      })

      grupos
        .sort((a, b) => b.y - a.y)
        .forEach((grupo) => {
          lineas.push(
            grupo.items
              .sort((a, b) => a.x - b.x)
              .map((parte) => parte.texto)
              .join(' ')
          )
        })
    }

    return lineas.join('\n')
  }

  if (esDocx) {
    const html = await mammoth.convertToHtml({ arrayBuffer: buffer })
    const documento = new DOMParser().parseFromString(html.value || '', 'text/html')
    return extraerLineasValeDesdeTablasWord(documento)
  }

  if (esDoc) {
    throw new Error('Los archivos .doc antiguos no se pueden leer de forma confiable. Guarda el vale como .docx y vuelve a adjuntarlo.')
  }

  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  const latin1 = new TextDecoder('latin1', { fatal: false }).decode(buffer)
  return `${utf8}\n${latin1}`
}

function extraerLineasValeDesdeTablasWord(documento) {
  const lineas = []

  documento.querySelectorAll('table').forEach((tabla) => {
    const filas = [...tabla.querySelectorAll('tr')]
      .map((fila) => [...fila.querySelectorAll('th, td')]
        .map((celda) => celda.textContent.replace(/\s+/g, ' ').trim())
        .filter(Boolean))
      .filter((celdas) => celdas.length > 0)

    if (filas.length === 0) return

    const configuracion = detectarColumnasValeWord(filas)
    if (!configuracion) return

    filas.slice(configuracion.indiceInicioDatos).forEach((celdas) => {
      const indiceTotalFila = configuracion.inferido
        ? encontrarIndiceCantidadTotalVale(celdas)
        : configuracion.indiceTotal
      const material = limpiarDescripcionVale(celdas[configuracion.indiceMaterial] || '')
      const cantidad = normalizarCantidadVale(celdas[indiceTotalFila] || '')

      if (!cantidad || !esDescripcionMaterialVale(material)) return
      lineas.push([material, cantidad].join('\t'))
    })
  })

  return lineas.join('\n')
}

function detectarColumnasValeWord(filas) {
  for (let indiceFila = 0; indiceFila < filas.length; indiceFila += 1) {
    const encabezado = filas[indiceFila].map(normalizarTextoComparacionLocal)
    const indiceMaterial = encabezado.findIndex(esEncabezadoMaterialVale)
    const indiceTotal = encontrarIndiceTotalEncabezadoVale(encabezado)

    if (indiceMaterial >= 0 && indiceTotal >= 0 && indiceMaterial !== indiceTotal) {
      return {
        indiceMaterial,
        indiceTotal,
        indiceInicioDatos: indiceFila + 1,
      }
    }
  }

  return inferirColumnasValeWord(filas)
}

function inferirColumnasValeWord(filas) {
  const filasConTotal = filas
    .map((celdas, indice) => {
      const indiceTotal = encontrarIndiceCantidadTotalVale(celdas)
      return { celdas, indice, indiceTotal }
    })
    .filter(({ celdas, indiceTotal }) => indiceTotal > 0 && celdas.length >= 2)

  if (filasConTotal.length < 2) return null

  const puntajesPorColumna = new Map()
  filasConTotal.forEach(({ celdas, indiceTotal }) => {
    celdas.slice(0, indiceTotal).forEach((celda, indiceColumna) => {
      const puntaje = puntuarCeldaMaterialVale(celda)
      if (puntaje <= 0) return
      puntajesPorColumna.set(
        indiceColumna,
        (puntajesPorColumna.get(indiceColumna) || 0) + puntaje
      )
    })
  })

  const columnasOrdenadas = [...puntajesPorColumna.entries()]
    .sort((a, b) => b[1] - a[1])
  const mejorColumna = columnasOrdenadas[0]
  if (!mejorColumna || mejorColumna[1] < 8) return null

  return {
    indiceMaterial: mejorColumna[0],
    indiceTotal: Math.max(...filasConTotal.map(({ indiceTotal }) => indiceTotal)),
    indiceInicioDatos: Math.min(...filasConTotal.map(({ indice }) => indice)),
    inferido: true,
  }
}

function detectarFilasValeDesdeTexto(texto, opciones = {}) {
  const lineas = texto
    .replace(/\r/g, '\n')
    .split('\n')
    .map((linea) => linea.includes('\t')
      ? linea.split('\t').map((celda) => celda.replace(/\s+/g, ' ').trim()).join('\t')
      : linea.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  return lineas.flatMap((linea) => {
    const filaTabla = detectarFilaValeDesdeCeldas(linea, opciones)
    if (filaTabla) return [filaTabla]

    const match = linea.match(/^(\d{1,3})\s+\S+\s+(.+?)\s+c\/u\s+(.+)$/i)
    if (!match) {
      const filaSimple = detectarFilaValeSimple(linea, opciones)
      return filaSimple ? [filaSimple] : []
    }

    const descripcion = match[2].trim()
    const numeros = [...match[3].matchAll(/\b\d{1,4}\b/g)].map((item) => item[0])
    if (numeros.length === 0) return []

    const cantidad = Number(numeros[numeros.length - 1])
    if (!cantidad) return []

    return [{
      id: `detectado-${match[1]}-${descripcion}`,
      materialVale: descripcion,
      materialBalance: materialBalanceDesdeVale(descripcion, opciones),
      cantidad: String(cantidad),
    }]
  })
}

function detectarFilaValeDesdeCeldas(linea, opciones) {
  if (!linea.includes('\t')) return null

  const celdas = linea.split('\t').map((celda) => celda.trim()).filter(Boolean)
  if (celdas.some(esCeldaEncabezadoVale)) return null
  if (celdas.length < 2) return null

  const indiceCantidad = encontrarIndiceCantidadTotalVale(celdas)
  if (indiceCantidad < 0) return null

  const cantidad = normalizarCantidadVale(celdas[indiceCantidad])
  if (!cantidad) return null

  const descripcion = obtenerDescripcionValeDesdeCeldas(celdas, indiceCantidad)
  if (!descripcion) return null

  return {
    id: `detectado-tabla-${descripcion}-${cantidad}`,
    materialVale: descripcion,
    materialBalance: materialBalanceDesdeVale(descripcion, opciones),
    cantidad: String(cantidad),
  }
}

function detectarFilaValeSimple(linea, opciones) {
  if (esCeldaEncabezadoVale(linea)) return null

  const matchFinal = linea.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)$/)
  if (!matchFinal) return null

  const cantidad = normalizarCantidadVale(matchFinal[2])
  const descripcion = limpiarDescripcionVale(matchFinal[1])
  if (!cantidad || !esDescripcionMaterialVale(descripcion)) return null

  return {
    id: `detectado-linea-${descripcion}-${cantidad}`,
    materialVale: descripcion,
    materialBalance: materialBalanceDesdeVale(descripcion, opciones),
    cantidad: String(cantidad),
  }
}

function materialBalanceDesdeVale(descripcion, opciones = {}) {
  const normalizar = opciones.normalizarTextoComparacion || normalizarTextoComparacionLocal
  const equivalencias = opciones.equivalenciasValeBodega || {}
  const clave = normalizar(descripcion)
  if (equivalencias[clave]) return equivalencias[clave]

  const encontrada = Object.entries(equivalencias).find(([patron]) => (
    clave.includes(patron) || patron.includes(clave)
  ))
  if (encontrada?.[1]) return encontrada[1]

  const porPalabras = Object.entries(equivalencias).find(([patron]) => {
    const palabras = patron.split(' ').filter((palabra) => palabra.length > 2)
    if (palabras.length === 0) return false
    return palabras.every((palabra) => clave.includes(palabra))
  })

  return porPalabras?.[1] || descripcion
}

function encontrarIndiceCantidadTotalVale(celdas) {
  const indiceUltimaCelda = celdas.length - 1
  const cantidadUltimaCelda = normalizarCantidadVale(celdas[indiceUltimaCelda])
  if (cantidadUltimaCelda > 0) return indiceUltimaCelda

  return -1
}

function obtenerDescripcionValeDesdeCeldas(celdas, indiceCantidad) {
  const celdasAntesTotal = celdas.slice(0, indiceCantidad)
  const candidatas = celdasAntesTotal
    .map(limpiarDescripcionVale)
    .filter(esDescripcionMaterialVale)

  if (candidatas.length === 0) return ''
  return candidatas.sort((a, b) => b.length - a.length)[0]
}

function limpiarDescripcionVale(valor) {
  return String(valor || '')
    .replace(/^\d{1,4}\s+/, '')
    .replace(/\bc\/u\b/gi, '')
    .replace(/\bun(?:idad)?\.?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizarCantidadVale(valor) {
  const texto = String(valor || '').trim()
  if (!/^\d+(?:[.,]\d+)?$/.test(texto)) return 0
  const numero = Number(texto.replace(',', '.'))
  return Number.isFinite(numero) ? numero : 0
}

function esUnidadVale(valor) {
  return /^(un|und|unidad|u|c\/u|mt|m|ml|gl|cj|caja)$/i.test(String(valor || '').trim())
}

function esDescripcionMaterialVale(valor) {
  const textoOriginal = String(valor || '').trim()
  const texto = normalizarTextoComparacionLocal(textoOriginal)
  if (!texto || texto.length < 4) return false
  if (normalizarCantidadVale(textoOriginal)) return false
  if (esUnidadVale(textoOriginal) || esCeldaEncabezadoVale(textoOriginal)) return false
  if (!/[a-záéíóúñ]/i.test(textoOriginal)) return false
  if (/^\d+[\w.-]*$/.test(textoOriginal)) return false
  if (/^(fecha|solicitante|responsable|bodega|obra|ot|vale|numero|nro|rut|firma|subtotal|neto|iva|total)\b/i.test(textoOriginal)) return false
  if (/\$/.test(textoOriginal)) return false
  if (texto.split(' ').length === 1 && texto.length <= 5) return false
  return true
}

function esCeldaEncabezadoVale(valor) {
  const texto = normalizarTextoComparacionLocal(valor)
  if (!texto) return true
  return [
    'item',
    'codigo',
    'descripcion',
    'material',
    'unidad',
    'cantidad',
    'total',
    'precio',
    'observacion',
  ].some((palabra) => texto === palabra || texto.includes(` ${palabra} `))
}

function esEncabezadoMaterialVale(texto) {
  return [
    'material',
    'descripcion',
    'descripcion material',
    'detalle',
    'articulo',
    'producto',
    'nombre material',
  ].some((patron) => texto === patron || texto.includes(patron))
}

function encontrarIndiceTotalEncabezadoVale(encabezado) {
  for (let index = encabezado.length - 1; index >= 0; index -= 1) {
    const texto = encabezado[index]
    if (
      texto === 'total' ||
      texto.includes('total') ||
      texto.includes('cantidad total') ||
      texto.includes('cant total')
    ) {
      return index
    }
  }

  return -1
}

function puntuarCeldaMaterialVale(valor) {
  const texto = limpiarDescripcionVale(valor)
  if (!esDescripcionMaterialVale(texto)) return 0

  let puntaje = 1
  if (texto.length >= 10) puntaje += 2
  if (texto.split(' ').length >= 2) puntaje += 2

  return puntaje
}

function normalizarTextoComparacionLocal(valor) {
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
