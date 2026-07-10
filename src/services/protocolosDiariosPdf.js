import plantillaProtocolo from '../assets/protocolo-entrega-base.png'
import { formatearFecha } from '../utils/fechas'

const camposMateriales = [
  ['Conduit 20mm', ['Conduit 20mm'], 375, 546], ['Conduit 25mm', ['Conduit 25mm'], 375, 568], ['Caja PVC 100x100x65', ['Caja PVC 100x100x65'], 375, 590],
  ['Caja metálica 100x100x65', ['Caja metálica 100x100x65'], 375, 632], ['Caja tabique LH', ['Caja tabique LH'], 375, 653], ['Tapa ciega - Pasac.', ['Tapa ciega - Pasac.'], 375, 675],
  ['Cable RZ1 2,5mm', ['Cable RZ1 2,5mm'], 375, 739], ['Cable RZ1 4mm', ['Cable RZ1 4mm'], 375, 760], ['Cable RZ1 6mm', ['Cable RZ1 6mm'], 375, 781],
  ['Cordon flex 3 x 2.5/4mm', ['Cordon 3x4mm'], 375, 802], ['Cordon flex 3 x 6mm', ['Cordon 3 x 6mm'], 375, 823],
  ['Ampolleta LED', ['Ampolleta LED'], 375, 867], ['Plafón', ['Plafón'], 375, 888], ['Tubo LED', ['Tubo LED'], 375, 909],
  ['EQ. Herm. LED 40W (tubo/placa)', ['EQ. Herm. LED 40W (tubo/placa)'], 375, 931], ['Foco tortuga LED', ['Foco tortuga 60W', 'Foco tortuga LED'], 375, 952], ['Extractor', ['Extractor'], 375, 995],
  ['Conduit 32mm', ['Conduit 32mm'], 375, 1237], ['Cable RZ-1 3x1.5mm2', ['Cordon 3x1.5mm'], 981, 1215],
  ['Artefacto simple', ['Artefacto simple'], 981, 546], ['Artefacto doble', ['Artefacto doble'], 981, 568],
  ['Artefacto triple', ['Artefacto triple'], 981, 590], ['Tapa ciega artefacto', ['Tapa ciega artefacto'], 981, 611], ['Ench. Ind. 32A hembra', ['Ench. Ind. 32A hembra'], 981, 632],
  ['Ench. Ind. 32A macho', ['Ench. Ind. 32A macho'], 981, 653], ['Tab. PVC 24-36cc IP44', ['Tablero emb. IP44', 'Tablero sobr. IP44'], 981, 696],
  ['Tablero IP65', ['Tablero IP65 18p', 'Tablero IP65 24p'], 981, 739], ['Tablero armado', ['Tablero armado'], 981, 760], ['Aut. monof. 10-16-20A', ['Aut. monof. 10-16-20A'], 981, 781],
  ['Aut. bifásico 2x10A', ['Aut. bifásico 2x10A'], 981, 803], ['Aut. bifásico 2x16A', ['Aut. bifásico 2x16A'], 981, 824], ['Aut. bifásico 2x20A', ['Aut. bifásico 2x20A'], 981, 846],
  ['Aut. bifásico 2x25A', ['Aut. bifásico 2x25A'], 981, 867],
  ['Diferencial 2x25A', ['Diferencial 2x25A'], 981, 888], ['Porta Fusible', ['Porta Fusible'], 981, 931], ['Luz Piloto', ['Luz Piloto'], 981, 952],
  ['Repartidor 4x80A', ['Barra repartidora'], 981, 994], ['Falso polo', ['Falso polo'], 981, 1016],
  ['BPC LH 100x45 + acces', ['BPC LH 100x45'], 375, 1126], ['Tapa idrobox IP65', ['Tapa idrobox IP65'], 375, 1148], ['Caja chuqui PVC', ['Caja chuqui'], 375, 1259],
  ['Foco sobrep LED 18w', ['Plafo led 18w'], 981, 1082], ['Panel led 600x600 mm', ['Panel led 60x60 + soporte'], 981, 1104],
  ['Accesorio Montaje Panel Led', ['Panel led 60x60 + soporte'], 981, 1126], ['Foco sobrep led 24w', ['Plafo led 24w'], 981, 1148],
]

const anchoProtocolo = 1275
const altoProtocolo = 1650
const anchoCartaPdf = 612
const altoCartaPdf = 792

function formatearCantidad(nuevo, reutilizado) {
  if (nuevo && reutilizado) return `${nuevo} / ${reutilizado} R`
  if (reutilizado) return `${reutilizado} R`
  return nuevo || ''
}

function calcularCantidades(materiales, fuentes) {
  return fuentes.reduce((suma, clave) => {
    const valor = materiales?.[clave]
    if (valor && typeof valor === 'object') {
      return {
        nuevo: suma.nuevo + Number(valor?.nuevo || 0),
        reutilizado: suma.reutilizado + Number(valor?.reutilizado || 0),
      }
    }

    return { ...suma, nuevo: suma.nuevo + Number(valor || 0) }
  }, { nuevo: 0, reutilizado: 0 })
}

