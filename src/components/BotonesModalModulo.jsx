function BotonesModalModulo({
  perfilRol,
  moduloSeleccionado,
  puedeEditarDatosModulo,
  puedeUsarProtocolo,
  esEstadoPruebaElectrica,
  esSolicitudPruebaActiva,
  onGuardarCambios,
  onSolicitarPrueba,
  onCancelarSolicitudPrueba,
  onAbrirResumenMateriales,
  onAbrirProtocolo,
  onCerrar,
}) {
  const puedeGestionarSolicitudPrueba = ['electrico', 'operador'].includes(perfilRol)
  const puedeVerResumenMateriales = ['visor', 'analista', 'operador', 'admin'].includes(perfilRol)

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      <button
        onClick={onGuardarCambios}
        style={{
          padding: '10px',
          flex: 1,
        }}
      >
        {puedeEditarDatosModulo ? 'Guardar cambios' : 'Guardar nota'}
      </button>

      {puedeGestionarSolicitudPrueba && (
        esEstadoPruebaElectrica(moduloSeleccionado?.estado) ? (
          <button
            disabled
            style={{
              backgroundColor: '#388e3c',
              color: 'white',
              padding: '10px',
              flex: 1,
              opacity: 0.75,
              cursor: 'not-allowed',
            }}
          >
            ✓ Prueba eléctrica aprobada
          </button>
        ) : esSolicitudPruebaActiva(moduloSeleccionado?.solicitud_prueba) ? (
          <button
            onClick={onCancelarSolicitudPrueba}
            style={{
              backgroundColor: '#ff9800',
              color: 'white',
              padding: '10px',
              flex: 1,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'block' }}>🟡 Esperando aprobación</span>
            <small style={{ display: 'block', marginTop: '3px' }}>
              (presione para cancelar)
            </small>
          </button>
        ) : (
          <button
            onClick={onSolicitarPrueba}
            style={{
              backgroundColor: '#1976d2',
              color: 'white',
              padding: '10px',
              flex: 1,
            }}
          >
            ⚡ Solicitar Prueba Eléctrica
          </button>
        )
      )}

      {puedeVerResumenMateriales && (
        <button
          onClick={onAbrirResumenMateriales}
          style={{ padding: '10px', flex: 1 }}
        >
          Resumen materiales
        </button>
      )}

      {puedeUsarProtocolo && (
        <button
          onClick={onAbrirProtocolo}
          style={{ padding: '10px', flex: 1 }}
        >
          Protocolo
        </button>
      )}

      <button
        onClick={onCerrar}
        style={{
          padding: '10px',
          flex: 1,
        }}
      >
        Cerrar
      </button>
    </div>
  )
}

export default BotonesModalModulo
