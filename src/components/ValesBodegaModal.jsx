import { useState } from 'react'

function ValesBodegaModal({
  fecha,
  archivo,
  filas,
  valesDia = [],
  serieVale = '',
  solicitanteVale,
  solicitantes = [],
  observacionVale = '',
  modoManual = false,
  cargando,
  cargandoValesDia,
  guardando,
  opcionesMaterialBalance = [],
  onCambiarFecha,
  onCambiarSerie,
  onCambiarArchivo,
  onCambiarSolicitante,
  onCambiarObservacion,
  onPrepararValeManual,
  onLeerVale,
  onAgregarFila,
  onActualizarFila,
  onEliminarFila,
  onGuardar,
  onCerrar,
  onClickFondo,
}) {
  const [mostrarValesCargados, setMostrarValesCargados] = useState(false)

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onClickFondo?.()
      }}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'calc(100vw - 24px)',
        maxWidth: '860px',
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        padding: '20px',
        background: '#222',
        border: '1px solid white',
        borderRadius: '10px',
        zIndex: 1400,
        color: 'white',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Vales bodega</h2>
          <p style={{ color: '#ccc', margin: '6px 0 0' }}>
            Adjunta el vale, revisa los materiales detectados y guarda el retiro.
          </p>
        </div>
        <button type="button" onClick={onCerrar} style={botonGris}>
          Cerrar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '150px 150px minmax(180px, 1fr) auto', gap: '10px', alignItems: 'end', marginBottom: '10px' }}>
        <label style={{ display: 'grid', gap: '5px' }}>
          <strong>Fecha vale</strong>
          <input
            type="date"
            value={fecha}
            onChange={(e) => onCambiarFecha(e.target.value)}
            style={{ padding: '9px', boxSizing: 'border-box' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '5px' }}>
          <strong>Serie</strong>
          <input
            type="text"
            value={serieVale}
            onChange={(e) => onCambiarSerie(e.target.value)}
            placeholder="Ej: 2020..."
            style={{ padding: '9px', boxSizing: 'border-box' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '5px' }}>
          <strong>Solicitante</strong>
          <select
            value={solicitanteVale}
            onChange={(e) => onCambiarSolicitante(e.target.value)}
            style={{ padding: '9px', boxSizing: 'border-box' }}
          >
            <option value="">Seleccionar solicitante...</option>
            <option value="__sin_asignar__">No asignado</option>
            {solicitantes.map((solicitante) => (
              <option key={solicitante.id || solicitante.nombre} value={solicitante.id || solicitante.nombre}>
                {solicitante.nombre}{solicitante.rol ? ` (${solicitante.rol})` : ''}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={onPrepararValeManual} style={botonGris}>
          + Vale manual
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '10px', alignItems: 'end', marginBottom: '10px' }}>
        <label style={{ display: 'grid', gap: '5px' }}>
          <strong>Adjuntar vale</strong>
          <input
            type="file"
            accept="application/pdf,.pdf,.txt,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,application/msword"
            onChange={(e) => onCambiarArchivo(e.target.files?.[0] || null)}
            style={{ padding: '8px', border: '1px solid #555', borderRadius: '6px' }}
          />
          {archivo && (
            <small style={{ color: '#bbb' }}>{archivo.name}</small>
          )}
        </label>

        <button
          type="button"
          onClick={onLeerVale}
          disabled={!archivo || cargando}
          style={{
            ...botonAzul,
            cursor: !archivo || cargando ? 'not-allowed' : 'pointer',
            opacity: !archivo || cargando ? 0.7 : 1,
          }}
        >
          {cargando ? 'Leyendo...' : 'Leer vale'}
        </button>
      </div>

      <label style={{ display: 'grid', gap: '5px', marginBottom: '14px' }}>
        <strong>Observación</strong>
        <input
          type="text"
          value={observacionVale}
          onChange={(e) => onCambiarObservacion(e.target.value)}
          placeholder="Opcional"
          style={inputStyle}
        />
      </label>

      <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #444', borderRadius: '8px', background: '#252525' }}>
        <button
          type="button"
          onClick={() => setMostrarValesCargados((actual) => !actual)}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #555',
            background: '#333',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 900,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'left',
          }}
        >
          <span>Vales cargados para esta fecha ({cargandoValesDia ? '...' : valesDia.length})</span>
          <span>{mostrarValesCargados ? '▲' : '▼'}</span>
        </button>

        {mostrarValesCargados && (
          <div style={{ marginTop: '10px' }}>
            {cargandoValesDia ? (
              <p style={{ color: '#ccc', margin: 0 }}>Cargando vales...</p>
            ) : valesDia.length === 0 ? (
              <p style={{ color: '#ccc', margin: 0 }}>No hay vales cargados para este día.</p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {valesDia.map((vale) => {
                  const totalItems = (vale.items || []).reduce((total, item) => total + Number(item.cantidad || 0), 0)
                  const serieMostrada = vale.serie || extraerSerieDesdeObservacion(vale.observacion)
                  const etiquetaVale = obtenerEtiquetaValeBodega(vale)
                  return (
                    <details key={vale.id} style={{ border: '1px solid #555', borderRadius: '8px', overflow: 'hidden' }}>
                      <summary style={{ padding: '9px 10px', background: '#333', cursor: 'pointer', fontWeight: 800 }}>
                        {etiquetaVale}  | Serie {serieMostrada || '-'}  | {vale.solicitante_nombre || 'Sin solicitante'}  | {vale.items?.length || 0} materiales  | total {totalItems}
                      </summary>
                      {vale.observacion && (
                        <div style={{ padding: '8px 10px', color: '#ffcc80', borderBottom: '1px solid #444' }}>
                          {vale.observacion}
                        </div>
                      )}
                      <div style={{ padding: '8px 10px', display: 'grid', gap: '5px' }}>
                        {(vale.items || []).map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(0, 1fr) 80px',
                              gap: '8px',
                              borderBottom: '1px solid #444',
                              paddingBottom: '5px',
                            }}
                          >
                            <span>{item.material_balance || item.material_vale}</span>
                            <strong style={{ textAlign: 'right' }}>{item.cantidad}</strong>
                          </div>
                        ))}
                      </div>
                    </details>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>{modoManual ? 'Materiales del vale manual' : 'Materiales detectados'}</h3>
        <button type="button" onClick={onAgregarFila} style={botonGris}>
          + Agregar fila
        </button>
      </div>

      {filas.length === 0 ? (
        <p style={{ color: '#ccc' }}>
          Aún no hay materiales. Puedes leer el vale o agregar filas manualmente.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
            <thead>
              <tr style={{ background: '#333' }}>
                <th style={thStyle}>Material vale</th>
                <th style={thStyle}>Material balance</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Retirado</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Quitar</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, index) => (
                <tr key={fila.id || index}>
                  <td style={tdStyle}>
                    <input
                      value={fila.materialVale}
                      onChange={(e) => onActualizarFila(index, { materialVale: e.target.value })}
                      style={inputStyle}
                    />
                  </td>
                  <td style={tdStyle}>
                    <SelectorMaterialBalance
                      valor={fila.materialBalance}
                      opciones={opcionesMaterialBalance}
                      onCambiar={(valor) => onActualizarFila(index, {
                        materialBalance: valor,
                        materialVale: fila.materialVale || valor,
                      })}
                    />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={fila.cantidad}
                      onChange={(e) => onActualizarFila(index, { cantidad: e.target.value })}
                      style={{ ...inputStyle, textAlign: 'right', width: '110px' }}
                    />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button type="button" onClick={() => onEliminarFila(index)} style={botonPeligro}>
                      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 12H8L7 9Zm3 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button
          type="button"
          onClick={onGuardar}
          disabled={guardando || filas.length === 0}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #66bb6a',
            background: '#1b5e20',
            color: 'white',
            cursor: guardando || filas.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 800,
            opacity: guardando || filas.length === 0 ? 0.7 : 1,
          }}
        >
          {guardando ? 'Guardando...' : 'Guardar vale'}
        </button>
        <button type="button" onClick={onCerrar} style={{ ...botonGris, flex: 1 }}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

function SelectorMaterialBalance({
  valor,
  opciones,
  onCambiar,
}) {
  const valorActual = String(valor || '')
  const existeEnOpciones = opciones.includes(valorActual)
  const estaEnOtro = valorActual && !existeEnOpciones
  const valorSelector = existeEnOpciones ? valorActual : '__otro__'

  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <select
        value={valorSelector}
        onChange={(e) => {
          if (e.target.value === '__otro__') {
            onCambiar(estaEnOtro ? valorActual : '')
            return
          }
          onCambiar(e.target.value)
        }}
        style={inputStyle}
      >
        <option value="">Seleccionar material...</option>
        {opciones.map((opcion) => (
          <option key={opcion} value={opcion}>
            {opcion}
          </option>
        ))}
        <option value="__otro__">Otro / no está en catálogo</option>
      </select>

      {valorSelector === '__otro__' && (
        <input
          value={valorActual}
          onChange={(e) => onCambiar(e.target.value)}
          placeholder="Escribir otro material"
          style={inputStyle}
        />
      )}
    </div>
  )
}

const thStyle = {
  padding: '8px 10px',
  border: '1px solid #555',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '7px 8px',
  border: '1px solid #444',
}

const inputStyle = {
  width: '100%',
  padding: '7px',
  boxSizing: 'border-box',
  borderRadius: '6px',
  border: '1px solid #777',
  background: '#fff',
  color: '#111',
}

const botonGris = {
  padding: '9px 14px',
  borderRadius: '8px',
  border: '1px solid #777',
  background: '#555',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 700,
}

const botonAzul = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #64b5f6',
  background: '#1565c0',
  color: 'white',
  fontWeight: 800,
}

const botonPeligro = {
  width: '30px',
  height: '30px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  border: '1px solid #ff8a80',
  background: '#3a1515',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 900,
  padding: 0,
}

function extraerSerieDesdeObservacion(observacion = '') {
  const texto = String(observacion || '')
  const match = texto.match(/(?:serie|ser\.?|modulo|m[oó]dulo)?\s*[:#-]?\s*(\d{5,})/i)
  return match?.[1] || ''
}

function obtenerEtiquetaValeBodega(vale = {}) {
  if (vale.tipo_ingreso === 'devolucion_app') return 'Devolución app'
  if (vale.tipo_ingreso === 'pedido_app') return 'Pedido app'
  if (vale.tipo_ingreso === 'manual') return 'Vale manual'
  return vale.archivo_nombre || 'Vale sin archivo'
}

export default ValesBodegaModal
