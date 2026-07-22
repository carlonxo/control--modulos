export function crearFilaValeBodega(fila = {}, totalActual = 0) {
  return {
    id: `vale-${Date.now()}-${totalActual}`,
    materialVale: fila.materialVale || '',
    materialBalance: fila.materialBalance || '',
    cantidad: fila.cantidad || '',
  }
}

export function agregarFilaValeBodegaLista(filas, fila = {}) {
  return [
    ...filas,
    crearFilaValeBodega(fila, filas.length),
  ]
}

export function actualizarFilaValeBodegaLista(filas, index, cambios) {
  return filas.map((fila, filaIndex) => (
    filaIndex === index ? { ...fila, ...cambios } : fila
  ))
}

export function eliminarFilaValeBodegaLista(filas, index) {
  return filas.filter((_, filaIndex) => filaIndex !== index)
}

export function prepararItemsValeBodega(filas = []) {
  return filas
    .map((fila) => ({
      material_vale: String(fila.materialVale || '').trim(),
      material_balance: String(fila.materialBalance || '').trim(),
      cantidad: Number(fila.cantidad || 0),
    }))
    .filter((fila) => fila.material_balance && fila.cantidad > 0)
}
