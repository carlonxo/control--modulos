function PreciosMaterialesModal({
  puedeEditar,
  cargando,
  guardando,
  secciones,
  catalogo,
  precios,
  precioEnEdicion,
  formatearPrecio,
  onActualizarPrecio,
  onCambiarEdicion,
  onGuardar,
  onCerrar,
  onClickFondo,
}) {
  return (
    <div
      onClick={onClickFondo}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'calc(100vw - 32px)',
        maxWidth: '520px',
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        padding: '20px',
        background: '#222',
        border: '1px solid white',
        borderRadius: '10px',
        zIndex: 1300,
        color: 'white',
        textAlign: 'left',
      }}
    >
      <h2 style={{ marginTop: 0 }}>Precios materiales</h2>
      <p style={{ marginTop: 0, color: '#ccc' }}>
        {puedeEditar
          ? 'Estos precios quedan como catálogo global para cálculos futuros.'
          : 'Consulta de precios de materiales.'}
      </p>

      {cargando ? (
        <p>Cargando precios...</p>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {secciones.map((seccion, index) => (
            <details
              key={seccion}
              defaultOpen={index === 0}
              style={{ border: '1px solid #555', borderRadius: '8px', overflow: 'hidden' }}
            >
              <summary
                style={{
                  padding: '10px 12px',
                  background: '#333',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {seccion}
              </summary>

              <div style={{ padding: '8px 10px' }}>
                {catalogo
                  .filter((item) => item.seccion === seccion)
                  .map((item) => (
                    <div
                      key={item.material}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: puedeEditar
                          ? '72px minmax(0, 1fr) 120px 42px'
                          : '72px minmax(0, 1fr) 120px',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '7px 0',
                        borderBottom: '1px solid #444',
                      }}
                    >
                      <strong style={{ color: '#bbb', fontSize: '13px' }}>
                        {item.idArt}
                      </strong>
                      <span style={{ lineHeight: 1.2 }}>{item.material}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatearPrecio(precios[item.material])}
                        onChange={(e) => onActualizarPrecio(item.material, e.target.value)}
                        disabled={!puedeEditar || precioEnEdicion !== item.material}
                        placeholder="$ 0"
                        style={{
                          width: '100%',
                          padding: '8px',
                          boxSizing: 'border-box',
                          textAlign: 'right',
                          opacity: puedeEditar ? 1 : 0.8,
                          background: precioEnEdicion === item.material ? 'white' : '#ddd',
                          color: '#111',
                        }}
                      />
                      {puedeEditar && (
                        <button
                          type="button"
                          onClick={() => onCambiarEdicion((actual) => (
                            actual === item.material ? null : item.material
                          ))}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            border: '1px solid #777',
                            background: precioEnEdicion === item.material ? '#fbc02d' : '#333',
                            color: precioEnEdicion === item.material ? '#111' : 'white',
                            cursor: 'pointer',
                            fontSize: '18px',
                          }}
                          title="Editar precio"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </details>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
        {puedeEditar && (
          <button
            type="button"
            onClick={onGuardar}
            disabled={cargando || guardando}
            style={{
              flex: 1,
              padding: '12px',
              background: '#2e7d32',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: cargando || guardando ? 'not-allowed' : 'pointer',
            }}
          >
            {guardando ? 'Guardando...' : 'Guardar precios'}
          </button>
        )}

        <button
          type="button"
          onClick={onCerrar}
          style={{ flex: 1, padding: '12px' }}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default PreciosMaterialesModal
