import { useMemo, useState } from 'react'

const filaMovimientoVacia = {
  codigo: '',
  descripcion: '',
  unidad: '',
  cantidad: '',
}

function BodegaModal({
  puedeAdministrar,
  archivo,
  inventarios = [],
  inventarioSeleccionadoId,
  cargandoInventarios,
  leyendo,
  onCambiarArchivo,
  onLeerArchivo,
  onCerrar,
  onClickFondo,
}) {
  const [busqueda, setBusqueda] = useState('')
  const [mostrarCargaExcel, setMostrarCargaExcel] = useState(false)
  const [mostrarIngresoProveedor, setMostrarIngresoProveedor] = useState(false)
  const [mostrarSalidaMaterial, setMostrarSalidaMaterial] = useState(false)
  const [facturaIngreso, setFacturaIngreso] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    factura: '',
    proveedor: '',
    observacion: '',
  })
  const [salidaMaterial, setSalidaMaterial] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    tipoDocumento: 'vale',
    documento: '',
    solicitante: '',
    destino: '',
    observacion: '',
  })
  const [materialesIngreso, setMaterialesIngreso] = useState([{ ...filaMovimientoVacia }])
  const [materialesSalida, setMaterialesSalida] = useState([{ ...filaMovimientoVacia }])
  const inventarioSeleccionado = inventarios.find((item) => item.id === inventarioSeleccionadoId) || inventarios[0]
  const materialesInventario = inventarioSeleccionado?.items || []

  const itemsFiltrados = useMemo(() => {
    const texto = normalizarBusqueda(busqueda)
    if (!texto) return materialesInventario
    return materialesInventario.filter((item) => (
      normalizarBusqueda(item.codigo).includes(texto) ||
      normalizarBusqueda(item.descripcion).includes(texto) ||
      normalizarBusqueda(item.unidad).includes(texto)
    ))
  }, [busqueda, materialesInventario])

  function cambiarFacturaIngreso(campo, valor) {
    setFacturaIngreso((actual) => ({ ...actual, [campo]: valor }))
  }

  function cambiarSalidaMaterial(campo, valor) {
    setSalidaMaterial((actual) => ({ ...actual, [campo]: valor }))
  }

  function completarDatosMaterial(fila, campo, valor) {
    const actualizada = { ...fila, [campo]: valor }
    if (campo === 'descripcion') {
      const material = materialesInventario.find(
        (item) => normalizarBusqueda(item.descripcion) === normalizarBusqueda(valor)
      )
      if (material) {
        actualizada.codigo = material.codigo || actualizada.codigo
        actualizada.unidad = material.unidad || actualizada.unidad
      }
    }
    return actualizada
  }

  function cambiarMaterialIngreso(indice, campo, valor) {
    setMaterialesIngreso((actuales) => actuales.map((fila, i) => (
      i === indice ? completarDatosMaterial(fila, campo, valor) : fila
    )))
  }

  function cambiarMaterialSalida(indice, campo, valor) {
    setMaterialesSalida((actuales) => actuales.map((fila, i) => (
      i === indice ? completarDatosMaterial(fila, campo, valor) : fila
    )))
  }

  function agregarMaterialIngreso() {
    setMaterialesIngreso((actuales) => [...actuales, { ...filaMovimientoVacia }])
  }

  function agregarMaterialSalida() {
    setMaterialesSalida((actuales) => [...actuales, { ...filaMovimientoVacia }])
  }

  function quitarMaterialIngreso(indice) {
    setMaterialesIngreso((actuales) => (
      actuales.length <= 1 ? [{ ...filaMovimientoVacia }] : actuales.filter((_, i) => i !== indice)
    ))
  }

  function quitarMaterialSalida(indice) {
    setMaterialesSalida((actuales) => (
      actuales.length <= 1 ? [{ ...filaMovimientoVacia }] : actuales.filter((_, i) => i !== indice)
    ))
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onClickFondo?.()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        boxSizing: 'border-box',
        padding: '24px',
        background: '#111318',
        border: 'none',
        borderRadius: 0,
        zIndex: 1450,
        color: 'white',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Bodega</h2>
          <p style={{ color: '#ccc', margin: '6px 0 0' }}>
            Inventario informado por bodega, separado del catálogo de precios de mantención.
          </p>
        </div>
        <button type="button" onClick={onCerrar} style={botonGris}>
          Volver a módulos
        </button>
      </div>

      {puedeAdministrar ? (
        <>
          <button
            type="button"
            onClick={() => setMostrarCargaExcel((actual) => !actual)}
            style={{ ...botonAzul, marginBottom: '12px' }}
          >
            Cargar inventario Excel
          </button>

          {mostrarCargaExcel && (
            <div style={panelMovimientoStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '10px', alignItems: 'end' }}>
                <label style={{ display: 'grid', gap: '5px' }}>
                  <strong>Archivo de bodega</strong>
                  <input
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => onCambiarArchivo(e.target.files?.[0] || null)}
                    style={{ padding: '8px', border: '1px solid #555', borderRadius: '6px' }}
                  />
                  {archivo && <small style={{ color: '#bbb' }}>{archivo.name}</small>}
                </label>
                <button
                  type="button"
                  onClick={onLeerArchivo}
                  disabled={!archivo || leyendo}
                  style={{
                    ...botonAzul,
                    cursor: !archivo || leyendo ? 'not-allowed' : 'pointer',
                    opacity: !archivo || leyendo ? 0.7 : 1,
                  }}
                >
                  {leyendo ? 'Leyendo...' : 'Leer inventario'}
                </button>
              </div>
              <p style={{ color: '#aaa', margin: '8px 0 0', fontSize: '13px' }}>
                La app detectará las hojas con fecha en el nombre, leerá el inventario y lo guardará en Supabase.
              </p>
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: '10px 12px', border: '1px solid #455a64', borderRadius: '8px', background: '#263238', marginBottom: '14px', color: '#cfd8dc' }}>
          Vista solo lectura. Solo admin puede cargar o editar inventarios.
        </div>
      )}

      {cargandoInventarios ? (
        <p style={{ color: '#ccc' }}>Cargando inventarios guardados...</p>
      ) : inventarios.length === 0 ? (
        <p style={{ color: '#ccc' }}>
          Aún no hay inventarios guardados. Un admin debe adjuntar el Excel de bodega para cargarlo.
        </p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr)', gap: '10px', alignItems: 'end', marginBottom: '12px' }}>
            <label style={{ display: 'grid', gap: '5px' }}>
              <strong>Buscar material</strong>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por código, descripción o unidad"
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div style={{ minWidth: '180px', maxWidth: '240px', flex: '1 1 180px' }}>
              <Tarjeta titulo="Materiales" valor={inventarioSeleccionado?.totalItems || 0} />
            </div>

            {puedeAdministrar && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarIngresoProveedor((actual) => !actual)
                    setMostrarSalidaMaterial(false)
                  }}
                  style={botonVerde}
                >
                  Ingreso
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarSalidaMaterial((actual) => !actual)
                    setMostrarIngresoProveedor(false)
                  }}
                  style={botonRojo}
                >
                  Salida
                </button>
              </div>
            )}
          </div>

          {mostrarIngresoProveedor && puedeAdministrar && (
            <PanelIngresoProveedor
              facturaIngreso={facturaIngreso}
              materialesIngreso={materialesIngreso}
              materialesInventario={materialesInventario}
              onCambiarFactura={cambiarFacturaIngreso}
              onCambiarMaterial={cambiarMaterialIngreso}
              onAgregarMaterial={agregarMaterialIngreso}
              onQuitarMaterial={quitarMaterialIngreso}
              onCerrar={() => setMostrarIngresoProveedor(false)}
            />
          )}

          {mostrarSalidaMaterial && puedeAdministrar && (
            <PanelSalidaMaterial
              salidaMaterial={salidaMaterial}
              materialesSalida={materialesSalida}
              materialesInventario={materialesInventario}
              onCambiarSalida={cambiarSalidaMaterial}
              onCambiarMaterial={cambiarMaterialSalida}
              onAgregarMaterial={agregarMaterialSalida}
              onQuitarMaterial={quitarMaterialSalida}
              onCerrar={() => setMostrarSalidaMaterial(false)}
            />
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
              <thead>
                <tr style={{ background: '#333' }}>
                  <th style={thStyle}>Código bodega</th>
                  <th style={thStyle}>Descripción</th>
                  <th style={thStyle}>Unidad</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Entradas</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Salidas</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Saldo inicial</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Saldo final</th>
                </tr>
              </thead>
              <tbody>
                {itemsFiltrados.slice(0, 400).map((item) => (
                  <tr key={`${item.codigo}-${item.filaExcel}`}>
                    <td style={tdStyle}>{item.codigo}</td>
                    <td style={tdStyle}>{item.descripcion}</td>
                    <td style={tdStyle}>{item.unidad}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatearNumero(item.entradas)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatearNumero(item.salidas)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatearNumero(item.saldoInicial)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900 }}>{formatearNumero(item.saldoFinal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {itemsFiltrados.length > 400 && (
            <p style={{ color: '#bbb' }}>
              Mostrando los primeros 400 resultados de {itemsFiltrados.length}. Usa el buscador para acotar.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function PanelIngresoProveedor({
  facturaIngreso,
  materialesIngreso,
  materialesInventario,
  onCambiarFactura,
  onCambiarMaterial,
  onAgregarMaterial,
  onQuitarMaterial,
  onCerrar,
}) {
  return (
    <div style={panelMovimientoStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Ingreso por factura de proveedor</h3>
        <button type="button" onClick={onCerrar} style={botonMiniGris}>
          Cerrar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(150px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        <CampoTexto label="Fecha" type="date" value={facturaIngreso.fecha} onChange={(valor) => onCambiarFactura('fecha', valor)} />
        <CampoTexto label="Factura" value={facturaIngreso.factura} onChange={(valor) => onCambiarFactura('factura', valor)} placeholder="N° factura" />
        <CampoTexto label="Proveedor" value={facturaIngreso.proveedor} onChange={(valor) => onCambiarFactura('proveedor', valor)} placeholder="Nombre proveedor" />
      </div>

      <TablaMovimientoMateriales
        datalistId="materiales-bodega-ingreso"
        materialesInventario={materialesInventario}
        filas={materialesIngreso}
        onCambiarMaterial={onCambiarMaterial}
        onQuitarMaterial={onQuitarMaterial}
      />

      <CampoObservacion
        value={facturaIngreso.observacion}
        onChange={(valor) => onCambiarFactura('observacion', valor)}
      />

      <div style={accionesPanelStyle}>
        <button type="button" onClick={onAgregarMaterial} style={botonGris}>
          + Agregar material
        </button>
        <button type="button" style={botonVerde}>
          Guardar ingreso
        </button>
      </div>
    </div>
  )
}

function PanelSalidaMaterial({
  salidaMaterial,
  materialesSalida,
  materialesInventario,
  onCambiarSalida,
  onCambiarMaterial,
  onAgregarMaterial,
  onQuitarMaterial,
  onCerrar,
}) {
  return (
    <div style={panelMovimientoStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Salida por vale o guía de despacho</h3>
        <button type="button" onClick={onCerrar} style={botonMiniGris}>
          Cerrar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(150px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        <CampoTexto label="Fecha" type="date" value={salidaMaterial.fecha} onChange={(valor) => onCambiarSalida('fecha', valor)} />
        <label style={labelStyle}>
          Documento
          <select
            value={salidaMaterial.tipoDocumento}
            onChange={(e) => onCambiarSalida('tipoDocumento', e.target.value)}
            style={inputStyle}
          >
            <option value="vale">Vale</option>
            <option value="guia">Guía de despacho</option>
          </select>
        </label>
        <CampoTexto label="N° documento" value={salidaMaterial.documento} onChange={(valor) => onCambiarSalida('documento', valor)} placeholder="N° vale o guía" />
        <CampoTexto label="Solicitante" value={salidaMaterial.solicitante} onChange={(valor) => onCambiarSalida('solicitante', valor)} placeholder="Quién retira o solicita" />
        <CampoTexto label="Destino" value={salidaMaterial.destino} onChange={(valor) => onCambiarSalida('destino', valor)} placeholder="Obra, línea, módulo o área" />
      </div>

      <TablaMovimientoMateriales
        datalistId="materiales-bodega-salida"
        materialesInventario={materialesInventario}
        filas={materialesSalida}
        onCambiarMaterial={onCambiarMaterial}
        onQuitarMaterial={onQuitarMaterial}
      />

      <CampoObservacion
        value={salidaMaterial.observacion}
        onChange={(valor) => onCambiarSalida('observacion', valor)}
      />

      <div style={accionesPanelStyle}>
        <button type="button" onClick={onAgregarMaterial} style={botonGris}>
          + Agregar material
        </button>
        <button type="button" style={botonRojo}>
          Guardar salida
        </button>
      </div>
    </div>
  )
}

function CampoTexto({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  )
}

function CampoObservacion({ value, onChange }) {
  return (
    <label style={{ ...labelStyle, marginTop: '10px' }}>
      Observación
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Opcional"
        style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
      />
    </label>
  )
}

function TablaMovimientoMateriales({
  datalistId,
  materialesInventario,
  filas,
  onCambiarMaterial,
  onQuitarMaterial,
}) {
  return (
    <>
      <datalist id={datalistId}>
        {materialesInventario.map((item) => (
          <option key={`${datalistId}-${item.codigo}-${item.descripcion}`} value={item.descripcion} />
        ))}
      </datalist>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#333' }}>
              <th style={thStyle}>Código</th>
              <th style={thStyle}>Material</th>
              <th style={thStyle}>Unidad</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Cantidad</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Quitar</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, indice) => (
              <tr key={`${datalistId}-${indice}`}>
                <td style={tdStyle}>
                  <input
                    type="text"
                    value={fila.codigo}
                    onChange={(e) => onCambiarMaterial(indice, 'codigo', e.target.value)}
                    style={inputTablaStyle}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="text"
                    list={datalistId}
                    value={fila.descripcion}
                    onChange={(e) => onCambiarMaterial(indice, 'descripcion', e.target.value)}
                    style={inputTablaStyle}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="text"
                    value={fila.unidad}
                    onChange={(e) => onCambiarMaterial(indice, 'unidad', e.target.value)}
                    style={inputTablaStyle}
                  />
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={fila.cantidad}
                    onChange={(e) => onCambiarMaterial(indice, 'cantidad', e.target.value)}
                    style={{ ...inputTablaStyle, textAlign: 'right' }}
                  />
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <button type="button" onClick={() => onQuitarMaterial(indice)} style={botonIconoRojo}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Tarjeta({ titulo, valor }) {
  return (
    <div style={{ padding: '12px', border: '1px solid #455a64', borderRadius: '10px', background: '#263238' }}>
      <div style={{ color: '#ccc', fontWeight: 700 }}>{titulo}</div>
      <div style={{ color: '#66bb6a', fontSize: '20px', fontWeight: 900 }}>{valor}</div>
    </div>
  )
}

function formatearNumero(valor) {
  return Number(valor || 0).toLocaleString('es-CL')
}

function normalizarBusqueda(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const labelStyle = {
  display: 'grid',
  gap: '5px',
  color: '#ddd',
  fontWeight: 700,
}

const inputStyle = {
  padding: '9px',
  borderRadius: '6px',
  border: '1px solid #555',
  boxSizing: 'border-box',
}

const inputTablaStyle = {
  ...inputStyle,
  width: '100%',
  background: '#f4f4f4',
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

const botonMiniGris = {
  ...botonGris,
  padding: '7px 10px',
}

const botonAzul = {
  padding: '9px 14px',
  borderRadius: '8px',
  border: '1px solid #777',
  background: '#1565c0',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 700,
}

const botonVerde = {
  padding: '10px 18px',
  borderRadius: '8px',
  border: '1px solid #66bb6a',
  background: '#1b5e20',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 900,
}

const botonRojo = {
  padding: '10px 18px',
  borderRadius: '8px',
  border: '1px solid #ef5350',
  background: '#7f1d1d',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 900,
}

const botonIconoRojo = {
  width: '30px',
  height: '30px',
  borderRadius: '50%',
  border: '1px solid #ef5350',
  background: '#7f1d1d',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 900,
  fontSize: '18px',
  lineHeight: '1',
}

const panelMovimientoStyle = {
  padding: '14px',
  border: '1px solid #455a64',
  borderRadius: '10px',
  background: '#1f2529',
  marginBottom: '14px',
}

const accionesPanelStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
  marginTop: '12px',
  flexWrap: 'wrap',
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

export default BodegaModal
