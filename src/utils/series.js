export function normalizarSerieParaComparar(valor) {
  const serie = String(valor || '').trim()
  if (!/^\d+$/.test(serie)) return serie.toLocaleLowerCase('es')
  return serie.replace(/^0+(?=\d)/, '')
}

export function filtrarConsultaPorSerieEquivalente(consulta, serie) {
  const serieLimpia = String(serie || '').trim()
  const serieCanonica = normalizarSerieParaComparar(serieLimpia)
  if (/^\d+$/.test(serieCanonica)) {
    return consulta.ilike('serie', `%${serieCanonica}`)
  }
  return consulta.eq('serie', serieLimpia)
}

export function filtrarRegistrosPorSerieEquivalente(registros = [], serieBuscada) {
  const serieCanonica = normalizarSerieParaComparar(serieBuscada)
  return (registros || []).filter((registro) => (
    normalizarSerieParaComparar(registro?.serie) === serieCanonica
  ))
}

export function sonSeriesEquivalentes(serieA, serieB) {
  const serieCanonicaA = normalizarSerieParaComparar(serieA)
  return Boolean(serieCanonicaA) && serieCanonicaA === normalizarSerieParaComparar(serieB)
}
