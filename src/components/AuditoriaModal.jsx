import { useMemo, useState } from 'react'
import { exportarAuditoriaExcel } from '../services/exportarExcel'

const tablasAuditadas = [
  'perfiles',
  'vales_bodega',
  'vales_bodega_items',
  'bodega_inventarios',
  'bodega_inventario_items',
  'bodega_recepciones',
  'bodega_recepcion_items',
  'bodega_despachos',
  'bodega_despacho_items',
]

function fechaLocal(diasAtras = 0) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - diasAtras)
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const filtrosIniciales = {
  fechaDesde: fechaLocal(30),
  fechaHasta: fechaLocal(),
  tabla: '',
  accion: '',
}

export default function AuditoriaModal({
  eventos = [],
  cargando = false,
  error = '',
  limite = 1000,
  onConsultar,
  onCerrar,
}) {
  const [filtros, setFiltros] = useState(filtrosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null)

  const eventosVisibles = useMemo(() => {
    const termino = normalizar(busqueda)
    if (!termino) return eventos
    return eventos.filter((evento) => normalizar([
      evento.usuario_nombre,
      evento.usuario_rol,
      evento.tabla,
      evento.accion,
      evento.registro_id,
      Object.keys(evento.cambios || {}).join(' '),
    ].join(' ')).includes(termino))
  }, [eventos, busqueda])

  function cambiarFiltro(campo, valor) {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }))
  }

  return (
    <div onClick={onCerrar} style={overlayStyle}>
      <div onClick={(event) => event.stopPropagation()} style={modalStyle}>
        <div style={cabeceraStyle}>
          <div>
            <h2 style={{ margin: 0 }}>Auditoría de cambios</h2>
            <p style={{ margin: '6px 0 0', color: '#bbb' }}>
              Registro de solo lectura. Indica quién modificó información, cuándo y qué campos cambiaron.
            </p>
          </div>
          <button type="button" onClick={onCerrar} style={botonGris}>Cerrar</button>
        </div>

        <div style={filtrosStyle}>
          <label style={labelStyle}>Desde
            <input type="date" value={filtros.fechaDesde} onChange={(e) => cambiarFiltro('fechaDesde', e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>Hasta
            <input type="date" value={filtros.fechaHasta} onChange={(e) => cambiarFiltro('fechaHasta', e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>Tabla
            <select value={filtros.tabla} onChange={(e) => cambiarFiltro('tabla', e.target.value)} style={inputStyle}>
              <option value="">Todas</option>
              {tablasAuditadas.map((tabla) => <option key={tabla} value={tabla}>{tabla}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Acción
            <select value={filtros.accion} onChange={(e) => cambiarFiltro('accion', e.target.value)} style={inputStyle}>
              <option value="">Todas</option>
              <option value="INSERT">Creación</option>
              <option value="UPDATE">Modificación</option>
              <option value="DELETE">Eliminación</option>
            </select>
          </label>
          <button type="button" onClick={() => onConsultar?.(filtros)} disabled={cargando} style={botonAzul}>
            {cargando ? 'Consultando...' : 'Consultar'}
          </button>
          <button
            type="button"
            onClick={() => exportarAuditoriaExcel(eventosVisibles, filtros)}
            disabled={cargando || eventosVisibles.length === 0}
            style={{ ...botonVerde, opacity: cargando || eventosVisibles.length === 0 ? 0.55 : 1 }}
          >
            Descargar Excel
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', margin: '12px 0', flexWrap: 'wrap' }}>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar usuario, rol, tabla, registro o campo modificado"
            style={{ ...inputStyle, flex: '1 1 360px' }}
          />
          <strong>{eventosVisibles.length.toLocaleString('es-CL')} evento(s)</strong>
        </div>

        {error && <div style={errorStyle}>{error}</div>}
        {eventos.length >= limite && (
          <div style={avisoStyle}>Se muestran los {limite.toLocaleString('es-CL')} eventos más recientes del filtro. Acota las fechas para consultar otros.</div>
        )}

        {cargando && eventos.length === 0 ? (
          <p style={{ color: '#bbb' }}>Cargando auditoría...</p>
        ) : eventosVisibles.length === 0 ? (
          <p style={{ color: '#bbb' }}>No hay eventos para los filtros seleccionados.</p>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #444', borderRadius: '8px' }}>
            <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Fecha y hora</th>
                  <th style={thStyle}>Usuario</th>
                  <th style={thStyle}>Rol</th>
                  <th style={thStyle}>Acción</th>
                  <th style={thStyle}>Tabla</th>
                  <th style={thStyle}>Registro</th>
                  <th style={thStyle}>Campos modificados</th>
                  <th style={thStyle}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {eventosVisibles.map((evento) => (
                  <tr key={evento.id}>
                    <td style={tdStyle}>{formatearFechaHora(evento.ocurrido_en)}</td>
                    <td style={tdStyle}>{evento.usuario_nombre || 'Usuario no identificado'}</td>
                    <td style={tdStyle}>{evento.usuario_rol || '-'}</td>
                    <td style={tdStyle}><span style={etiquetaAccion(evento.accion)}>{nombreAccion(evento.accion)}</span></td>
                    <td style={tdStyle}>{evento.tabla || '-'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px' }}>{evento.registro_id || '-'}</td>
                    <td style={tdStyle}>{resumirCambios(evento)}</td>
                    <td style={tdStyle}>
                      <button type="button" onClick={() => setEventoSeleccionado(evento)} style={botonDetalle}>Ver detalle</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {eventoSeleccionado && (
          <DetalleEvento evento={eventoSeleccionado} onCerrar={() => setEventoSeleccionado(null)} />
        )}
      </div>
    </div>
  )
}

function DetalleEvento({ evento, onCerrar }) {
  return (
    <div onClick={onCerrar} style={detalleOverlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={detalleModalStyle}>
        <div style={cabeceraStyle}>
          <div>
            <h3 style={{ margin: 0 }}>Detalle del evento #{evento.id}</h3>
            <p style={{ margin: '5px 0 0', color: '#bbb' }}>{formatearFechaHora(evento.ocurrido_en)} · {evento.usuario_nombre || 'Usuario no identificado'}</p>
          </div>
          <button type="button" onClick={onCerrar} style={botonGris}>Cerrar</button>
        </div>
        <div style={detalleResumenStyle}>
          <span><strong>Acción:</strong> {nombreAccion(evento.accion)}</span>
          <span><strong>Tabla:</strong> {evento.tabla}</span>
          <span><strong>Registro:</strong> {evento.registro_id || '-'}</span>
          <span><strong>Rol:</strong> {evento.usuario_rol || '-'}</span>
        </div>
        <BloqueJson titulo="Cambios" valor={evento.cambios} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
          <BloqueJson titulo="Antes" valor={evento.datos_antes} />
          <BloqueJson titulo="Después" valor={evento.datos_despues} />
        </div>
      </div>
    </div>
  )
}

function BloqueJson({ titulo, valor }) {
  return (
    <section style={{ minWidth: 0 }}>
      <h4 style={{ margin: '14px 0 6px' }}>{titulo}</h4>
      <pre style={preStyle}>{valor ? JSON.stringify(valor, null, 2) : 'Sin datos'}</pre>
    </section>
  )
}

function formatearFechaHora(valor) {
  if (!valor) return '-'
  return new Date(valor).toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    dateStyle: 'short',
    timeStyle: 'medium',
  })
}

function normalizar(valor = '') {
  return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function nombreAccion(accion) {
  return ({ INSERT: 'Creación', UPDATE: 'Modificación', DELETE: 'Eliminación' })[accion] || accion || '-'
}

function resumirCambios(evento) {
  const campos = Object.keys(evento.cambios || {})
  if (campos.length) return campos.join(', ')
  if (evento.accion === 'INSERT') return 'Registro creado'
  if (evento.accion === 'DELETE') return 'Registro eliminado'
  return '-'
}

function etiquetaAccion(accion) {
  const colores = {
    INSERT: { fondo: '#1b5e20', borde: '#4caf50' },
    UPDATE: { fondo: '#0d47a1', borde: '#42a5f5' },
    DELETE: { fondo: '#7f0000', borde: '#ef5350' },
  }
  const color = colores[accion] || { fondo: '#424242', borde: '#777' }
  return { display: 'inline-block', padding: '4px 7px', borderRadius: '999px', background: color.fondo, border: `1px solid ${color.borde}`, whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 800 }
}

const overlayStyle = { position: 'fixed', inset: 0, zIndex: 3200, background: 'rgba(0,0,0,0.76)', padding: '18px', overflowY: 'auto' }
const modalStyle = { width: 'min(1500px, 100%)', margin: '0 auto', padding: '20px', boxSizing: 'border-box', border: '1px solid #777', borderRadius: '12px', background: '#202020', color: 'white', textAlign: 'left' }
const cabeceraStyle = { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }
const filtrosStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', alignItems: 'end', marginTop: '16px' }
const labelStyle = { display: 'grid', gap: '5px', color: '#ddd', fontWeight: 700, fontSize: '13px' }
const inputStyle = { width: '100%', minHeight: '40px', padding: '9px', boxSizing: 'border-box', border: '1px solid #666', borderRadius: '7px', background: '#353535', color: 'white' }
const botonBase = { minHeight: '40px', padding: '9px 14px', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 700 }
const botonGris = { ...botonBase, border: '1px solid #777', background: '#555' }
const botonAzul = { ...botonBase, border: '1px solid #42a5f5', background: '#1565c0' }
const botonVerde = { ...botonBase, border: '1px solid #4caf50', background: '#16722a' }
const botonDetalle = { ...botonBase, minHeight: 'unset', padding: '6px 9px', border: '1px solid #42a5f5', background: '#1565c0', whiteSpace: 'nowrap' }
const thStyle = { padding: '9px', border: '1px solid #555', background: '#363636', textAlign: 'left' }
const tdStyle = { padding: '8px 9px', border: '1px solid #494949', verticalAlign: 'top' }
const errorStyle = { margin: '10px 0', padding: '10px', border: '1px solid #ef5350', borderRadius: '8px', background: '#3a1717', color: '#ff8a80', fontWeight: 700 }
const avisoStyle = { margin: '10px 0', padding: '10px', border: '1px solid #ffb300', borderRadius: '8px', background: '#3b2e0b', color: '#ffe082' }
const detalleOverlayStyle = { position: 'fixed', inset: 0, zIndex: 3300, background: 'rgba(0,0,0,0.78)', padding: '18px', overflowY: 'auto' }
const detalleModalStyle = { width: 'min(1100px, 100%)', margin: '20px auto', padding: '18px', boxSizing: 'border-box', border: '1px solid #888', borderRadius: '12px', background: '#252525', color: 'white' }
const detalleResumenStyle = { display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginTop: '14px', padding: '10px', border: '1px solid #444', borderRadius: '8px', background: '#303030' }
const preStyle = { margin: 0, padding: '12px', maxHeight: '320px', overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', border: '1px solid #444', borderRadius: '8px', background: '#111', color: '#d7e7ff', fontSize: '12px' }
