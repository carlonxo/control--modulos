export function etiquetaNumeroValeBodega(numero) {
  return numero == null ? '' : `N° ${String(numero).padStart(6, '0')}`
}
