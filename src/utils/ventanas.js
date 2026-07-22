export function ejecutarSetters(setters = [], valor = false) {
  setters.forEach((setter) => setter(valor))
}

export function hayCambiosPendientesPorId(registros = {}, id) {
  return Boolean(id && Object.keys(registros[id] || {}).length > 0)
}

export function eliminarEntradaPorId(registros = {}, id) {
  const copia = { ...registros }
  delete copia[id]
  return copia
}
