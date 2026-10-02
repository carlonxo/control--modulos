export const TOTAL_LINEAS_TABLERO = 10

export const LINEAS_TABLERO = Array.from(
  { length: TOTAL_LINEAS_TABLERO },
  (_, i) => i + 1,
)

export const PLANTAS_DISPONIBLES = [
  { valor: 'planta bayona', etiqueta: 'Planta Bayona' },
  { valor: 'planta rental', etiqueta: 'Planta Rental' },
  { valor: 'planta montaña', etiqueta: 'Planta Montaña' },
]

const CONFIGURACION_PLANTAS = {
  'planta bayona': {
    lineas: LINEAS_TABLERO,
    limiteModulosPorLinea: 9,
    extremosIngreso: ['inicio', 'fin'],
  },
  'planta rental': {
    lineas: [5, 6, 7, 8],
    limiteModulosPorLinea: null,
    extremosIngreso: ['fin'],
  },
  'planta montaña': {
    // 102 identifica Línea 2B sin cambiar el tipo numérico actual de la columna.
    lineas: [1, 2, 102, 3, 4],
    limiteModulosPorLinea: null,
    extremosIngreso: ['fin'],
  },
}

export function obtenerConfiguracionPlanta(planta = 'planta bayona') {
  return CONFIGURACION_PLANTAS[planta] || CONFIGURACION_PLANTAS['planta bayona']
}

export function etiquetaLinea(linea) {
  return Number(linea) === 102 ? '2B' : String(linea ?? '')
}
