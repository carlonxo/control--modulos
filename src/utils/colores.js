import { estaDentroDeGarantia, normalizarTexto } from './modulos'

export function colorEstado(estado, modulo = {}) {
  switch (normalizarTexto(estado)) {
    case 'sin iniciar':
      return '#808080'

    case 'canalizado':
      return '#d32f2f'

    case 'cableado':
      return '#fbc02d'

    case 'terminaciones':
      return '#1976d2'

    case 'prueba electrica':
    case 'sin instalacion':
      return '#388e3c'

    case 'en garantia':
      return estaDentroDeGarantia(modulo.fecha_prueba_electrica) ? '#388e3c' : '#d32f2f'

    default:
      return '#444'
  }
}
