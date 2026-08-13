import { useEffect, useMemo, useState } from 'react'

function EquivalenciasMaterialesModal({
  equivalencias = [],
  materialesCatalogo = [],
  cargando = false,
  guardando = false,
  onGuardar,
  onCerrar,
}) {
  const [filas, setFilas] = useState(equivalencias)

  useEffect(() => {
    setFilas(equivalencias)
  }, [equivalencias])

  const opcionesCatalogo = useMemo(() => {
    const mapa = new Map()
    materialesCatalogo
      .filter(Boolean)
      .forEach((material) => {
        const clave = String(material).trim().toLowerCase()
        if (!clave || mapa.has(clave)) return
        mapa.set(clave, String(material).trim())
      })
    return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'es', {
      numeric: true,
      sensitivity: 'base',
    }))
  }, [materialesCatalogo])

  const actualizarFila = (index, campo, valor) => {
    setFilas((actuales) => actuales.map((fila, filaIndex) => (
      filaIndex === index ? { ...fila, [campo]: valor } : fila
    )))
  }

  const agregarFila = () => {
    setFilas((actuales) => [
      ...actuales,
      {
        origen: '',
        destino: '',
        tipo: 'contiene',
        activo: true,
      },
    ])
  }

  const quitarFila = (index) => {
    setFilas((actuales) => actuales.filter((_, filaIndex) => filaIndex !== index))
  }

  const guardar = () => {
    onGuardar?.(filas)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'calc(100vw - 28px)',
        maxWidth: '980px',
        maxHeight: 'calc(100vh - 28px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        padding: '20px',
        background: '#222',
        border: '1px solid white',
        borderRadius: '10px',
        zIndex: 1300,
        color: 'white',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: '0 0 6px' }}>Equivalencias materiales</h2>
          <p style={{ margin: 0, color: '#ccc' }}>
            Define cómo se agrupan los nombres de bodega hacia el catálogo usado en balances.
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          style={{
            padding: '10px 22px',
            borderRadius: '8px',
            border: '1px solid #777',
            background: '#555',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Cerrar
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginTop: '16px',
          marginBottom: '10px',
        }}
      >
        <span style={{ color: '#bbb' }}>
          {filas.length} equivalencias
        </span>
        <button
          type="button"
          onClick={agregarFila}
          disabled={cargando || guardando}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #4caf50',
            background: '#1b5e20',
            color: 'white',
            cursor: cargando || guardando ? 'not-allowed' : 'pointer',
            fontWeight: 700,
          }}
        >
          + Agregar equivalencia
        </button>
      </div>

      {cargando ? (
        <p style={{ color: '#ccc' }}>Cargando equivalencias...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
            <thead>
              <tr style={{ background: '#333' }}>
                <th style={thStyle}>Material / texto detectado</th>
                <th style={thStyle}>Se agrupa como</th>
                <th style={{ ...thStyle, width: '130px' }}>Regla</th>
                <th style={{ ...thStyle, width: '90px', textAlign: 'center' }}>Activo</th>
                <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>Quitar</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, index) => (
                <tr key={`${fila.id || 'nuevo'}-${index}`}>
                  <td style={tdStyle}>
                    <input
                      value={fila.origen || ''}
                      onChange={(e) => actualizarFila(index, 'origen', e.target.value)}
                      placeholder="Ej: CABLE RZ-1 2.5 MM2 BLANCO"
                      style={inputStyle}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      value={fila.destino || ''}
                      list="equivalencias-materiales-catalogo"
                      onChange={(e) => actualizarFila(index, 'destino', e.target.value)}
                      placeholder="Material del catálogo"
                      style={inputStyle}
                    />
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={fila.tipo === 'exacto' ? 'exacto' : 'contiene'}
                      onChange={(e) => actualizarFila(index, 'tipo', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="contiene">Contiene</option>
                      <option value="exacto">Exacto</option>
                    </select>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={fila.activo !== false}
                      onChange={(e) => actualizarFila(index, 'activo', e.target.checked)}
                      style={{ transform: 'scale(1.3)' }}
                    />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => quitarFila(index)}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        border: '1px solid #ef5350',
                        background: '#7f1d1d',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 900,
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <datalist id="equivalencias-materiales-catalogo">
            {opcionesCatalogo.map((material) => (
              <option key={material} value={material} />
            ))}
          </datalist>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
        <button
          type="button"
          onClick={onCerrar}
          disabled={guardando}
          style={{
            padding: '11px 18px',
            borderRadius: '8px',
            border: '1px solid #777',
            background: '#555',
            color: 'white',
            cursor: guardando ? 'not-allowed' : 'pointer',
            fontWeight: 700,
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={cargando || guardando}
          style={{
            padding: '11px 20px',
            borderRadius: '8px',
            border: '1px solid #1976d2',
            background: '#1565c0',
            color: 'white',
            cursor: cargando || guardando ? 'not-allowed' : 'pointer',
            fontWeight: 800,
          }}
        >
          {guardando ? 'Guardando...' : 'Guardar equivalencias'}
        </button>
      </div>
    </div>
  )
}

const thStyle = {
  padding: '10px',
  border: '1px solid #555',
  textAlign: 'left',
}

const tdStyle = {
  padding: '8px',
  border: '1px solid #444',
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 10px',
  borderRadius: '6px',
  border: '1px solid #777',
  background: '#f5f5f5',
  color: '#111',
  font: 'inherit',
}

export default EquivalenciasMaterialesModal
