import { esFechaDeHoy } from './fechas'

function esEstado(valor, estado) {
  return String(valor || '').toLowerCase() === estado
}

function esEstadoPruebaElectricaTexto(valor) {
  const estado = String(valor || '').toLowerCase()
  return estado === 'prueba eléctrica' || estado === 'prueba electrica'
}

export function calcularIndicadoresTablero(datos = [], historial = []) {
  const modulosActivos = datos.filter((modulo) => modulo.serie)
  const ocupacion = modulosActivos.length
  const canalizados = modulosActivos.filter((modulo) => esEstado(modulo.estado, 'canalizado')).length
  const cableados = modulosActivos.filter((modulo) => esEstado(modulo.estado, 'cableado')).length
  const terminaciones = modulosActivos.filter((modulo) => esEstado(modulo.estado, 'terminaciones')).length
  const pruebas = modulosActivos.filter((modulo) => esEstadoPruebaElectricaTexto(modulo.estado)).length
  const pruebasElectricasHoy = [...modulosActivos, ...historial].filter(
    (modulo) => esFechaDeHoy(modulo.fecha_prueba_electrica)
  ).length

  const hoy = new Date().toISOString().slice(0, 10)
  const terminadosHoy = historial.filter(
    (modulo) => modulo.fecha_salida && modulo.fecha_salida.slice(0, 10) === hoy
  ).length

  const mesActual = new Date().getMonth()
  const anioActual = new Date().getFullYear()
  const pruebasElectricasMes = [...modulosActivos, ...historial].filter((modulo) => {
    if (!modulo.fecha_prueba_electrica) return false
    const fecha = new Date(modulo.fecha_prueba_electrica)

    return (
      !Number.isNaN(fecha.getTime()) &&
      fecha.getMonth() === mesActual &&
      fecha.getFullYear() === anioActual
    )
  }).length

  const ultimosFinalizados = [...historial]
    .filter((item) => item.serie)
    .sort((a, b) => new Date(b.fecha_salida || 0) - new Date(a.fecha_salida || 0))
    .slice(0, 5)

  return {
    modulosActivos,
    ocupacion,
    canalizados,
    cableados,
    terminaciones,
    pruebas,
    pruebasElectricasHoy,
    terminadosHoy,
    pruebasElectricasMes,
    ultimosFinalizados,
  }
}