function tieneMaterialesVinculados(materiales = {}) {
  const materialesVinculados = new Set(camposMateriales.flatMap(([, fuentes]) => fuentes))
  return [...materialesVinculados].some((material) => {
    const valor = materiales?.[material]
    if (valor && typeof valor === 'object') {
      return Number(valor.nuevo || 0) > 0 || Number(valor.reutilizado || 0) > 0
    }

    return Number(valor || 0) > 0
  })
}

function crearDetalleInicial(materiales, detalleGuardado = {}) {
  if (!tieneMaterialesVinculados(materiales) && detalleGuardado && Object.keys(detalleGuardado).length > 0) {
    return detalleGuardado
  }

  return Object.fromEntries(camposMateriales.map(([item, fuentes]) => {
    const cantidades = calcularCantidades(materiales, fuentes)
    return [item, {
      mantencion: formatearCantidad(cantidades.nuevo, cantidades.reutilizado),
      modificacion: '',
    }]
  }))
}

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const imagen = new Image()
    imagen.onload = () => resolve(imagen)
    imagen.onerror = reject
    imagen.src = src
  })
}

function base64ABinario(base64) {
  const cadena = atob(base64)
  const bytes = new Uint8Array(cadena.length)
  for (let i = 0; i < cadena.length; i += 1) bytes[i] = cadena.charCodeAt(i)
  return bytes
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

function crearPdfDesdeJpegs(paginasJpeg) {
  const codificador = new TextEncoder()
  const partes = []
  const posiciones = [0]
  let largo = 0
  const agregarTexto = (texto) => {
    const bytes = codificador.encode(texto)
    partes.push(bytes)
    largo += bytes.length
  }
  const agregarBytes = (bytes) => {
    partes.push(bytes)
    largo += bytes.length
  }
  const agregarObjetoTexto = (numero, contenido) => {
    posiciones[numero] = largo
    agregarTexto(`${numero} 0 obj\n${contenido}\nendobj\n`)
  }

  agregarTexto('%PDF-1.4\n')
  agregarObjetoTexto(1, '<< /Type /Catalog /Pages 2 0 R >>')

  const paginas = paginasJpeg.map((jpegBytes, index) => ({
    page: 3 + index * 3,
    image: 4 + index * 3,
    content: 5 + index * 3,
    jpegBytes,
  }))

  agregarObjetoTexto(2, `<< /Type /Pages /Kids [${paginas.map((pagina) => `${pagina.page} 0 R`).join(' ')}] /Count ${paginas.length} >>`)

  paginas.forEach((pagina) => {
    const contenidoPagina = `q ${anchoCartaPdf} 0 0 ${altoCartaPdf} 0 0 cm /Im0 Do Q`
    agregarObjetoTexto(
      pagina.page,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${anchoCartaPdf} ${altoCartaPdf}] /Resources << /XObject << /Im0 ${pagina.image} 0 R >> >> /Contents ${pagina.content} 0 R >>`
    )
    posiciones[pagina.image] = largo
    agregarTexto(`${
      pagina.image
    } 0 obj\n<< /Type /XObject /Subtype /Image /Width ${anchoProtocolo} /Height ${altoProtocolo} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pagina.jpegBytes.length} >>\nstream\n`)
    agregarBytes(pagina.jpegBytes)
    agregarTexto('\nendstream\nendobj\n')
    agregarObjetoTexto(pagina.content, `<< /Length ${contenidoPagina.length} >>\nstream\n${contenidoPagina}\nendstream`)
  })

  const totalObjetos = 2 + paginas.length * 3
  const inicioXref = largo
  agregarTexto(`xref\n0 ${totalObjetos + 1}\n0000000000 65535 f \n`)
  for (let i = 1; i <= totalObjetos; i += 1) agregarTexto(`${String(posiciones[i]).padStart(10, '0')} 00000 n \n`)
  agregarTexto(`trailer\n<< /Size ${totalObjetos + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`)

  return new Blob(partes, { type: 'application/pdf' })
}

function dibujarTexto(ctx, valor, area, opciones = {}) {
  const texto = String(valor ?? '').trim()
  if (!texto) return

  ctx.save()
  ctx.fillStyle = '#111'
  ctx.font = opciones.font || '700 15px Arial'
  ctx.textAlign = opciones.align || 'center'
  ctx.textBaseline = 'middle'
  const x = opciones.align === 'left' ? area.left + 6 : area.left + area.width / 2
  ctx.fillText(texto, x, area.top + area.height / 2, area.width - 8)
  ctx.restore()
}

function dibujarTextoLargo(ctx, valor, area) {
  const texto = String(valor ?? '').trim()
  if (!texto) return

  ctx.save()
  ctx.fillStyle = '#111'
  ctx.font = '700 14px Arial'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const palabras = texto.split(/\s+/)
  const lineas = []
  let linea = ''

  palabras.forEach((palabra) => {
    const prueba = linea ? `${linea} ${palabra}` : palabra
    if (ctx.measureText(prueba).width > area.width - 10 && linea) {
      lineas.push(linea)
      linea = palabra
    } else {
      linea = prueba
    }
  })
  if (linea) lineas.push(linea)
  lineas.slice(0, Math.floor(area.height / 17)).forEach((lineaTexto, index) => {
    ctx.fillText(lineaTexto, area.left + 5, area.top + 4 + index * 17, area.width - 10)
  })
  ctx.restore()
}

function dibujarX(ctx, activa, area) {
  if (!activa) return

  ctx.save()
  ctx.fillStyle = '#111'
  ctx.font = '900 20px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('X', area.left + area.width / 2, area.top + area.height / 2)
  ctx.restore()
}

function jpegProtocolo(ctx, imagenBase, registro) {
  const datos = registro.protocolo_entrega || {}
  const detalleMateriales = crearDetalleInicial(registro.materiales || {}, datos.detalleMateriales || {})

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, anchoProtocolo, altoProtocolo)
  ctx.drawImage(imagenBase, 0, 0, anchoProtocolo, altoProtocolo)
  ctx.fillStyle = '#111'
  ctx.fillRect(37, 258, 1226, 1)
  ctx.fillRect(37, 1277, 606, 1)

  dibujarTexto(ctx, formatearFecha(datos.fecha || registro.fecha_prueba_electrica), { left: 280, top: 190, width: 405, height: 31 })
  dibujarTexto(ctx, registro.serie, { left: 959, top: 190, width: 304, height: 31 })
  dibujarTexto(ctx, datos.responsable || registro.responsable, { left: 280, top: 221, width: 405, height: 37 })
  dibujarTexto(ctx, registro.tipo, { left: 959, top: 221, width: 304, height: 37 })
  dibujarTexto(ctx, registro.linea, { left: 280, top: 258, width: 405, height: 38 })
  dibujarTexto(ctx, registro.proyecto, { left: 959, top: 258, width: 304, height: 38 })
  dibujarTexto(ctx, datos.planosRevision, { left: 280, top: 296, width: 405, height: 44 })
  dibujarTexto(ctx, datos.centroCosto, { left: 959, top: 296, width: 304, height: 44 })

  dibujarX(ctx, datos.flexNaranjo, { left: 183, top: 403, width: 102, height: 29 })
  dibujarX(ctx, datos.flexLibre, { left: 285, top: 403, width: 105, height: 29 })
  dibujarX(ctx, datos.flexMetalico, { left: 390, top: 403, width: 118, height: 29 })
  dibujarTexto(ctx, datos.observCanalizado, { left: 508, top: 403, width: 177, height: 29 })
  dibujarX(ctx, datos.eva, { left: 818, top: 403, width: 73, height: 29 })
  dibujarX(ctx, datos.thhn, { left: 891, top: 403, width: 91, height: 29 })
  dibujarX(ctx, datos.caleco, { left: 982, top: 403, width: 118, height: 29 })
  dibujarTexto(ctx, datos.observCableado, { left: 1100, top: 403, width: 163, height: 29 })
  dibujarX(ctx, datos.canalizado === 'Cumple', { left: 183, top: 475, width: 102, height: 28 })
  dibujarX(ctx, datos.canalizado === 'No cumple', { left: 285, top: 475, width: 105, height: 28 })
  dibujarX(ctx, datos.canalizado === 'Autoriza', { left: 390, top: 475, width: 295, height: 28 })
  dibujarX(ctx, datos.aterrizado === 'Sí', { left: 818, top: 475, width: 73, height: 28 })
  dibujarX(ctx, datos.aterrizado === 'No', { left: 891, top: 475, width: 91, height: 28 })
  dibujarX(ctx, datos.te1 === 'Sí', { left: 1100, top: 475, width: 81, height: 28 })
  dibujarX(ctx, datos.te1 === 'No', { left: 1181, top: 475, width: 82, height: 28 })

  camposMateriales.forEach(([item,, x, y]) => {
    const saltoColumna = x < 700 ? 133 : 134
    const detalle = detalleMateriales[item] || {}
    dibujarTexto(ctx, detalle.mantencion, { left: x, top: y, width: x < 700 ? 133 : 134, height: 21 }, { font: '700 13px Arial' })
    dibujarTexto(ctx, detalle.modificacion, { left: x + saltoColumna, top: y, width: x < 700 ? 133 : 148, height: 21 }, { font: '700 13px Arial' })
  })

  dibujarTextoLargo(ctx, datos.observaciones, { left: 37, top: 1421, width: 855, height: 59 })
  dibujarTextoLargo(ctx, datos.firma, { left: 892, top: 1421, width: 371, height: 59 })

  return base64ABinario(ctx.canvas.toDataURL('image/jpeg', 0.95).split(',')[1])
}

export async function descargarProtocolosDiariosPdf(registros, fecha) {
  const imagenBase = await cargarImagen(plantillaProtocolo)
  const canvas = document.createElement('canvas')
  canvas.width = anchoProtocolo
  canvas.height = altoProtocolo
  const ctx = canvas.getContext('2d')
  const paginas = registros.map((registro) => jpegProtocolo(ctx, imagenBase, registro))
  const pdf = crearPdfDesdeJpegs(paginas)
  descargarBlob(pdf, `protocolos_${formatearFecha(fecha) || fecha}.pdf`)
}
