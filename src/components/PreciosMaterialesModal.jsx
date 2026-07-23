import { useState } from 'react'

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
  onRenombrarMaterial,
  onAgregarMaterial,
  onEliminarMaterial,
  onGuardar,
  onCerrar,
  onClickFondo,
}) {
  const [materialEnEdicion, setMaterialEnEdicion] = useState(null)
  const [nombreMaterialEditado, setNombreMaterialEditado] = useState('')
  const puedeVerCompra = puedeEditar
  const claveEdicion = (material, tipo) => `${tipo}::${material}`
  const estaEditando = (material, tipo) => precioEnEdicion === claveEdicion(material, tipo)
  const columnasPrecio = puedeEditar
    ? (puedeVerCompra ? '56px minmax(190px, 340px) 96px 96px 30px' : '56px minmax(190px, 340px) 96px 30px')
    : '56px minmax(190px, 340px) 112px'
  const precioWrapStyle = {
    display: 'grid',
    gridTemplateColumns: '16px max-content',
    gap: '2px',
    alignItems: 'center',
    justifyContent: 'start',
    minWidth: 0,
  }
  const inputPrecioStyle = () => ({
    width: '100%',
    minWidth: 0,
    maxWidth: '78px',
    padding: '2px 5px',
    boxSizing: 'border-box',
    textAlign: 'right',
    lineHeight: 1.2,
    font: 'inherit',
    fontWeight: 'inherit',
    color: 'white',
    background: '#263238',
    border: '1px solid #64b5f6',
    borderRadius: '4px',
    outline: 'none',
  })
  const valorPrecioStyle = (editable = true) => ({
    display: 'block',
    width: '100%',
    minWidth: 0,
    maxWidth: '78px',
    boxSizing: 'border-box',
    textAlign: 'right',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    cursor: editable ? 'text' : 'default',
  })
  const iniciarEdicionMaterial = (item) => {
    if (!puedeEditar) return
    setMaterialEnEdicion(item.material)
    setNombreMaterialEditado(item.material)
  }
  const confirmarEdicionMaterial = (item) => {
    const nuevoNombre = nombreMaterialEditado.trim()
    setMaterialEnEdicion(null)
    if (!nuevoNombre || nuevoNombre === item.material) return
    onRenombrarMaterial?.(item, nuevoNombre)
  }
  const cancelarEdicionMaterial = () => {
    setMaterialEnEdicion(null)
    setNombreMaterialEditado('')
  }
  const ordenarMaterialesSeccion = (items) => items
    .map((item, ordenOriginal) => ({ item, ordenOriginal }))
    .sort((a, b) => {
      const aManual = !a.item.idArt
      const bManual = !b.item.idArt

      if (aManual && bManual) {
        return String(a.item.material || '').localeCompare(String(b.item.material || ''), 'es', {
          numeric: true,
          sensitivity: 'base',
        })
      }

      if (aManual !== bManual) return aManual ? 1 : -1
      return a.ordenOriginal - b.ordenOriginal
    })
    .map(({ item }) => item)

  return (
    <div
      onClick={onClickFondo}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'calc(100vw - 32px)',
        maxWidth: puedeEditar ? '720px' : '560px',
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
                  padding: '8px 10px',
                  background: '#333',
                  fontWeight: 700,
                  cursor: 'pointer',
                  listStylePosition: 'inside',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    width: 'calc(100% - 18px)',
                    verticalAlign: 'middle',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                >
                  <span
                    title={seccion}
                    style={{
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {seccion}
                  </span>
                  {puedeEditar && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onAgregarMaterial(seccion)
                      }}
                      style={{
                        flex: '0 0 28px',
                        width: '30px',
                        height: '28px',
                        borderRadius: '50%',
                        border: '1px solid #90caf9',
                        background: '#0d47a1',
                        color: 'white',
                        fontSize: '20px',
                        lineHeight: '24px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      title={`Agregar material a ${seccion}`}
                    >
                      +
                    </button>
                  )}
                </span>
              </summary>

              <div style={{ padding: '8px 10px', overflowX: 'auto' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: columnasPrecio,
                    gap: '10px',
                    alignItems: 'center',
                    padding: '0 0 6px',
                    color: '#bbb',
                    fontSize: '13px',
                    fontWeight: 800,
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>ID</span>
                  <span style={{ whiteSpace: 'nowrap' }}>Material</span>
                  <span style={{ paddingLeft: '20px', whiteSpace: 'nowrap' }}>Venta</span>
                  {puedeVerCompra && <span style={{ paddingLeft: '20px', whiteSpace: 'nowrap' }}>Compra</span>}
                  {puedeEditar && <span aria-label="Eliminar" />}
                </div>
                {ordenarMaterialesSeccion(catalogo
                  .filter((item) => item.seccion === seccion))
                  .map((item) => (
                    <div
                      key={item.material}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: columnasPrecio,
                        gap: '8px',
                        alignItems: 'center',
                        padding: '7px 0',
                        borderBottom: '1px solid #444',
                      }}
                    >
                      <strong style={{ color: '#bbb', fontSize: '13px' }}>
                        {item.idArtVisible || item.idArt}
                      </strong>
                      {materialEnEdicion === item.material ? (
                        <input
                          type="text"
                          value={nombreMaterialEditado}
                          onChange={(e) => setNombreMaterialEditado(e.target.value)}
                          onBlur={() => confirmarEdicionMaterial(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmarEdicionMaterial(item)
                            if (e.key === 'Escape') cancelarEdicionMaterial()
                          }}
                          autoFocus
                          style={{
                            width: '100%',
                            minWidth: 0,
                            boxSizing: 'border-box',
                            padding: '2px 5px',
                            lineHeight: 1.2,
                            font: 'inherit',
                            fontWeight: 'inherit',
                            color: 'white',
                            background: '#263238',
                            border: '1px solid #64b5f6',
                            borderRadius: '4px',
                            outline: 'none',
                          }}
                          title="Editando nombre del material"
                        />
                      ) : (
                        <span
                          title={puedeEditar ? 'Doble click para editar nombre' : item.material}
                          onDoubleClick={() => iniciarEdicionMaterial(item)}
                          style={{
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            minWidth: 0,
                            cursor: puedeEditar ? 'text' : 'default',
                          }}
                        >
                          {item.material}
                        </span>
                      )}
                      <div>
                        <div style={precioWrapStyle}>
                          <span style={{ color: '#00c853', fontSize: '20px', lineHeight: 1, fontWeight: 900 }}>▲</span>
                          {estaEditando(item.material, 'venta') ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={formatearPrecio(precios[item.material])}
                              onChange={(e) => onActualizarPrecio(item.material, 'venta', e.target.value)}
                              onBlur={() => onCambiarEdicion(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') onCambiarEdicion(null)
                              }}
                              autoFocus
                              placeholder="$ 0"
                              style={inputPrecioStyle()}
                              title="Editando precio venta"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => puedeEditar && onCambiarEdicion(claveEdicion(item.material, 'venta'))}
                              style={valorPrecioStyle(puedeEditar)}
                              title={puedeEditar ? 'Doble click para editar precio venta' : 'Precio venta'}
                            >
                              {formatearPrecio(precios[item.material]) || '$ 0'}
                            </span>
                          )}
                        </div>
                      </div>
                      {puedeVerCompra && (
                        <div>
                          <div style={precioWrapStyle}>
                            <span style={{ color: '#ff1744', fontSize: '20px', lineHeight: 1, fontWeight: 900 }}>▼</span>
                            {estaEditando(item.material, 'compra') ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={formatearPrecio(preciosCompra[item.material])}
                                onChange={(e) => onActualizarPrecio(item.material, 'compra', e.target.value)}
                                onBlur={() => onCambiarEdicion(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'Escape') onCambiarEdicion(null)
                                }}
                                autoFocus
                                placeholder="$ 0"
                                style={inputPrecioStyle()}
                                title="Editando precio compra"
                              />
                            ) : (
                              <span
                                onDoubleClick={() => onCambiarEdicion(claveEdicion(item.material, 'compra'))}
                                style={valorPrecioStyle(true)}
                                title="Doble click para editar precio compra"
                              >
                                {formatearPrecio(preciosCompra[item.material]) || '$ 0'}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {puedeEditar && (
                        <button
                          type="button"
                          onClick={() => onEliminarMaterial?.(item)}
                          style={{
                            width: '28px',
                            height: '28px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #777',
                            borderRadius: '6px',
                            background: '#1b1b1b',
                            color: 'white',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                          title={`Eliminar ${item.material}`}
                          aria-label={`Eliminar ${item.material}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              fill="currentColor"
                              d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 12H8L7 9Zm3 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z"
                            />
                          </svg>
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
