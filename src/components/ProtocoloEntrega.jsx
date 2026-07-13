import { useEffect, useState } from 'react'
import plantillaProtocolo from '../assets/protocolo-entrega-base.png'
import './ProtocoloEntrega.css'

export const camposMateriales = [
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

function normalizarNumero(valor) {
  const numero = Number(String(valor || '').replace(',', '.').replace(/[^\d.-]/g, ''))
  return Number.isFinite(numero) ? numero : 0
}

function esCantidadReutilizada(valor) {
  return /(^|[\d\s.,-])r\b|reutiliz/i.test(String(valor || ''))
}

export function parsearCantidadProtocolo(valor) {
  return String(valor || '')
    .split('/')
    .map((parte) => parte.trim())
    .filter(Boolean)
    .reduce((total, parte) => {
      const cantidad = normalizarNumero(parte)
      if (!cantidad) return total

      if (esCantidadReutilizada(parte)) {
        return { ...total, reutilizado: total.reutilizado + cantidad }
      }

      return { ...total, nuevo: total.nuevo + cantidad }
    }, { nuevo: 0, reutilizado: 0 })
}

function sumarCantidades(...cantidades) {
  return cantidades.reduce((total, cantidad) => ({
    nuevo: total.nuevo + Number(cantidad?.nuevo || 0),
    reutilizado: total.reutilizado + Number(cantidad?.reutilizado || 0),
  }), { nuevo: 0, reutilizado: 0 })
}

function tieneCantidad(cantidad) {
  return Number(cantidad?.nuevo || 0) > 0 || Number(cantidad?.reutilizado || 0) > 0
}

function normalizarCantidadGuardada(valor) {
  if (valor && typeof valor === 'object') {
    return {
      nuevo: String(valor.nuevo ?? '').trim(),
      reutilizado: String(valor.reutilizado ?? '').trim(),
    }
  }

  return {
    nuevo: String(valor ?? '').trim(),
    reutilizado: '',
  }
}

function cantidadAMaterial(cantidad) {
  return {
    nuevo: cantidad.nuevo ? String(cantidad.nuevo) : '',
    reutilizado: cantidad.reutilizado ? String(cantidad.reutilizado) : '',
  }
}

function elegirMaterialDestino(fuentes, materialesBase) {
  return fuentes.find((fuente) => tieneCantidad(normalizarCantidadGuardada(materialesBase?.[fuente]))) || fuentes[0]
}

function crearMaterialesDesdeDetalle(detalleMateriales = {}, materialesBase = {}) {
  const materialesCalculados = { ...materialesBase }
  const aportesPorMaterial = {}

  camposMateriales.forEach(([item, fuentes]) => {
    const detalle = detalleMateriales?.[item] || {}
    const cantidad = sumarCantidades(
      parsearCantidadProtocolo(detalle.mantencion),
      parsearCantidadProtocolo(detalle.modificacion)
    )

    const destino = elegirMaterialDestino(fuentes, materialesBase)
    if (!destino) return

    if (!aportesPorMaterial[destino]) aportesPorMaterial[destino] = []
    aportesPorMaterial[destino].push(cantidad)
  })

  Object.entries(aportesPorMaterial).forEach(([material, aportes]) => {
    const cantidad = aportes.reduce((mayor, aporte) => ({
      nuevo: Math.max(mayor.nuevo, Number(aporte.nuevo || 0)),
      reutilizado: Math.max(mayor.reutilizado, Number(aporte.reutilizado || 0)),
    }), { nuevo: 0, reutilizado: 0 })

    materialesCalculados[material] = cantidadAMaterial(cantidad)
  })

  return materialesCalculados
}

function cantidadesIguales(a, b) {
  const cantidadA = normalizarCantidadGuardada(a)
  const cantidadB = normalizarCantidadGuardada(b)
  return cantidadA.nuevo === cantidadB.nuevo && cantidadA.reutilizado === cantidadB.reutilizado
}

function materialesVinculadosCoinciden(materialesActuales = {}, materialesDesdeDetalle = {}) {
  const materialesVinculados = new Set(camposMateriales.flatMap(([, fuentes]) => fuentes))
  return [...materialesVinculados].every((material) => (
    cantidadesIguales(materialesActuales?.[material], materialesDesdeDetalle?.[material])
  ))
}

function materialesVinculadosTienenValores(materiales = {}) {
  const materialesVinculados = new Set(camposMateriales.flatMap(([, fuentes]) => fuentes))
  return [...materialesVinculados].some((material) => tieneCantidad(normalizarCantidadGuardada(materiales?.[material])))
}

function calcularCantidades(materiales, fuentes) {
  return fuentes.reduce((suma, clave) => {
    const valor = materiales?.[clave]
    if (typeof valor === 'object') {
      return {
        nuevo: suma.nuevo + Number(valor?.nuevo || 0),
        reutilizado: suma.reutilizado + Number(valor?.reutilizado || 0),
      }
    }

    return { ...suma, nuevo: suma.nuevo + Number(valor || 0) }
  }, { nuevo: 0, reutilizado: 0 })
}

function crearDetalleInicial(materiales, detalleGuardado = {}) {
  if (
    detalleGuardado &&
    Object.keys(detalleGuardado).length > 0 &&
    (
      !materialesVinculadosTienenValores(materiales) ||
      materialesVinculadosCoinciden(materiales, crearMaterialesDesdeDetalle(detalleGuardado, materiales))
    )
  ) {
    return detalleGuardado
  }

  return Object.fromEntries(camposMateriales.map(([item, fuentes]) => {
    const cantidades = calcularCantidades(materiales, fuentes)
    const detalleCalculado = { mantencion: formatearCantidad(cantidades.nuevo, cantidades.reutilizado), modificacion: '' }
    return [item, detalleCalculado]
  }))
}

function MarcaX({ activa, onClick, style, nombre, disabled = false }) {
  return <button type="button" className="pdf-marca-x" style={style} onClick={onClick} aria-label={nombre} disabled={disabled}>{activa ? 'X' : ''}</button>
}

function nombreArchivoSeguro(valor) {
  return String(valor || 'protocolo').replace(/[\\/:*?"<>|]/g, '-').trim() || 'protocolo'
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

function crearPdfDesdeJpeg(jpegBytes) {
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
  const agregarObjeto = (numero, contenido) => {
    posiciones[numero] = largo
    agregarTexto(`${numero} 0 obj\n${contenido}\nendobj\n`)
  }
  const contenidoPagina = `q ${anchoCartaPdf} 0 0 ${altoCartaPdf} 0 0 cm /Im0 Do Q`

  agregarTexto('%PDF-1.4\n')
  agregarObjeto(1, '<< /Type /Catalog /Pages 2 0 R >>')
  agregarObjeto(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  agregarObjeto(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${anchoCartaPdf} ${altoCartaPdf}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`)
  posiciones[4] = largo
  agregarTexto(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${anchoProtocolo} /Height ${altoProtocolo} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`)
  agregarBytes(jpegBytes)
  agregarTexto('\nendstream\nendobj\n')
  agregarObjeto(5, `<< /Length ${contenidoPagina.length} >>\nstream\n${contenidoPagina}\nendstream`)

  const inicioXref = largo
  agregarTexto('xref\n0 6\n0000000000 65535 f \n')
  for (let i = 1; i <= 5; i += 1) agregarTexto(`${String(posiciones[i]).padStart(10, '0')} 00000 n \n`)
  agregarTexto(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`)

  return new Blob(partes, { type: 'application/pdf' })
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

export default function ProtocoloEntrega({ modulo, responsable, datosIniciales, materiales, onGuardar, soloLectura = false, materialesSoloLectura = false, moduloEditable = false, onCerrar }) {
  const [datos, setDatos] = useState(() => ({
    fecha: new Date().toISOString().slice(0, 10), serie: modulo?.serie || '', tipo: modulo?.tipo || '', linea: modulo?.linea || '', proyecto: modulo?.proyecto || '', responsable: responsable || '', planosRevision: '', centroCosto: '', flexNaranjo: false, flexLibre: false, flexMetalico: false,
    eva: false, thhn: false, caleco: false, canalizado: '', aterrizado: '', te1: '', observCanalizado: '', observCableado: '', observaciones: '', firma: '',
    ...datosIniciales,
    detalleMateriales: crearDetalleInicial(materiales, datosIniciales?.detalleMateriales),
  }))
  const [guardando, setGuardando] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [seleccionMaterial, setSeleccionMaterial] = useState(null)
  const [escalaProtocolo, setEscalaProtocolo] = useState(1)
  const cambiar = (campo, valor) => {
    if (soloLectura) return
    setDatos((actual) => ({ ...actual, [campo]: valor }))
  }
  const alternar = (campo) => cambiar(campo, !datos[campo])
  const opcion = (campo, valor) => cambiar(campo, datos[campo] === valor ? '' : valor)
  const material = (item, tipo, valor) => {
    if (soloLectura || materialesSoloLectura) return
    setDatos((actual) => ({ ...actual, detalleMateriales: { ...actual.detalleMateriales, [item]: { ...(actual.detalleMateriales?.[item] || {}), [tipo]: valor } } }))
  }
  const limpiarSeparadores = (valor) => String(valor || '').split('/').map((parte) => parte.trim()).filter(Boolean).join(' / ')
  const seleccionarParteMaterial = (evento, item, tipo) => {
    if (evento.detail > 1) {
      setSeleccionMaterial(null)
      return
    }

    const input = evento.currentTarget
    const valor = input.value
    if (!valor) return

    window.setTimeout(() => {
      const posicion = input.selectionStart ?? 0
      const separador = valor.indexOf('/')
      const inicioBase = separador >= 0 && posicion > separador ? separador + 1 : 0
      const finBase = separador >= 0 && posicion <= separador ? separador : valor.length
      const textoBase = valor.slice(inicioBase, finBase)
      const espaciosIniciales = textoBase.length - textoBase.trimStart().length
      const espaciosFinales = textoBase.length - textoBase.trimEnd().length
      const inicio = inicioBase + espaciosIniciales
      const fin = finBase - espaciosFinales
      const texto = valor.slice(inicio, fin)

      if (!texto) return
      input.setSelectionRange(inicio, fin)
      setSeleccionMaterial({ item, tipo, texto })
    }, 0)
  }
  const unirMateriales = (actual, agregado) => {
    const partes = [...String(actual || '').split('/'), agregado].map((parte) => parte.trim()).filter(Boolean)
    return partes.join(' / ')
  }
  const quitarMaterialSeleccionado = (valor, textoSeleccionado) => {
    const texto = String(valor || '')
    const partes = texto.split('/').map((parte) => parte.trim()).filter(Boolean)
    const indice = partes.findIndex((parte) => parte === textoSeleccionado)

    if (indice >= 0) {
      partes.splice(indice, 1)
      return partes.join(' / ')
    }

    return limpiarSeparadores(texto.replace(textoSeleccionado, ''))
  }
  const intercambiarMaterial = (item) => setDatos((actual) => {
    if (soloLectura || materialesSoloLectura) return actual
    const detalleActual = actual.detalleMateriales?.[item] || {}
    if (seleccionMaterial?.item === item && seleccionMaterial.texto) {
      const origen = seleccionMaterial.tipo
      const destino = origen === 'mantencion' ? 'modificacion' : 'mantencion'
      const textoMovido = seleccionMaterial.texto

      setSeleccionMaterial(null)
      return {
        ...actual,
        detalleMateriales: {
          ...actual.detalleMateriales,
          [item]: {
            ...detalleActual,
            [origen]: quitarMaterialSeleccionado(detalleActual[origen], textoMovido),
            [destino]: unirMateriales(detalleActual[destino], textoMovido),
          },
        },
      }
    }

    return {
      ...actual,
      detalleMateriales: {
        ...actual.detalleMateriales,
        [item]: {
          mantencion: detalleActual.modificacion || '',
          modificacion: detalleActual.mantencion || '',
        },
      },
    }
  })
  const guardar = async () => {
    if (soloLectura) return
    const materialesActualizados = materialesSoloLectura
      ? materiales
      : crearMaterialesDesdeDetalle(datos.detalleMateriales, materiales)

    setGuardando(true); await onGuardar({ ...datos, materiales: materialesActualizados }); setGuardando(false)
  }
  const imprimir = () => {
    const tituloAnterior = document.title
    const nombreSerie = nombreArchivoSeguro(modulo?.serie)

    const restaurarTitulo = () => {
      document.title = tituloAnterior
      window.removeEventListener('afterprint', restaurarTitulo)
      window.removeEventListener('beforeprint', usarSerieComoTitulo)
    }
    const usarSerieComoTitulo = () => { document.title = nombreSerie }

    usarSerieComoTitulo()
    window.addEventListener('beforeprint', usarSerieComoTitulo)
    window.addEventListener('afterprint', restaurarTitulo)
    window.requestAnimationFrame(() => window.print())
  }
  const dibujarTexto = (ctx, valor, area, opciones = {}) => {
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
  const dibujarTextoLargo = (ctx, valor, area) => {
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
  const dibujarX = (ctx, activa, area) => {
    if (!activa) return

    ctx.save()
    ctx.fillStyle = '#111'
    ctx.font = '900 20px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('X', area.left + area.width / 2, area.top + area.height / 2)
    ctx.restore()
  }
  const descargar = async () => {
    try {
      setDescargando(true)
      const imagenBase = await cargarImagen(plantillaProtocolo)
      const canvas = document.createElement('canvas')
      canvas.width = anchoProtocolo
      canvas.height = altoProtocolo
      const ctx = canvas.getContext('2d')

      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, anchoProtocolo, altoProtocolo)
      ctx.drawImage(imagenBase, 0, 0, anchoProtocolo, altoProtocolo)
      ctx.fillStyle = '#111'
      ctx.fillRect(37, 258, 1226, 1)
      ctx.fillRect(37, 1277, 606, 1)

      dibujarTexto(ctx, datos.fecha, { left: 280, top: 190, width: 405, height: 31 })
      dibujarTexto(ctx, moduloEditable ? datos.serie : modulo.serie, { left: 959, top: 190, width: 304, height: 31 })
      dibujarTexto(ctx, datos.responsable, { left: 280, top: 221, width: 405, height: 37 })
      dibujarTexto(ctx, moduloEditable ? datos.tipo : modulo.tipo, { left: 959, top: 221, width: 304, height: 37 })
      dibujarTexto(ctx, moduloEditable ? datos.linea : modulo.linea, { left: 280, top: 258, width: 405, height: 38 })
      dibujarTexto(ctx, moduloEditable ? datos.proyecto : modulo.proyecto, { left: 959, top: 258, width: 304, height: 38 })
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
        const detalleMaterial = datos.detalleMateriales?.[item] || {}
        dibujarTexto(ctx, detalleMaterial.mantencion, { left: x, top: y, width: x < 700 ? 133 : 134, height: 21 }, { font: '700 13px Arial' })
        dibujarTexto(ctx, detalleMaterial.modificacion, { left: x + saltoColumna, top: y, width: x < 700 ? 133 : 148, height: 21 }, { font: '700 13px Arial' })
      })

      dibujarTextoLargo(ctx, datos.observaciones, { left: 37, top: 1421, width: 855, height: 59 })
      dibujarTextoLargo(ctx, datos.firma, { left: 892, top: 1421, width: 371, height: 59 })

      const jpegBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1]
      const pdf = crearPdfDesdeJpeg(base64ABinario(jpegBase64))
      descargarBlob(pdf, `${nombreArchivoSeguro(moduloEditable ? datos.serie : modulo?.serie)}.pdf`)
    } finally {
      setDescargando(false)
    }
  }
  const campo = (nombre, style, props = {}) => <input className="pdf-campo" style={style} value={datos[nombre] || ''} disabled={soloLectura} onChange={(e) => cambiar(nombre, e.target.value)} {...props} />

  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]')
    if (!viewport) return

    const configuracionAnterior = viewport.getAttribute('content')
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes'
    )

    return () => viewport.setAttribute('content', configuracionAnterior || 'width=device-width, initial-scale=1.0')
  }, [])

  useEffect(() => {
    const ajustarEscala = () => {
      const anchoDisponible = window.innerWidth - 20
      setEscalaProtocolo(window.innerWidth <= 960 ? Math.min(1, Math.max(0.25, anchoDisponible / 1275)) : 1)
    }

    ajustarEscala()
    window.addEventListener('resize', ajustarEscala)
    window.addEventListener('orientationchange', ajustarEscala)

    return () => {
      window.removeEventListener('resize', ajustarEscala)
      window.removeEventListener('orientationchange', ajustarEscala)
    }
  }, [])

  return <div className="protocolo-overlay">
    <div className="protocolo-toolbar">
      {!soloLectura && <button className="protocolo-guardar" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar protocolo'}</button>}
      <button className="protocolo-descargar" onClick={descargar} disabled={descargando}>{descargando ? 'Generando PDF...' : 'Descargar PDF'}</button>
      <button className="protocolo-imprimir" onClick={imprimir}>Imprimir</button>
      <button onClick={onCerrar}>Cerrar</button>
    </div>
    <div className="protocolo-visor"><div className="pdf-protocolo-escala" style={{ width: 1275 * escalaProtocolo, height: 1650 * escalaProtocolo }}><div className="pdf-protocolo-pagina" style={{ backgroundImage: `url(${plantillaProtocolo})`, transform: `scale(${escalaProtocolo})`, transformOrigin: 'top left' }}>
      {campo('fecha', { left: 280, top: 190, width: 405, height: 31 }, { type: 'date' })}{moduloEditable ? campo('serie', { left: 959, top: 190, width: 304, height: 31 }) : <input className="pdf-campo" style={{ left: 959, top: 190, width: 304, height: 31 }} value={modulo.serie || ''} disabled />}
      {campo('responsable', { left: 280, top: 221, width: 405, height: 37 })}{moduloEditable ? campo('tipo', { left: 959, top: 221, width: 304, height: 37 }) : <input className="pdf-campo" style={{ left: 959, top: 221, width: 304, height: 37 }} value={modulo.tipo || ''} disabled />}
      {moduloEditable ? campo('linea', { left: 280, top: 258, width: 405, height: 38 }) : <input className="pdf-campo" style={{ left: 280, top: 258, width: 405, height: 38 }} value={modulo.linea || ''} disabled />}{moduloEditable ? campo('proyecto', { left: 959, top: 258, width: 304, height: 38 }) : <input className="pdf-campo" style={{ left: 959, top: 258, width: 304, height: 38 }} value={modulo.proyecto || ''} disabled />}
      {campo('planosRevision', { left: 280, top: 296, width: 405, height: 44 })}{campo('centroCosto', { left: 959, top: 296, width: 304, height: 44 })}
      <div className="pdf-linea-horizontal" style={{ left: 37, top: 258, width: 1226 }} />
      <div className="pdf-linea-horizontal" style={{ left: 37, top: 1277, width: 606 }} />
      <MarcaX activa={datos.flexNaranjo} onClick={() => alternar('flexNaranjo')} style={{ left: 183, top: 403, width: 102, height: 29 }} nombre="Flex Naranjo" disabled={soloLectura} />
      <MarcaX activa={datos.flexLibre} onClick={() => alternar('flexLibre')} style={{ left: 285, top: 403, width: 105, height: 29 }} nombre="Flex libre halógeno" disabled={soloLectura} />
      <MarcaX activa={datos.flexMetalico} onClick={() => alternar('flexMetalico')} style={{ left: 390, top: 403, width: 118, height: 29 }} nombre="Flex metálico" disabled={soloLectura} />
      {campo('observCanalizado', { left: 508, top: 403, width: 177, height: 29 })}
      <MarcaX activa={datos.eva} onClick={() => alternar('eva')} style={{ left: 818, top: 403, width: 73, height: 29 }} nombre="EVA" disabled={soloLectura} /><MarcaX activa={datos.thhn} onClick={() => alternar('thhn')} style={{ left: 891, top: 403, width: 91, height: 29 }} nombre="THHN" disabled={soloLectura} />
      <MarcaX activa={datos.caleco} onClick={() => alternar('caleco')} style={{ left: 982, top: 403, width: 118, height: 29 }} nombre="CALECO" disabled={soloLectura} />{campo('observCableado', { left: 1100, top: 403, width: 163, height: 29 })}
      <MarcaX activa={datos.canalizado === 'Cumple'} onClick={() => opcion('canalizado', 'Cumple')} style={{ left: 183, top: 475, width: 102, height: 28 }} nombre="Cumple" disabled={soloLectura} /><MarcaX activa={datos.canalizado === 'No cumple'} onClick={() => opcion('canalizado', 'No cumple')} style={{ left: 285, top: 475, width: 105, height: 28 }} nombre="No cumple" disabled={soloLectura} /><MarcaX activa={datos.canalizado === 'Autoriza'} onClick={() => opcion('canalizado', 'Autoriza')} style={{ left: 390, top: 475, width: 295, height: 28 }} nombre="Autoriza" disabled={soloLectura} />
      <MarcaX activa={datos.aterrizado === 'Sí'} onClick={() => opcion('aterrizado', 'Sí')} style={{ left: 818, top: 475, width: 73, height: 28 }} nombre="Aterrizado sí" disabled={soloLectura} /><MarcaX activa={datos.aterrizado === 'No'} onClick={() => opcion('aterrizado', 'No')} style={{ left: 891, top: 475, width: 91, height: 28 }} nombre="Aterrizado no" disabled={soloLectura} />
      <MarcaX activa={datos.te1 === 'Sí'} onClick={() => opcion('te1', 'Sí')} style={{ left: 1100, top: 475, width: 81, height: 28 }} nombre="TE-1 sí" disabled={soloLectura} /><MarcaX activa={datos.te1 === 'No'} onClick={() => opcion('te1', 'No')} style={{ left: 1181, top: 475, width: 82, height: 28 }} nombre="TE-1 no" disabled={soloLectura} />
      {camposMateriales.map(([item,, x, y]) => {
        const saltoColumna = x < 700 ? 133 : 134
        const detalleMaterial = datos.detalleMateriales?.[item] || {}
        const tieneValores = Boolean(detalleMaterial.mantencion || detalleMaterial.modificacion)
        return <div key={item}>
          {['mantencion', 'modificacion'].map((tipo, col) => <input key={`${item}-${tipo}`} className="pdf-material" style={{ left: x + col * saltoColumna, top: y, width: x < 700 ? 133 : (col ? 148 : 134), height: 21 }} value={detalleMaterial?.[tipo] ?? ''} disabled={soloLectura || materialesSoloLectura} onClick={(e) => seleccionarParteMaterial(e, item, tipo)} onChange={(e) => material(item, tipo, e.target.value)} />)}
          {tieneValores && !soloLectura && !materialesSoloLectura && <button type="button" className="pdf-material-swap" style={{ left: x + saltoColumna - 13, top: y + 1, width: 26, height: 19 }} onClick={() => intercambiarMaterial(item)} title="Cambiar entre Mantención y Modifica.">↔</button>}
        </div>
      })}
      <textarea className="pdf-campo" style={{ left: 37, top: 1421, width: 855, height: 59 }} value={datos.observaciones} disabled={soloLectura} onChange={(e) => cambiar('observaciones', e.target.value)} /><textarea className="pdf-campo" style={{ left: 892, top: 1421, width: 371, height: 59 }} value={datos.firma} disabled={soloLectura} onChange={(e) => cambiar('firma', e.target.value)} />
    </div></div></div>
  </div>
}
