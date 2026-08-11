import { useEffect, useMemo, useState } from 'react'

const bodegasDisponibles = [
  { valor: '', etiqueta: 'Sin asignar' },
  { valor: 'bayona', etiqueta: 'Bayona' },
  { valor: 'rental', etiqueta: 'Rental' },
  { valor: 'montaña', etiqueta: 'Montaña' },
]

const plantasDisponibles = [
  { valor: '', etiqueta: 'Sin asignar' },
  { valor: 'planta bayona', etiqueta: 'Planta Bayona' },
  { valor: 'planta rental', etiqueta: 'Planta Rental' },
  { valor: 'planta montaña', etiqueta: 'Planta Montaña' },
]

function UsuariosBodegaModal({
  usuarios = [],
  cargando,
  guardando,
  onGuardarCambios,
  onCerrar,
}) {
  const [ediciones, setEdiciones] = useState({})

  useEffect(() => {
    setEdiciones(Object.fromEntries(
      usuarios.map((usuario) => [
        usuario.id,
        {
          bodega_asignada: usuario.bodega_asignada || '',
          planta_asignada: usuario.planta_asignada || '',
        },
      ]),
    ))
  }, [usuarios])

  const usuariosModificados = useMemo(() => usuarios
    .filter((usuario) => {
      const edicion = ediciones[usuario.id] || {}
      return (
        (usuario.bodega_asignada || '') !== (edicion.bodega_asignada || '')
        || (usuario.planta_asignada || '') !== (edicion.planta_asignada || '')
      )
    })
    .map((usuario) => ({
      usuario,
      asignaciones: ediciones[usuario.id] || {},
    })), [usuarios, ediciones])

  const hayUsuarios = usuarios.length > 0
  const hayCambios = usuariosModificados.length > 0

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'calc(100vw - 32px)',
        maxWidth: '940px',
        maxHeight: '88vh',
        overflowY: 'auto',
        background: '#222',
        color: 'white',
        border: '1px solid white',
        borderRadius: '12px',
        padding: '20px',
        boxSizing: 'border-box',
        zIndex: 2600,
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Usuarios</h2>
          <p style={{ margin: '6px 0 0', color: '#ccc' }}>
            Asigna bodega y planta a los usuarios registrados.
          </p>
        </div>
        <button type="button" onClick={onCerrar} style={botonGris}>
          Cerrar
        </button>
      </div>

      {cargando ? (
        <p style={{ color: '#ccc' }}>Cargando usuarios...</p>
      ) : !hayUsuarios ? (
        <p style={{ color: '#ccc' }}>No hay usuarios registrados.</p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={() => onGuardarCambios?.(usuariosModificados)}
              disabled={guardando || !hayCambios}
              style={{
                ...botonGuardar,
                opacity: guardando || !hayCambios ? 0.55 : 1,
                cursor: guardando || !hayCambios ? 'default' : 'pointer',
              }}
            >
              {guardando
                ? 'Guardando cambios...'
                : hayCambios
                  ? `Guardar cambios (${usuariosModificados.length})`
                  : 'Guardar cambios'}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
              <thead>
                <tr style={{ background: '#333' }}>
                  <th style={thStyle}>Usuario</th>
                  <th style={thStyle}>Rol</th>
                  <th style={thStyle}>Bodega asignada</th>
                  <th style={thStyle}>Planta asignada</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => {
                  const edicion = ediciones[usuario.id] || { bodega_asignada: '', planta_asignada: '' }
                  const filaModificada = (usuario.bodega_asignada || '') !== (edicion.bodega_asignada || '')
                    || (usuario.planta_asignada || '') !== (edicion.planta_asignada || '')

                  return (
                    <tr key={usuario.id} style={{ background: filaModificada ? '#2b3b24' : 'transparent' }}>
                      <td style={tdStyle}>
                        <strong>{usuario.nombre || 'Sin nombre'}</strong>
                      </td>
                      <td style={tdStyle}>{usuario.rol || '-'}</td>
                      <td style={tdStyle}>
                        <select
                          value={edicion.bodega_asignada || ''}
                          disabled={guardando}
                          onChange={(e) => editarUsuario(usuario.id, 'bodega_asignada', e.target.value, setEdiciones)}
                          style={selectStyle(guardando)}
                        >
                          {bodegasDisponibles.map((bodega) => (
                            <option key={bodega.valor || 'sin-bodega'} value={bodega.valor}>
                              {bodega.etiqueta}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <select
                          value={edicion.planta_asignada || ''}
                          disabled={guardando}
                          onChange={(e) => editarUsuario(usuario.id, 'planta_asignada', e.target.value, setEdiciones)}
                          style={selectStyle(guardando)}
                        >
                          {plantasDisponibles.map((planta) => (
                            <option key={planta.valor || 'sin-planta'} value={planta.valor}>
                              {planta.etiqueta}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function editarUsuario(usuarioId, campo, valor, setEdiciones) {
  setEdiciones((actuales) => ({
    ...actuales,
    [usuarioId]: {
      ...(actuales[usuarioId] || {}),
      [campo]: valor,
    },
  }))
}

function selectStyle(deshabilitado) {
  return {
    width: '100%',
    padding: '9px',
    borderRadius: '6px',
    border: '1px solid #666',
    background: '#3a3a3a',
    color: 'white',
    opacity: deshabilitado ? 0.7 : 1,
  }
}

const thStyle = {
  padding: '10px',
  border: '1px solid #444',
  textAlign: 'left',
}

const tdStyle = {
  padding: '10px',
  border: '1px solid #444',
  verticalAlign: 'middle',
}

const botonGris = {
  padding: '9px 14px',
  borderRadius: '8px',
  border: '1px solid #777',
  background: '#666',
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer',
}

const botonGuardar = {
  padding: '10px 16px',
  borderRadius: '8px',
  border: '1px solid #2e7d32',
  background: '#16722a',
  color: 'white',
  fontWeight: 700,
}

export default UsuariosBodegaModal
