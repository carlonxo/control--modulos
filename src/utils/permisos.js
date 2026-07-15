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
  descargarProtocolosDiarios: ['analista', 'admin', 'operador', 'control_calidad'],
  verPreciosMateriales: ['operador', 'analista', 'admin'],
  editarPreciosMateriales: ['analista', 'admin'],
  verProtocolosMensuales: ['analista', 'admin'],
  verBalanceMateriales: ['analista', 'admin'],
  eliminarProtocolosMensuales: ['admin', 'analista'],
  ajustarValoresProtocolos: ['admin', 'analista'],
  verMenuModulo: ['admin', 'operador'],
}

export function tienePermiso(rol, accion) {
  return permisosPorAccion[accion]?.includes(rol) || false
}

export { permisosPorAccion }
