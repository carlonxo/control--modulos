export function obtenerFechaInicialProtocoloManual({
  fechaProtocolosMensuales,
  rangoProtocolosMensuales,
  obtenerRangoFechasProtocolos,
}) {
  const hoy = new Date().toISOString().slice(0, 10)
  if (!fechaProtocolosMensuales) return hoy
  if (rangoProtocolosMensuales === 'dia') return fechaProtocolosMensuales

  const { inicio, fin } = obtenerRangoFechasProtocolos(rangoProtocolosMensuales, fechaProtocolosMensuales)
  const inicioFecha = inicio.slice(0, 10)
  const finFecha = fin.slice(0, 10)
  return hoy >= inicioFecha && hoy < finFecha ? hoy : inicioFecha
}

export function crearModuloManualProtocolo({
  fecha,
  responsable = '',
}) {
  return {
    id: `manual-nuevo-${Date.now()}`,
    origen: 'manual',
    serie: '',
    tipo: '',
    proyecto: '',
    responsable,
    linea: '',
    materiales: {},
    protocolo_entrega: {
      fecha,
      responsable,
      serie: '',
      tipo: '',
      proyecto: '',
      linea: '',
      detalleMateriales: {},
      materiales: {},
    },
  }
}
