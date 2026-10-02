export const BODEGA_BAYONA = 'bayona'
export const PLANTA_BAYONA = 'planta bayona'

export const BODEGAS_DISPONIBLES = [
  { valor: BODEGA_BAYONA, etiqueta: 'Bodega Bayona' },
  { valor: 'rental', etiqueta: 'Bodega Rental' },
  { valor: 'montaña', etiqueta: 'Bodega Montaña' },
]

export function normalizarCodigoUbicacion(valor = '') {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^bodega\s+/, '')
    .replace(/^planta\s+/, '')
    .trim()
}

export function obtenerCodigoBodega(valor = '') {
  const codigo = normalizarCodigoUbicacion(valor) || BODEGA_BAYONA
  return codigo === 'montana' ? 'montaña' : codigo
}

export function obtenerCodigoPlanta(valor = '') {
  const normalizado = normalizarCodigoUbicacion(valor) || 'bayona'
  const codigo = normalizado === 'montana' ? 'montaña' : normalizado
  return `planta ${codigo}`
}

export function obtenerNombreBodega(valor = '') {
  const codigo = obtenerCodigoBodega(valor)
  return `Bodega ${codigo.charAt(0).toUpperCase()}${codigo.slice(1)}`
}

export function obtenerNombrePlanta(valor = '') {
  const codigo = normalizarCodigoUbicacion(valor) || 'bayona'
  return `Planta ${codigo.charAt(0).toUpperCase()}${codigo.slice(1)}`
}
