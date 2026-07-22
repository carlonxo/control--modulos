export function separarIdsOt(valor) {
  const valores = String(valor ?? '')
    .split(/[\/,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3)

  while (valores.length < 3) valores.push('')
  return valores
}

export function unirIdsOt(valores = []) {
  return valores
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' / ')
}

export function limpiarPrecioMaterial(valor) {
  return String(valor ?? '').replace(/[^\d]/g, '')
}

export function normalizarPrecioMaterial(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0

  const texto = String(valor ?? '').trim().replace(/[^\d,.-]/g, '')
  if (!texto) return 0

  const tienePunto = texto.includes('.')
  const tieneComa = texto.includes(',')

  if (tienePunto && tieneComa) {
    const ultimoPunto = texto.lastIndexOf('.')
    const ultimaComa = texto.lastIndexOf(',')
    if (ultimaComa > ultimoPunto) {
      return Number(texto.replace(/\./g, '').replace(',', '.')) || 0
    }
    return Number(texto.replace(/,/g, '')) || 0
  }

  if (tienePunto) {
    const partes = texto.split('.')
    const ultimaParte = partes[partes.length - 1]
    const pareceDecimal = partes.length === 2 && ultimaParte.length <= 2
    if (pareceDecimal) return Number(texto) || 0
    return Number(texto.replace(/\./g, '')) || 0
  }

  if (tieneComa) {
    const partes = texto.split(',')
    const ultimaParte = partes[partes.length - 1]
    const pareceDecimal = partes.length === 2 && ultimaParte.length <= 2
    if (pareceDecimal) return Number(texto.replace(',', '.')) || 0
    return Number(texto.replace(/,/g, '')) || 0
  }

  return Number(texto) || 0
}

export function formatearPrecioMaterial(valor) {
  const numero = normalizarPrecioMaterial(valor)
  if (!numero) return '$ 0'
  return `$ ${numero.toLocaleString('es-CL')}`
}
