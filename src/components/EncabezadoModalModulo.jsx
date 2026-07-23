function IconoOpcionesModulo() {
  return (
    <svg
      viewBox="0 0 64 64"
      width="34"
      height="34"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="16" y1="8" x2="16" y2="56" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <circle cx="16" cy="42" r="9" fill="currentColor" />
      <line x1="32" y1="8" x2="32" y2="56" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <circle cx="32" cy="20" r="9" fill="currentColor" />
      <line x1="48" y1="8" x2="48" y2="56" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <circle cx="48" cy="34" r="9" fill="currentColor" />
    </svg>
  )
}

export default function EncabezadoModalModulo({
  puedeVerMenuModulo,
  puedeFinalizarModulos,
  puedeEliminarModulo,
  mostrarMenuModulo,
  pruebaBloqueada,
  puedeDejarObservacionAlerta,
  onToggleMenu,
  onEliminarModulo,
  onAbrirEditorMateriales,
  onSolicitarPrueba,
  onDejarObservacion,
  onFinalizarModulo,
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h2 style={{ margin: '0 0 12px' }}>Módulo</h2>
      {puedeVerMenuModulo && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <button
              type="button"
              aria-label="Opciones del módulo"
              onClick={onToggleMenu}
              style={{
                width: '44px',
                height: '44px',
                background: 'transparent',
                color: 'white',
                padding: '4px',
                border: 'none',
                cursor: 'pointer',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Opciones del módulo"
            >
              <IconoOpcionesModulo />
            </button>

            {mostrarMenuModulo && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 'calc(100% + 6px)',
                  width: '170px',
                  background: '#111',
                  border: '1px solid #555',
                  borderRadius: '8px',
                  padding: '6px',
                  boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
                  zIndex: 1200,
                  boxSizing: 'border-box',
                }}
              >
                {puedeEliminarModulo && (
                  <button
                    type="button"
                    onClick={onEliminarModulo}
                    style={{
                      width: '100%',
                      background: '#5d4037',
                      color: 'white',
                      padding: '10px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 700,
                      marginBottom: '6px',
                    }}
                  >
                    Eliminar módulo
                  </button>
                )}

                <button
                  type="button"
                  onClick={onAbrirEditorMateriales}
                  style={{
                    width: '100%',
                    background: '#455a64',
                    color: 'white',
                    padding: '10px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: 700,
                    marginBottom: '6px',
                  }}
                >
                  Materiales {'\u{1F4DC}'}
                </button>

                <button
                  type="button"
                  disabled={pruebaBloqueada}
                  onClick={onSolicitarPrueba}
                  style={{
                    width: '100%',
                    background: '#1976d2',
                    color: 'white',
                    padding: '10px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: pruebaBloqueada ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    fontWeight: 700,
                    opacity: pruebaBloqueada ? 0.65 : 1,
                    marginBottom: puedeDejarObservacionAlerta ? '6px' : 0,
                  }}
                >
                  Llamar a prueba eléctrica {'\u26A1'}
                </button>

                {puedeDejarObservacionAlerta && (
                  <button
                    type="button"
                    onClick={onDejarObservacion}
                    style={{
                      width: '100%',
                      background: '#b71c1c',
                      color: 'white',
                      padding: '10px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 700,
                    }}
                  >
                    Dejar observación {'\u{1F4DC}'}
                  </button>
                )}
              </div>
            )}
          </div>

          {puedeFinalizarModulos && (
            <button
              onClick={onFinalizarModulo}
              style={{
                background: '#d32f2f',
                color: 'white',
                padding: '10px 14px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                flex: '0 0 180px',
                maxWidth: '55%',
              }}
            >
              Finalizar módulo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
