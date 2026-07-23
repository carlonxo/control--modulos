export function esSolicitudPruebaActiva(valor) {
  return valor === true || valor === 'true' || valor === 1
}

export function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export function esEstadoPruebaElectrica(estado) {
  return ['prueba eléctrica', 'prueba electrica'].includes(
    String(estado || '').trim().toLowerCase()
  )
}

export function esTipoBodega(tipo) {
  return normalizarTexto(tipo).includes('bodega')
}

export function esEstadoConObservacionAlerta(estado) {
  return ['prueba electrica', 'en garantia', 'sin instalacion'].includes(
    normalizarTexto(estado)
  )
}

export function esEstadoGarantia(estado) {
  return normalizarTexto(estado) === 'en garantia'
}

export function fechaParaInput(valor) {
  if (!valor) return ''
  const fechaComoTexto = String(valor)
  const coincidenciaFecha = fechaComoTexto.match(/^(\d{4}-\d{2}-\d{2})/)
  if (coincidenciaFecha) return coincidenciaFecha[1]
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return ''
  return fecha.toISOString().slice(0, 10)
}

export function fechaDocumentoProtocolo(registro = {}) {
  const fechaInterna = registro?.protocolo_entrega?.fecha
  if (fechaInterna) return `${fechaInterna}T00:00:00`
  return registro?.fecha_prueba_electrica || null
}

export function claveProtocoloUnico(serie, fecha) {
  const serieNormalizada = normalizarTexto(serie)
  const fechaNormalizada = fechaParaInput(fecha || '')
  return serieNormalizada && fechaNormalizada ? `${serieNormalizada}|${fechaNormalizada}` : ''
}

function diasDesdeFecha(valor) {
  if (!valor) return null
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return null
  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  return Math.floor((inicioHoy - inicioFecha) / 86400000)
}

export function estaDentroDeGarantia(valor) {
  const dias = diasDesdeFecha(valor)
  return dias !== null && dias >= 0 && dias <= 90
}
