import { fechaParaInput, normalizarTexto } from './modulos'

export function formatearFechaRevisionGarantia(valor) {
  const fechaInput = fechaParaInput(valor)
  if (!fechaInput) return ''
  const [ano, mes, dia] = fechaInput.split('-')
  return `${dia}-${mes}-${ano}`
}

export function agregarNotaGarantiaProtocolo(
  protocolo = {},
  fechaRevision
) {
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

export function completarDatosPruebaEnProtocolo(
  protocolo = {},
  modulo = {},
  fechaPrueba,
  responsablePrueba = ''
) {
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

export function sincronizarDatosModuloEnProtocolo(protocolo = {}, modulo = {}) {
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
