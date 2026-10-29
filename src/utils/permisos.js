const permisosPorAccion = {
  soloLectura: ['visor', 'analista', 'electrico'],
  agregarModulos: ['admin', 'operador', 'colaborador'],
  moverModulos: ['admin', 'operador', 'colaborador'],
  finalizarModulos: ['admin', 'colaborador'],
  resolverPrueba: ['admin', 'control_calidad'],
  usarProtocolo: ['admin', 'operador', 'control_calidad', 'visor', 'analista'],
  editarProtocolo: ['admin', 'operador'],
  editarDatosProtocolo: ['admin', 'operador', 'control_calidad'],
  recibirAvisosPrueba: ['admin', 'control_calidad', 'operador'],
  descargarProtocolosDiarios: ['analista', 'admin', 'operador', 'control_calidad', 'visor'],
  verPreciosMateriales: ['operador', 'analista', 'admin', 'visor'],
  verPreciosCompraMateriales: ['analista', 'admin', 'visor'],
  editarPreciosMateriales: ['analista', 'admin'],
  verProtocolosMensuales: ['analista', 'admin', 'visor'],
  editarProtocolosMensuales: ['analista', 'admin'],
  verBalanceMateriales: ['analista', 'admin', 'operador', 'visor'],
  editarConfigBalanceMateriales: ['analista', 'admin'],
  verBalanceMantencion: ['analista', 'admin'],
  verValesBodega: ['analista', 'admin'],
  verBodega: ['admin', 'supervisor', 'analista', 'operador', 'bodega', 'electrico', 'visor'],
  verProyeccionMateriales: ['admin', 'supervisor', 'analista', 'operador', 'bodega', 'visor'],
  exportarInventarioBodega: ['admin', 'analista', 'bodega'],
  administrarBodega: ['admin'],
  verPedidosBodegaHoy: ['admin', 'supervisor', 'operador', 'analista', 'bodega', 'visor'],
  editarPedidosBodega: ['admin', 'operador', 'analista', 'bodega'],
  eliminarProtocolosMensuales: ['admin', 'analista'],
  ajustarValoresProtocolos: ['admin', 'analista'],
  verMenuModulo: ['admin', 'operador'],
}

export function tienePermiso(rol, accion) {
  return permisosPorAccion[accion]?.includes(rol) || false
}

export { permisosPorAccion }
