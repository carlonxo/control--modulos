function PreciosMaterialesModal({
  puedeEditar,
  cargando,
  guardando,
  secciones,
  catalogo,
  precios,
  preciosCompra,
  precioEnEdicion,
  formatearPrecio,
  onActualizarPrecio,
  onCambiarEdicion,
  onGuardar,
  onCerrar,
  onClickFondo,
}) {
  const puedeVerCompra = puedeEditar
  const claveEdicion = (material, tipo) => `${tipo}::${material}`
  const estaEditando = (material, tipo) => precioEnEdicion === claveEdicion(material, tipo)

  return (
    <div
      onClick={onClickFondo}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'calc(100vw - 32px)',
        maxWidth: puedeEditar ? '680px' : '520px',
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

              <div style={{ padding: '8px 10px', overflowX: 'auto' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: puedeEditar
                      ? (puedeVerCompra ? '72px minmax(0, 1fr) 118px 118px' : '72px minmax(0, 1fr) 120px')
                      : '72px minmax(0, 1fr) 120px',
                    gap: '10px',
                    alignItems: 'center',
                    padding: '0 0 6px',
                    color: '#bbb',
                    fontSize: '13px',
                    fontWeight: 800,
                  }}
                >
                  <span>ID</span>
                  <span>Material</span>
                  <span style={{ paddingLeft: '24px' }}>Venta</span>
                  {puedeVerCompra && <span style={{ paddingLeft: '24px' }}>Compra</span>}
                </div>
                {catalogo
                  .filter((item) => item.seccion === seccion)
                  .map((item) => (
                    <div
                      key={item.material}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: puedeEditar
                          ? (puedeVerCompra ? '72px minmax(0, 1fr) 118px 118px' : '72px minmax(0, 1fr) 120px')
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
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '6px', alignItems: 'center' }}>
                          <span style={{ color: '#00c853', fontSize: '20px', lineHeight: 1, fontWeight: 900 }}>▲</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={formatearPrecio(precios[item.material])}
                            onChange={(e) => onActualizarPrecio(item.material, 'venta', e.target.value)}
                            onDoubleClick={() => puedeEditar && onCambiarEdicion(claveEdicion(item.material, 'venta'))}
                            onBlur={() => estaEditando(item.material, 'venta') && onCambiarEdicion(null)}
                            disabled={!puedeEditar}
                            readOnly={!estaEditando(item.material, 'venta')}
                            placeholder="$ 0"
                            style={{
                              width: '100%',
                              padding: '8px',
                              boxSizing: 'border-box',
                              textAlign: 'right',
                              opacity: puedeEditar ? 1 : 0.8,
                              background: estaEditando(item.material, 'venta') ? 'white' : '#ddd',
                              color: '#111',
                              cursor: puedeEditar ? 'text' : 'default',
                            }}
                            title={puedeEditar ? 'Doble click para editar precio venta' : 'Precio venta'}
                          />
                        </div>
                      </div>
                      {puedeVerCompra && (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: '6px', alignItems: 'center' }}>
                            <span style={{ color: '#ff1744', fontSize: '20px', lineHeight: 1, fontWeight: 900 }}>▼</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={formatearPrecio(preciosCompra[item.material])}
                              onChange={(e) => onActualizarPrecio(item.material, 'compra', e.target.value)}
                              onDoubleClick={() => onCambiarEdicion(claveEdicion(item.material, 'compra'))}
                              onBlur={() => estaEditando(item.material, 'compra') && onCambiarEdicion(null)}
                              readOnly={!estaEditando(item.material, 'compra')}
                              placeholder="$ 0"
                              style={{
                                width: '100%',
                                padding: '8px',
                                boxSizing: 'border-box',
                                textAlign: 'right',
                                background: estaEditando(item.material, 'compra') ? 'white' : '#ddd',
                                color: '#111',
                                cursor: 'text',
                              }}
                              title="Doble click para editar precio compra"
                            />
                          </div>
                        </div>
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
