export default function RegistroAcciones({
  visible,
  acciones,
  cargando,
  mostrarTodas,
  onToggle,
  onToggleVerMas,
  onActualizar,
  onDeshacer,
  nombreTipoAccion,
}) {
  const accionesVisibles = mostrarTodas ? acciones : acciones.slice(0, 5)

  return (
    <>
      <button
        aria-label="Ver acciones del día"
        onClick={onToggle}
        style={{
          position: 'fixed',
          left: '12px',
          bottom: '84px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: '2px solid white',
          background: '#1976d2',
          color: 'white',
          fontSize: '30px',
          lineHeight: '52px',
          zIndex: 2501,
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
        }}
      >
        🔂
      </button>

      {visible && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: '12px',
            bottom: '146px',
            width: 'calc(100vw - 24px)',
            maxWidth: '420px',
            maxHeight: '62vh',
            overflowY: 'auto',
            padding: '16px',
            boxSizing: 'border-box',
            border: '1px solid white',
            borderRadius: '10px',
            background: '#222',
            color: 'white',
            textAlign: 'left',
            zIndex: 2500,
            boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}>Acciones de hoy</h3>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {acciones.length > 5 && (
                <button
                  type="button"
                  onClick={onToggleVerMas}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '7px',
                    border: '1px solid #777',
                    background: '#333',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  {mostrarTodas ? 'Ver menos' : 'Ver más'}
                </button>
              )}
              <button
                type="button"
                onClick={onActualizar}
                style={{
                  padding: '6px 10px',
                  borderRadius: '7px',
                  border: '1px solid #777',
                  background: '#333',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Actualizar
              </button>
            </div>
          </div>

          {cargando ? (
            <p>Cargando...</p>
          ) : acciones.length === 0 ? (
            <p>No hay ingresos, finalizaciones o cambios de estado registrados hoy.</p>
          ) : (
            accionesVisibles.map((accion) => (
              <div
                key={accion.id}
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid #444',
                  opacity: accion.deshecho ? 0.55 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <strong>{nombreTipoAccion(accion.tipo)}</strong>
                  <span style={{ color: '#bbb', fontSize: '12px' }}>
                    {accion.created_at
                      ? new Date(accion.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '13px', color: '#ddd' }}>
                  Serie: <strong>{accion.serie || '-'}</strong>
                  {accion.linea ? ` | Línea ${accion.linea}` : ''}
                  {' | '}
                  <span style={{ color: '#ccc' }}>{accion.usuario_nombre || 'No registrado'}</span>
                </div>
                {accion.descripcion && (
                  <div style={{ marginTop: '3px', fontSize: '13px', color: '#ffecb3' }}>
                    {accion.descripcion}
                  </div>
                )}
                <button
                  type="button"
                  disabled={accion.deshecho}
                  onClick={() => onDeshacer(accion)}
                  style={{
                    marginTop: '8px',
                    padding: '7px 10px',
                    borderRadius: '7px',
                    border: '1px solid #ffb74d',
                    background: accion.deshecho ? '#555' : '#bf360c',
                    color: 'white',
                    cursor: accion.deshecho ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {accion.deshecho ? 'Deshecho' : 'Deshacer'}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </>
  )
}
