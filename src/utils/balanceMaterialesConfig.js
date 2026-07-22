export function actualizarConfigBalanceMaterialLista({
  configActual,
  clave,
  cambios,
}) {
  const configActualizada = {
    ...(configActual[clave] || {}),
    ...cambios,
  }

  return {
    configActualizada,
    configCompleta: {
      ...configActual,
      [clave]: configActualizada,
    },
  }
}

export function programarGuardadoConfigBalance({
  refGuardado,
  clave,
  config,
  guardar,
  onError,
  demora = 600,
}) {
  if (!clave) return

  clearTimeout(refGuardado.current[clave])
  refGuardado.current[clave] = setTimeout(async () => {
    const { error } = await guardar(clave, config)

    if (error) {
      onError(error)
    }
  }, demora)
}
