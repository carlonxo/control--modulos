export function colorEstado(estado = '') {
  switch (estado.toLowerCase()) {
    case 'canalizado':
      return '#2563eb'
    case 'cableado':
      return '#7c3aed'
    case 'terminaciones':
      return '#ea580c'
    case 'prueba eléctrica':
    case 'prueba electrica':
      return '#16a34a'
    case 'sin iniciar':
    default:
      return '#4b5563'
  }
}
