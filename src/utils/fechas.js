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
