import { useMemo, useState } from 'react'

const bodegasDisponibles = [
  { valor: '', etiqueta: 'Sin asignar' },
  { valor: 'bayona', etiqueta: 'Bodega Bayona' },
  { valor: 'rental', etiqueta: 'Bodega Rental' },
  { valor: 'montaña', etiqueta: 'Bodega Montaña' },
]

const plantasDisponibles = [
  { valor: '', etiqueta: 'Sin asignar' },
  { valor: 'planta bayona', etiqueta: 'Planta Bayona' },
  { valor: 'planta rental', etiqueta: 'Planta Rental' },
  { valor: 'planta montaña', etiqueta: 'Planta Montaña' },
]

const rolesDisponibles = [
  ['admin', 'Administrador'],
  ['operador', 'Operador'],
  ['colaborador', 'Colaborador'],
  ['control_calidad', 'Control de calidad'],
  ['electrico', 'Eléctrico'],
  ['analista', 'Analista'],
  ['bodega', 'Bodega'],
  ['supervisor', 'Supervisor'],
  ['visor', 'Visor'],
]

const usuarioInicial = {
  nombre: '', email: '', password: '', rol: 'visor', bodega_asignada: '', planta_asignada: '',
}

function UsuariosBodegaModal({
  usuarios = [],
  usuarioActualId,
  cargando,
  guardando,
  guardandoId,
  onGuardarCambios,
  onCrearUsuario,
  onCambiarEstado,
  onCambiarPassword,
  onEliminarUsuario,
  onCerrar,
}) {
  const [ediciones, setEdiciones] = useState({})
  const [busqueda, setBusqueda] = useState('')
  const [mostrarCreacion, setMostrarCreacion] = useState(false)
  const [nuevoUsuario, setNuevoUsuario] = useState(usuarioInicial)
  const [usuarioPassword, setUsuarioPassword] = useState(null)
  const [nuevoPassword, setNuevoPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [errorPassword, setErrorPassword] = useState('')

  const usuariosModificados = useMemo(() => usuarios
    .filter((usuario) => {
      const edicion = obtenerEdicion(usuario, ediciones)
      return (usuario.rol || '') !== (edicion.rol || '')
        || (usuario.bodega_asignada || '') !== (edicion.bodega_asignada || '')
        || (usuario.planta_asignada || '') !== (edicion.planta_asignada || '')
    })
    .map((usuario) => ({ usuario, cambios: obtenerEdicion(usuario, ediciones) })), [usuarios, ediciones])

  const usuariosVisibles = useMemo(() => {
    const filtro = busqueda.trim().toLocaleLowerCase('es')
    if (!filtro) return usuarios
    return usuarios.filter((usuario) => [usuario.nombre, usuario.email, usuario.rol]
      .some((valor) => String(valor || '').toLocaleLowerCase('es').includes(filtro)))
  }, [usuarios, busqueda])

  const bloqueados = usuarios.filter((usuario) => usuario.bloqueado).length
  const hayCambios = usuariosModificados.length > 0

  async function crearUsuario(evento) {
    evento.preventDefault()
    const creado = await onCrearUsuario?.(nuevoUsuario)
    if (creado) {
      setNuevoUsuario(usuarioInicial)
      setMostrarCreacion(false)
    }
  }

  function abrirCambioPassword(usuario) {
    setUsuarioPassword(usuario)
    setNuevoPassword('')
    setConfirmarPassword('')
    setMostrarPassword(false)
    setErrorPassword('')
  }

  async function guardarPassword(evento) {
    evento.preventDefault()
    if (nuevoPassword.length < 8) {
      setErrorPassword('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (nuevoPassword !== confirmarPassword) {
      setErrorPassword('Las contraseñas no coinciden.')
      return
    }

    const guardado = await onCambiarPassword?.(usuarioPassword, nuevoPassword)
    if (guardado) {
      setUsuarioPassword(null)
      setNuevoPassword('')
      setConfirmarPassword('')
      setErrorPassword('')
    }
  }

  return (
    <div style={overlayStyle} onClick={(evento) => evento.stopPropagation()}>
      <section style={panelStyle}>
        <header style={headerStyle}>
          <div>
            <h2 style={{ margin: 0 }}>Administración de usuarios</h2>
            <p style={subtituloStyle}>Crea cuentas, controla accesos y administra permisos y asignaciones.</p>
          </div>
          <button type="button" onClick={onCerrar} style={botonCerrar}>Cerrar</button>
        </header>

        <div style={resumenStyle}>
          <TarjetaResumen etiqueta="Usuarios" valor={usuarios.length} color="#5bc0de" />
          <TarjetaResumen etiqueta="Activos" valor={usuarios.length - bloqueados} color="#44d26b" />
          <TarjetaResumen etiqueta="Bloqueados" valor={bloqueados} color="#ff6868" />
        </div>

        <div style={toolbarStyle}>
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por nombre, correo o rol"
            style={buscadorStyle}
          />
          <button type="button" onClick={() => setMostrarCreacion((actual) => !actual)} style={botonPrimario}>
            {mostrarCreacion ? 'Cancelar creación' : '+ Agregar usuario'}
          </button>
          <button type="button" onClick={() => onGuardarCambios?.(usuariosModificados)} disabled={guardando || !hayCambios} style={botonAccion(guardando || !hayCambios)}>
            {guardando ? 'Guardando...' : hayCambios ? `Guardar cambios (${usuariosModificados.length})` : 'Guardar cambios'}
          </button>
        </div>

        {mostrarCreacion && (
          <form onSubmit={crearUsuario} style={formularioStyle}>
            <h3 style={{ margin: '0 0 4px', gridColumn: '1 / -1' }}>Nueva cuenta</h3>
            <Campo etiqueta="Nombre"><input required value={nuevoUsuario.nombre} onChange={(e) => cambiarNuevo('nombre', e.target.value, setNuevoUsuario)} style={inputStyle} /></Campo>
            <Campo etiqueta="Correo"><input required type="email" value={nuevoUsuario.email} onChange={(e) => cambiarNuevo('email', e.target.value, setNuevoUsuario)} style={inputStyle} /></Campo>
            <Campo etiqueta="Contraseña temporal"><input required minLength={8} type="password" value={nuevoUsuario.password} onChange={(e) => cambiarNuevo('password', e.target.value, setNuevoUsuario)} style={inputStyle} /></Campo>
            <Campo etiqueta="Rol"><SelectorRol value={nuevoUsuario.rol} onChange={(valor) => cambiarNuevo('rol', valor, setNuevoUsuario)} /></Campo>
            <Campo etiqueta="Bodega"><Selector opciones={bodegasDisponibles} value={nuevoUsuario.bodega_asignada} required={nuevoUsuario.rol === 'bodega'} onChange={(valor) => cambiarNuevo('bodega_asignada', valor, setNuevoUsuario)} /></Campo>
            <Campo etiqueta="Planta"><Selector opciones={plantasDisponibles} value={nuevoUsuario.planta_asignada} onChange={(valor) => cambiarNuevo('planta_asignada', valor, setNuevoUsuario)} /></Campo>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={guardando} style={botonAccion(guardando)}>{guardando ? 'Creando cuenta...' : 'Crear usuario'}</button>
            </div>
          </form>
        )}

        {usuarioPassword && (
          <div
            style={passwordOverlayStyle}
            onClick={() => {
              if (!guardando) setUsuarioPassword(null)
            }}
          >
          <form
            onSubmit={guardarPassword}
            style={passwordPanelStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cambiar-password-titulo"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <h3 id="cambiar-password-titulo" style={{ margin: 0 }}>Cambiar contraseña</h3>
                <div style={{ color: '#a9bbc4', marginTop: '4px' }}>
                  {usuarioPassword.nombre || 'Sin nombre'} · {usuarioPassword.email || 'Sin correo'}
                </div>
              </div>
              <button type="button" onClick={() => setUsuarioPassword(null)} disabled={guardando} style={botonSecundario}>Cancelar</button>
            </div>
            <Campo etiqueta="Nueva contraseña">
              <input
                required
                minLength={8}
                type={mostrarPassword ? 'text' : 'password'}
                value={nuevoPassword}
                onChange={(evento) => {
                  setNuevoPassword(evento.target.value)
                  setErrorPassword('')
                }}
                autoComplete="new-password"
                style={inputStyle}
              />
            </Campo>
            <Campo etiqueta="Confirmar contraseña">
              <input
                required
                minLength={8}
                type={mostrarPassword ? 'text' : 'password'}
                value={confirmarPassword}
                onChange={(evento) => {
                  setConfirmarPassword(evento.target.value)
                  setErrorPassword('')
                }}
                autoComplete="new-password"
                style={inputStyle}
              />
            </Campo>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'end', minHeight: '42px', color: '#c7d5dc', cursor: 'pointer' }}>
              <input type="checkbox" checked={mostrarPassword} onChange={(evento) => setMostrarPassword(evento.target.checked)} />
              Mostrar contraseña
            </label>
            {errorPassword && <div role="alert" style={errorPasswordStyle}>{errorPassword}</div>}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={guardando} style={botonAccion(guardando)}>
                {guardando && guardandoId === usuarioPassword.id ? 'Actualizando contraseña...' : 'Guardar contraseña'}
              </button>
            </div>
          </form>
          </div>
        )}

        {cargando ? (
          <p style={{ color: '#ccc' }}>Cargando usuarios...</p>
        ) : usuarios.length === 0 ? (
          <p style={{ color: '#ccc' }}>No hay usuarios registrados.</p>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #35505f', borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1080px' }}>
              <thead><tr style={{ background: '#132c39' }}>
                <th style={thStyle}>Usuario</th><th style={thStyle}>Estado</th><th style={thStyle}>Rol</th><th style={thStyle}>Bodega</th><th style={thStyle}>Planta</th><th style={thStyle}>Último ingreso</th><th style={{ ...thStyle, textAlign: 'center' }}>Acciones</th>
              </tr></thead>
              <tbody>
                {usuariosVisibles.map((usuario) => {
                  const edicion = obtenerEdicion(usuario, ediciones)
                  const esUsuarioActual = usuario.id === usuarioActualId
                  const modificada = usuariosModificados.some((item) => item.usuario.id === usuario.id)
                  return (
                    <tr key={usuario.id} style={{ background: modificada ? '#233d2a' : usuario.bloqueado ? '#3b2428' : 'transparent' }}>
                      <td style={tdStyle}><strong>{usuario.nombre || 'Sin nombre'}</strong><div style={{ color: '#9fb3bf', fontSize: '0.82rem', marginTop: '3px' }}>{usuario.email || 'Sin correo disponible'}</div></td>
                      <td style={tdStyle}><EstadoUsuario bloqueado={usuario.bloqueado} /></td>
                      <td style={tdStyle}><SelectorRol value={edicion.rol || 'visor'} disabled={guardando || esUsuarioActual} onChange={(valor) => editarUsuario(usuario.id, 'rol', valor, setEdiciones)} /></td>
                      <td style={tdStyle}><Selector opciones={bodegasDisponibles} value={edicion.bodega_asignada || ''} disabled={guardando} onChange={(valor) => editarUsuario(usuario.id, 'bodega_asignada', valor, setEdiciones)} /></td>
                      <td style={tdStyle}><Selector opciones={plantasDisponibles} value={edicion.planta_asignada || ''} disabled={guardando} onChange={(valor) => editarUsuario(usuario.id, 'planta_asignada', valor, setEdiciones)} /></td>
                      <td style={tdStyle}>{formatearFecha(usuario.ultimo_ingreso)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <select
                          value=""
                          disabled={guardando}
                          aria-label={`Acciones para ${usuario.nombre || usuario.email || 'usuario'}`}
                          onChange={async (evento) => {
                            const accion = evento.target.value
                            evento.target.value = ''
                            if (accion === 'estado') {
                              await onCambiarEstado?.(usuario, !usuario.bloqueado)
                            }
                            if (accion === 'password') abrirCambioPassword(usuario)
                            if (accion === 'eliminar') {
                              const eliminado = await onEliminarUsuario?.(usuario)
                              if (eliminado && usuarioPassword?.id === usuario.id) setUsuarioPassword(null)
                            }
                          }}
                          style={selectorAccionesStyle(guardando)}
                        >
                          <option value="">Administrar…</option>
                          <option value="estado" disabled={esUsuarioActual}>
                            {usuario.bloqueado ? 'Reactivar acceso' : 'Bloquear acceso'}
                          </option>
                          <option value="password">Cambiar contraseña</option>
                          <option value="eliminar" disabled={esUsuarioActual}>Eliminar usuario</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {usuariosVisibles.length === 0 && <p style={{ padding: '10px 16px', color: '#bbb' }}>No se encontraron coincidencias.</p>}
          </div>
        )}
      </section>
    </div>
  )
}

function TarjetaResumen({ etiqueta, valor, color }) {
  return <div style={tarjetaStyle}><span style={{ color: '#aebec7' }}>{etiqueta}</span><strong style={{ color, fontSize: '1.55rem' }}>{valor}</strong></div>
}

function Campo({ etiqueta, children }) {
  return <label style={{ display: 'grid', gap: '6px', color: '#d6e1e7', fontWeight: 700 }}><span>{etiqueta}</span>{children}</label>
}

function Selector({ opciones, value, onChange, disabled, required = false }) {
  return <select value={value} disabled={disabled} required={required} onChange={(e) => onChange(e.target.value)} style={selectStyle(disabled)}>{opciones.map((opcion) => <option key={opcion.valor || 'sin-asignar'} value={opcion.valor}>{opcion.etiqueta}</option>)}</select>
}

function SelectorRol({ value, onChange, disabled }) {
  return <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={selectStyle(disabled)}>{rolesDisponibles.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}</select>
}

function EstadoUsuario({ bloqueado }) {
  return <span style={{ display: 'inline-block', padding: '4px 9px', borderRadius: '999px', fontWeight: 800, fontSize: '0.8rem', color: bloqueado ? '#ff9696' : '#72e38d', background: bloqueado ? '#4a2229' : '#173c26' }}>{bloqueado ? 'Bloqueado' : 'Activo'}</span>
}

function editarUsuario(usuarioId, campo, valor, setEdiciones) {
  setEdiciones((actuales) => ({ ...actuales, [usuarioId]: { ...(actuales[usuarioId] || {}), [campo]: valor } }))
}

function obtenerEdicion(usuario, ediciones) {
  return {
    rol: usuario.rol || 'visor',
    bodega_asignada: usuario.bodega_asignada || '',
    planta_asignada: usuario.planta_asignada || '',
    ...(ediciones[usuario.id] || {}),
  }
}

function cambiarNuevo(campo, valor, setNuevoUsuario) {
  setNuevoUsuario((actual) => ({ ...actual, [campo]: valor }))
}

function formatearFecha(fecha) {
  if (!fecha) return 'Nunca'
  const valor = new Date(fecha)
  return Number.isNaN(valor.getTime()) ? 'Sin registro' : valor.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

const overlayStyle = { position: 'fixed', inset: 0, zIndex: 2600, background: 'rgba(0,0,0,.68)', padding: 'clamp(8px, 2vw, 24px)', boxSizing: 'border-box', display: 'grid', placeItems: 'center' }
const panelStyle = { width: 'min(1180px, 100%)', maxHeight: '94vh', overflowY: 'auto', background: '#101b22', color: 'white', border: '1px solid #3a5a69', borderRadius: '14px', padding: 'clamp(14px, 2vw, 24px)', boxSizing: 'border-box', textAlign: 'left', boxShadow: '0 18px 60px rgba(0,0,0,.5)' }
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }
const subtituloStyle = { margin: '6px 0 0', color: '#aebec7' }
const resumenStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(90px, 1fr))', gap: '10px', marginBottom: '14px' }
const tarjetaStyle = { display: 'flex', flexDirection: 'column', gap: '2px', background: '#172a34', border: '1px solid #35505f', borderRadius: '10px', padding: '11px 14px' }
const toolbarStyle = { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }
const inputStyle = { minWidth: 0, width: '100%', padding: '10px', borderRadius: '7px', border: '1px solid #506b78', background: '#0e171c', color: 'white', boxSizing: 'border-box' }
const buscadorStyle = { ...inputStyle, flex: '1 1 260px', width: 'auto' }
const formularioStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', padding: '16px', marginBottom: '16px', background: '#172a34', border: '1px solid #3a5a69', borderRadius: '10px' }
const passwordOverlayStyle = { position: 'fixed', inset: 0, zIndex: 2750, display: 'grid', placeItems: 'center', padding: '16px', boxSizing: 'border-box', background: 'rgba(0, 0, 0, 0.72)' }
const passwordPanelStyle = { width: 'min(560px, 100%)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', padding: '20px', boxSizing: 'border-box', border: '1px solid #34758a', borderRadius: '12px', background: '#13252f', color: 'white', boxShadow: '0 22px 65px rgba(0, 0, 0, 0.58)' }
const selectStyle = (disabled) => ({ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #506b78', background: '#17262e', color: 'white', opacity: disabled ? 0.6 : 1 })
const thStyle = { padding: '10px', borderBottom: '1px solid #46606c', textAlign: 'left', whiteSpace: 'nowrap' }
const tdStyle = { padding: '10px', borderBottom: '1px solid #2c414b', verticalAlign: 'middle' }
const baseBoton = { padding: '9px 14px', borderRadius: '8px', color: 'white', fontWeight: 800, cursor: 'pointer' }
const botonCerrar = { ...baseBoton, border: '1px solid #a84a4a', background: '#8b2929' }
const botonPrimario = { ...baseBoton, border: '1px solid #168f88', background: '#087d77' }
const botonAccion = (disabled) => ({ ...baseBoton, border: '1px solid #32954b', background: '#16722a', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer' })
const botonSecundario = { ...baseBoton, padding: '7px 11px', border: '1px solid #657883', background: '#3d4b52' }
const selectorAccionesStyle = (disabled) => ({ width: '155px', padding: '8px 9px', borderRadius: '7px', border: '1px solid #43819b', background: '#123f52', color: 'white', fontWeight: 800, opacity: disabled ? 0.55 : 1, cursor: disabled ? 'wait' : 'pointer' })
const errorPasswordStyle = { gridColumn: '1 / -1', padding: '9px 11px', border: '1px solid #b54c4c', borderRadius: '7px', background: '#472126', color: '#ffb6b6' }

export default UsuariosBodegaModal
