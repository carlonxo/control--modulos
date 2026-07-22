export function parseLocalDate(value) {
  if (!value) return null
  const parts = String(value).split('-').map(Number)
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

export function formatearFecha(fecha) {
  if (!fecha) return ''
  const date = new Date(fecha)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
}

export function formatearFechaInput(fecha) {
  const ano = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function obtenerRangoFechasProtocolos(rango, valor) {
  if (rango === 'dia') {
    const inicio = new Date(`${valor}T00:00:00`)
    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + 1)
    return { inicio: `${valor}T00:00:00`, fin: `${formatearFechaInput(fin)}T00:00:00` }
  }

  if (rango === 'semana') {
    const [anoTexto, semanaTexto = 'W1'] = String(valor || '').split('-W')
    const ano = Number(anoTexto)
    const semana = Number(semanaTexto)
    const primerDiaAno = new Date(ano, 0, 1)
    const diaSemana = primerDiaAno.getDay() || 7
    const lunesSemana1 = new Date(ano, 0, 1 + (diaSemana <= 4 ? 1 - diaSemana : 8 - diaSemana))
    const inicio = new Date(lunesSemana1)
    inicio.setDate(lunesSemana1.getDate() + (semana - 1) * 7)
    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + 7)
    return { inicio: `${formatearFechaInput(inicio)}T00:00:00`, fin: `${formatearFechaInput(fin)}T00:00:00` }
  }

  const inicio = `${valor}-01T00:00:00`
  const fin = new Date(`${valor}-01T00:00:00`)
  fin.setMonth(fin.getMonth() + 1)
  return { inicio, fin: `${formatearFechaInput(fin)}T00:00:00` }
}

function fechaParaComparar(valor) {
  if (!valor) return ''
  const fechaComoTexto = String(valor)
  const coincidenciaFecha = fechaComoTexto.match(/^(\d{4}-\d{2}-\d{2})/)
  if (coincidenciaFecha) return coincidenciaFecha[1]
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return ''
  return fecha.toISOString().slice(0, 10)
}

export function obtenerValorInicialRangoProtocolo(rango) {
  const hoy = new Date()
  if (rango === 'dia') return formatearFechaInput(hoy)
  if (rango === 'semana') {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const diaSemana = fecha.getDay() || 7
    fecha.setDate(fecha.getDate() + 4 - diaSemana)
    const anoSemana = fecha.getFullYear()
    const inicioAnoSemana = new Date(anoSemana, 0, 1)
    const semana = Math.ceil((((fecha - inicioAnoSemana) / 86400000) + 1) / 7)
    return `${anoSemana}-W${String(semana).padStart(2, '0')}`
  }
  return formatearFechaInput(hoy).slice(0, 7)
}

export function fechaDentroDeRangoProtocolo(fecha, inicio, fin) {
  const fechaNormalizada = fechaParaComparar(fecha)
  const inicioNormalizado = fechaParaComparar(inicio)
  const finNormalizado = fechaParaComparar(fin)
  return Boolean(
    fechaNormalizada &&
    inicioNormalizado &&
    finNormalizado &&
    fechaNormalizada >= inicioNormalizado &&
    fechaNormalizada < finNormalizado
  )
}

export function esFechaDeHoy(valor) {
  if (!valor) return false
  const fecha = new Date(valor)
  const hoyLocal = new Date()

  return (
    fecha.getFullYear() === hoyLocal.getFullYear() &&
    fecha.getMonth() === hoyLocal.getMonth() &&
    fecha.getDate() === hoyLocal.getDate()
  )
}
