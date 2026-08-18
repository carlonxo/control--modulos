import { useEffect, useMemo, useState } from 'react'

let contadorFilasEdicionPedido = 0

function crearIdFilaEdicionPedido(prefijo = 'fila') {
  contadorFilasEdicionPedido += 1
  return `${prefijo}-${Date.now()}-${contadorFilasEdicionPedido}`
}

const filaMovimientoVacia = {
  codigo: '',
  descripcion: '',
  unidad: '',
  stock: '',
  cantidad: '',
}

function BodegaModal({
  modoSoloBodega,
  puedeAdministrar,
  puedeVerPedidosHoy,
  puedeEditarPedidos,
  puedeEditarPedidosEntregados,
  puedeGestionarPedidos,
  archivo,
  inventarios = [],
  solicitantes = [],
  inventarioSeleccionadoId,
  cargandoInventarios,
  leyendo,
  guardandoPedido,
  guardandoDevolucion,
  guardandoRecepcion,
  guardandoSalida,
  entregandoSolicitudBodega,
  puedeExportarInventario,
  alertasBodega = [],
  mostrarAlertasBodega,
  pedidosBodegaHoy = [],
  mostrarPedidosBodegaHoy,
  historialValesBodega = [],
  mostrarHistorialValesBodega,
  fechaHistorialValesBodega = fechaActualInput(),
  cargandoHistorialValesBodega = false,
  recepcionesBodega = [],
  mostrarRecepcionesBodega,
  rangoRecepcionesBodega = 'mes',
  fechaRecepcionesBodega = '',
  despachosBodega = [],
  mostrarDespachosBodega,
  rangoDespachosBodega = 'mes',
  fechaDespachosBodega = '',
  onCambiarArchivo,
  onLeerArchivo,
  onGuardarPedido,
  onGuardarDevolucion,
  onGuardarRecepcion,
  onGuardarSalida,
  onEntregarSolicitudBodega,
  onEditarSolicitudBodega,
  onExportarInventario,
  onImprimirPedidos,
  onImprimirPedidosGeneral,
  onImprimirHistorialVales,
  onImprimirHistorialValesGeneral,
  onToggleAlertasBodega,
  onTogglePedidosBodegaHoy,
  onToggleHistorialValesBodega,
  onCambiarFechaHistorialValesBodega,
  onActualizarHistorialValesBodega,
  onToggleRecepcionesBodega,
  onCambiarRangoRecepcionesBodega,
  onCambiarFechaRecepcionesBodega,
  onActualizarRecepcionesBodega,
  onToggleDespachosBodega,
  onCambiarRangoDespachosBodega,
  onCambiarFechaDespachosBodega,
  onActualizarDespachosBodega,
  onActualizarAlertasBodega,
  onCerrar,
  onClickFondo,
}) {
  const [busqueda, setBusqueda] = useState('')
  const [ocultarSinStock, setOcultarSinStock] = useState(false)
  const [mostrarCargaExcel, setMostrarCargaExcel] = useState(false)
  const [mostrarIngresoProveedor, setMostrarIngresoProveedor] = useState(false)
  const [mostrarSalidaMaterial, setMostrarSalidaMaterial] = useState(false)
  const [mostrarCrearPedido, setMostrarCrearPedido] = useState(false)
  const [mostrarCrearDevolucion, setMostrarCrearDevolucion] = useState(false)
  const [mostrarRecepcionarMaterial, setMostrarRecepcionarMaterial] = useState(false)
  const [alertaBodegaSeleccionada, setAlertaBodegaSeleccionada] = useState(null)
  const [recepcionSeleccionada, setRecepcionSeleccionada] = useState(null)
  const [despachoSeleccionado, setDespachoSeleccionado] = useState(null)
  const [facturaIngreso, setFacturaIngreso] = useState({
    fecha: fechaActualInput(),
    factura: '',
    proveedor: '',
    observacion: '',
  })
  const [salidaMaterial, setSalidaMaterial] = useState({
    fecha: fechaActualInput(),
    tipoDocumento: 'vale',
    documento: '',
    solicitante: '',
    destino: '',
    observacion: '',
  })
  const [pedidoMaterial, setPedidoMaterial] = useState({
    fecha: fechaActualInput(),
    proyecto: '',
    tipoModulo: '',
    serie: '',
    bodega: 'bayona',
    retira: '',
  })
  const [devolucionMaterial, setDevolucionMaterial] = useState({
    fecha: fechaActualInput(),
    bodega: 'bayona',
    motivo: '',
  })
  const [recepcionMaterial, setRecepcionMaterial] = useState({
    fecha: fechaActualInput(),
    ordenCompra: '',
    factura: '',
    recepcion: '',
  })
  const [materialesIngreso, setMaterialesIngreso] = useState([{ ...filaMovimientoVacia }])
  const [materialesSalida, setMaterialesSalida] = useState([{ ...filaMovimientoVacia }])
  const [materialesPedido, setMaterialesPedido] = useState([{ ...filaMovimientoVacia }])
  const [materialesDevolucion, setMaterialesDevolucion] = useState([{ ...filaMovimientoVacia }])
  const [materialesRecepcion, setMaterialesRecepcion] = useState([{ ...filaMovimientoVacia }])
  const inventarioSeleccionado = inventarios.find((item) => item.id === inventarioSeleccionadoId) || inventarios[0]
  const materialesInventario = inventarioSeleccionado?.items || []
  const mostrarPedidosHoy = Boolean(puedeVerPedidosHoy)
  const electricosDisponibles = useMemo(() => (
    (solicitantes || [])
      .filter((item) => normalizarBusqueda(item.rol).includes('electrico'))
      .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'))
  ), [solicitantes])

  const itemsFiltrados = useMemo(() => {
    const texto = normalizarBusqueda(busqueda)
    return materialesInventario.filter((item) => {
      if (ocultarSinStock && Number(item.saldoFinal || 0) <= 0) return false
      if (!texto) return true
      return (
        normalizarBusqueda(item.codigo).includes(texto) ||
        normalizarBusqueda(item.descripcion).includes(texto) ||
        normalizarBusqueda(item.unidad).includes(texto)
      )
    })
  }, [busqueda, materialesInventario, ocultarSinStock])

  function cerrarPanelesResumenBodega() {
    if (mostrarPedidosBodegaHoy) onTogglePedidosBodegaHoy?.()
    if (mostrarRecepcionesBodega) onToggleRecepcionesBodega?.()
    if (mostrarDespachosBodega) onToggleDespachosBodega?.()
  }

  function cambiarFacturaIngreso(campo, valor) {
    setFacturaIngreso((actual) => ({ ...actual, [campo]: valor }))
  }

  function cambiarSalidaMaterial(campo, valor) {
    setSalidaMaterial((actual) => ({ ...actual, [campo]: valor }))
  }

  function cambiarPedidoMaterial(campo, valor) {
    setPedidoMaterial((actual) => ({ ...actual, [campo]: valor }))
  }

  function cambiarDevolucionMaterial(campo, valor) {
    setDevolucionMaterial((actual) => ({ ...actual, [campo]: valor }))
  }

  function cambiarRecepcionMaterial(campo, valor) {
    setRecepcionMaterial((actual) => ({ ...actual, [campo]: valor }))
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
        actualizada.stock = material.saldoFinal ?? actualizada.stock
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

  function cambiarMaterialPedido(indice, campo, valor) {
    setMaterialesPedido((actuales) => actuales.map((fila, i) => (
      i === indice ? completarDatosMaterial(fila, campo, valor) : fila
    )))
  }

  function cambiarMaterialDevolucion(indice, campo, valor) {
    setMaterialesDevolucion((actuales) => actuales.map((fila, i) => (
      i === indice ? completarDatosMaterial(fila, campo, valor) : fila
    )))
  }

  function cambiarMaterialRecepcion(indice, campo, valor) {
    setMaterialesRecepcion((actuales) => actuales.map((fila, i) => (
      i === indice ? completarDatosMaterial(fila, campo, valor) : fila
    )))
  }

  function agregarMaterialIngreso() {
    setMaterialesIngreso((actuales) => [...actuales, { ...filaMovimientoVacia }])
  }

  function agregarMaterialSalida() {
    setMaterialesSalida((actuales) => [...actuales, { ...filaMovimientoVacia }])
  }

  function agregarMaterialPedido() {
    setMaterialesPedido((actuales) => [...actuales, { ...filaMovimientoVacia }])
  }

  function agregarMaterialDevolucion() {
    setMaterialesDevolucion((actuales) => [...actuales, { ...filaMovimientoVacia }])
  }

  function agregarMaterialRecepcion() {
    setMaterialesRecepcion((actuales) => [...actuales, { ...filaMovimientoVacia }])
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

  function quitarMaterialPedido(indice) {
    setMaterialesPedido((actuales) => (
      actuales.length <= 1 ? [{ ...filaMovimientoVacia }] : actuales.filter((_, i) => i !== indice)
    ))
  }

  function quitarMaterialDevolucion(indice) {
    setMaterialesDevolucion((actuales) => (
      actuales.length <= 1 ? [{ ...filaMovimientoVacia }] : actuales.filter((_, i) => i !== indice)
    ))
  }

  function quitarMaterialRecepcion(indice) {
    setMaterialesRecepcion((actuales) => (
      actuales.length <= 1 ? [{ ...filaMovimientoVacia }] : actuales.filter((_, i) => i !== indice)
    ))
  }

  async function guardarPedidoActual() {
    const guardado = await onGuardarPedido?.(pedidoMaterial, materialesPedido)
    if (!guardado) return

    setPedidoMaterial({
      fecha: fechaActualInput(),
      proyecto: '',
      tipoModulo: '',
      serie: '',
      bodega: 'bayona',
      retira: '',
    })
    setMaterialesPedido([{ ...filaMovimientoVacia }])
    setMostrarCrearPedido(false)
  }

  async function guardarDevolucionActual() {
    const guardado = await onGuardarDevolucion?.(devolucionMaterial, materialesDevolucion)
    if (!guardado) return

    setDevolucionMaterial({
      fecha: fechaActualInput(),
      bodega: 'bayona',
      motivo: '',
    })
    setMaterialesDevolucion([{ ...filaMovimientoVacia }])
    setMostrarCrearDevolucion(false)
  }

  async function guardarRecepcionActual() {
    const guardado = await onGuardarRecepcion?.(recepcionMaterial, materialesRecepcion)
    if (!guardado) return

    setRecepcionMaterial({
      fecha: fechaActualInput(),
      ordenCompra: '',
      factura: '',
      recepcion: '',
    })
    setMaterialesRecepcion([{ ...filaMovimientoVacia }])
    setMostrarRecepcionarMaterial(false)
  }

  async function guardarSalidaActual() {
    const guardado = await onGuardarSalida?.(salidaMaterial, materialesSalida)
    if (!guardado) return

    setSalidaMaterial({
      fecha: fechaActualInput(),
      tipoDocumento: 'vale',
      documento: '',
      solicitante: '',
      destino: '',
      observacion: '',
    })
    setMaterialesSalida([{ ...filaMovimientoVacia }])
    setMostrarSalidaMaterial(false)
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
        {modoSoloBodega && (
          <button type="button" onClick={onCerrar} style={botonGris}>
            Cerrar sesión
          </button>
        )}
        <button type="button" onClick={onCerrar} style={{ ...botonGris, display: modoSoloBodega ? 'none' : undefined }}>
          Volver a módulos
        </button>
      </div>

      {modoSoloBodega && (
        <CampanaBodega
          alertas={alertasBodega}
          visible={mostrarAlertasBodega}
          onToggle={onToggleAlertasBodega}
          onActualizar={onActualizarAlertasBodega}
          onSeleccionar={setAlertaBodegaSeleccionada}
        />
      )}

      {alertaBodegaSeleccionada && (
        <DetalleSolicitudBodega
          alerta={alertaBodegaSeleccionada}
          entregando={entregandoSolicitudBodega}
          materialesInventario={materialesInventario}
          puedeEditar={puedeEditarPedidos}
          puedeEditarEntregados={puedeEditarPedidosEntregados}
          puedeGestionar={puedeGestionarPedidos}
          onEditar={async (itemsEditados) => {
            const resultado = await onEditarSolicitudBodega?.(alertaBodegaSeleccionada, itemsEditados)
            if (!resultado) return false
            if (resultado?.items) {
              setAlertaBodegaSeleccionada((actual) => ({ ...actual, ...resultado }))
            }
            onActualizarAlertasBodega?.()
            return true
          }}
          onEntregar={async () => {
            const ok = await onEntregarSolicitudBodega?.(alertaBodegaSeleccionada)
            if (!ok) return
            setAlertaBodegaSeleccionada(null)
            onActualizarAlertasBodega?.()
          }}
          onCerrar={() => setAlertaBodegaSeleccionada(null)}
        />
      )}

      {recepcionSeleccionada && (
        <DetalleRecepcionBodega
          recepcion={recepcionSeleccionada}
          onCerrar={() => setRecepcionSeleccionada(null)}
        />
      )}

      {despachoSeleccionado && (
        <DetalleDespachoBodega
          despacho={despachoSeleccionado}
          onCerrar={() => setDespachoSeleccionado(null)}
        />
      )}

      {puedeAdministrar ? (
        <>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={() => {
                setMostrarCargaExcel((actual) => !actual)
                if (!mostrarCargaExcel && mostrarHistorialValesBodega) onToggleHistorialValesBodega?.()
              }}
              style={botonAzul}
            >
              Cargar inventario Excel
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarCargaExcel(false)
                onToggleHistorialValesBodega?.()
              }}
              style={{
                ...botonAzul,
                background: mostrarHistorialValesBodega ? '#0d47a1' : '#455a64',
                borderColor: mostrarHistorialValesBodega ? '#64b5f6' : '#607d8b',
              }}
            >
              Historial de vales
            </button>
          </div>

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

          {mostrarHistorialValesBodega && (
            <PanelHistorialValesBodega
              pedidos={historialValesBodega}
              fecha={fechaHistorialValesBodega}
              cargando={cargandoHistorialValesBodega}
              onCambiarFecha={onCambiarFechaHistorialValesBodega}
              onActualizar={onActualizarHistorialValesBodega}
              onSeleccionar={setAlertaBodegaSeleccionada}
              onImprimir={onImprimirHistorialVales}
              onImprimirGeneral={onImprimirHistorialValesGeneral}
            />
          )}
        </>
      ) : null}

      {cargandoInventarios ? (
        <p style={{ color: '#ccc' }}>Cargando inventarios guardados...</p>
      ) : inventarios.length === 0 ? (
        <p style={{ color: '#ccc' }}>
          Aún no hay inventarios guardados. Un admin debe adjuntar el Excel de bodega para cargarlo.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'end', flexWrap: 'wrap', marginBottom: '12px' }}>
            <label style={{ display: 'grid', gap: '5px', flex: '1 1 420px' }}>
              <strong>Buscar material</strong>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por código, descripción o unidad"
                style={inputStyle}
              />
            </label>
            <button
              type="button"
              onClick={() => setOcultarSinStock((valor) => !valor)}
              style={{
                ...botonFiltroStock,
                background: ocultarSinStock ? '#0d47a1' : '#555',
                borderColor: ocultarSinStock ? '#64b5f6' : '#777',
              }}
            >
              {ocultarSinStock ? 'Mostrar material sin stock' : 'Ocultar material sin stock'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'stretch', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div style={{ minWidth: '180px', maxWidth: '240px', flex: '1 1 180px' }}>
              <Tarjeta titulo="Materiales" valor={inventarioSeleccionado?.totalItems || 0} />
            </div>

            {mostrarPedidosHoy && (
              <div style={{ minWidth: '180px', maxWidth: '240px', flex: '1 1 180px' }}>
                <Tarjeta
                  titulo="Pedidos hoy"
                  valor={pedidosBodegaHoy.length}
                  onClick={onTogglePedidosBodegaHoy}
                />
              </div>
            )}

            {modoSoloBodega && (
              <div style={{ minWidth: '180px', maxWidth: '240px', flex: '1 1 180px' }}>
                <Tarjeta
                  titulo="Material recepcionado"
                  valor={recepcionesBodega.length}
                  onClick={onToggleRecepcionesBodega}
                />
              </div>
            )}

            {modoSoloBodega && (
              <div style={{ minWidth: '180px', maxWidth: '240px', flex: '1 1 180px' }}>
                <Tarjeta
                  titulo="Material despachado"
                  valor={despachosBodega.length}
                  onClick={onToggleDespachosBodega}
                />
              </div>
            )}

            {puedeExportarInventario && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', marginLeft: 'auto' }}>
                {modoSoloBodega && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarSalidaMaterial((actual) => !actual)
                        setMostrarRecepcionarMaterial(false)
                        setMostrarCrearPedido(false)
                        setMostrarCrearDevolucion(false)
                        setMostrarIngresoProveedor(false)
                      }}
                      style={{
                        ...botonAccionInventarioCompacto,
                        background: '#5d4037',
                        borderColor: '#a1887f',
                      }}
                    >
                      <span>Despachar</span>
                      <span>material</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarRecepcionarMaterial((actual) => !actual)
                        setMostrarCrearPedido(false)
                        setMostrarCrearDevolucion(false)
                        setMostrarIngresoProveedor(false)
                        setMostrarSalidaMaterial(false)
                      }}
                      style={{
                        ...botonAccionInventarioCompacto,
                        background: '#1b5e20',
                        borderColor: '#66bb6a',
                      }}
                    >
                      <span>Recepcionar</span>
                      <span>material</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={onExportarInventario}
                  disabled={!inventarioSeleccionado?.items?.length}
                  style={{
                    ...botonAccionInventarioCompacto,
                    background: '#1565c0',
                    borderColor: '#777',
                    opacity: !inventarioSeleccionado?.items?.length ? 0.7 : 1,
                    cursor: !inventarioSeleccionado?.items?.length ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>Exportar</span>
                  <span>inventario</span>
                </button>
              </div>
            )}

            {puedeAdministrar && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarCrearPedido((actual) => !actual)
                    setMostrarCrearDevolucion(false)
                    setMostrarIngresoProveedor(false)
                    setMostrarSalidaMaterial(false)
                    setMostrarRecepcionarMaterial(false)
                    cerrarPanelesResumenBodega()
                  }}
                  style={botonAzul}
                >
                  Crear pedido
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarCrearDevolucion((actual) => !actual)
                    setMostrarCrearPedido(false)
                    setMostrarIngresoProveedor(false)
                    setMostrarSalidaMaterial(false)
                    setMostrarRecepcionarMaterial(false)
                    cerrarPanelesResumenBodega()
                  }}
                  style={botonAzul}
                >
                  Crear devolución
                </button>
              </div>
            )}
            {!puedeAdministrar && !modoSoloBodega && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarCrearPedido((actual) => !actual)
                    setMostrarCrearDevolucion(false)
                    setMostrarRecepcionarMaterial(false)
                  }}
                  style={botonAzul}
                >
                  Crear pedido
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarCrearDevolucion((actual) => !actual)
                    setMostrarCrearPedido(false)
                    setMostrarRecepcionarMaterial(false)
                  }}
                  style={botonAzul}
                >
                  Crear devolución
                </button>
              </div>
            )}
          </div>

          {mostrarPedidosHoy && mostrarPedidosBodegaHoy && (
            <PanelPedidosBodegaHoy
              pedidos={pedidosBodegaHoy}
              onSeleccionar={setAlertaBodegaSeleccionada}
              onImprimir={onImprimirPedidos}
              onImprimirGeneral={onImprimirPedidosGeneral}
            />
          )}

          {modoSoloBodega && mostrarRecepcionesBodega && (
            <PanelRecepcionesBodega
              recepciones={recepcionesBodega}
              rango={rangoRecepcionesBodega}
              fecha={fechaRecepcionesBodega}
              onCambiarRango={onCambiarRangoRecepcionesBodega}
              onCambiarFecha={onCambiarFechaRecepcionesBodega}
              onActualizar={onActualizarRecepcionesBodega}
              onSeleccionar={setRecepcionSeleccionada}
            />
          )}

          {modoSoloBodega && mostrarDespachosBodega && (
            <PanelDespachosBodega
              despachos={despachosBodega}
              rango={rangoDespachosBodega}
              fecha={fechaDespachosBodega}
              onCambiarRango={onCambiarRangoDespachosBodega}
              onCambiarFecha={onCambiarFechaDespachosBodega}
              onActualizar={onActualizarDespachosBodega}
              onSeleccionar={setDespachoSeleccionado}
            />
          )}

          {mostrarRecepcionarMaterial && puedeExportarInventario && (
            <PanelRecepcionarMaterial
              recepcion={recepcionMaterial}
              materialesRecepcion={materialesRecepcion}
              materialesInventario={materialesInventario}
              onCambiarRecepcion={cambiarRecepcionMaterial}
              onCambiarMaterial={cambiarMaterialRecepcion}
              onAgregarMaterial={agregarMaterialRecepcion}
              onQuitarMaterial={quitarMaterialRecepcion}
              onGuardar={guardarRecepcionActual}
              guardando={guardandoRecepcion}
              onCerrar={() => setMostrarRecepcionarMaterial(false)}
            />
          )}

          {mostrarCrearPedido && (
            <PanelCrearPedido
              pedido={pedidoMaterial}
              electricos={electricosDisponibles}
              materialesPedido={materialesPedido}
              materialesInventario={materialesInventario}
              guardando={guardandoPedido}
              onCambiarPedido={cambiarPedidoMaterial}
              onCambiarMaterial={cambiarMaterialPedido}
              onAgregarMaterial={agregarMaterialPedido}
              onQuitarMaterial={quitarMaterialPedido}
              onGuardar={guardarPedidoActual}
              onCerrar={() => setMostrarCrearPedido(false)}
            />
          )}

          {mostrarCrearDevolucion && (
            <PanelCrearDevolucion
              devolucion={devolucionMaterial}
              materialesDevolucion={materialesDevolucion}
              materialesInventario={materialesInventario}
              guardando={guardandoDevolucion}
              onCambiarDevolucion={cambiarDevolucionMaterial}
              onCambiarMaterial={cambiarMaterialDevolucion}
              onAgregarMaterial={agregarMaterialDevolucion}
              onQuitarMaterial={quitarMaterialDevolucion}
              onGuardar={guardarDevolucionActual}
              onCerrar={() => setMostrarCrearDevolucion(false)}
            />
          )}

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

          {mostrarSalidaMaterial && (puedeAdministrar || modoSoloBodega) && (
            <PanelSalidaMaterial
              salidaMaterial={salidaMaterial}
              materialesSalida={materialesSalida}
              materialesInventario={materialesInventario}
              onCambiarSalida={cambiarSalidaMaterial}
              onCambiarMaterial={cambiarMaterialSalida}
              onAgregarMaterial={agregarMaterialSalida}
              onQuitarMaterial={quitarMaterialSalida}
              onGuardar={guardarSalidaActual}
              guardando={guardandoSalida}
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
  onGuardar,
  guardando,
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

function PanelRecepcionarMaterial({
  recepcion,
  materialesRecepcion,
  materialesInventario,
  onCambiarRecepcion,
  onCambiarMaterial,
  onAgregarMaterial,
  onQuitarMaterial,
  onGuardar,
  guardando,
  onCerrar,
}) {
  return (
    <div style={panelMovimientoStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Recepcionar material</h3>
        <button type="button" onClick={onCerrar} style={botonMiniGris}>
          Cerrar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        <CampoTexto
          label="Fecha"
          type="date"
          value={recepcion.fecha}
          onChange={(valor) => onCambiarRecepcion('fecha', valor)}
        />
        <CampoTexto
          label="Orden de compra"
          value={recepcion.ordenCompra}
          onChange={(valor) => onCambiarRecepcion('ordenCompra', valor)}
          placeholder="N° orden de compra"
        />
        <CampoTexto
          label="N° factura"
          value={recepcion.factura}
          onChange={(valor) => onCambiarRecepcion('factura', valor)}
          placeholder="N° factura"
        />
        <CampoTexto
          label="N° recepción"
          value={recepcion.recepcion}
          onChange={(valor) => onCambiarRecepcion('recepcion', valor)}
          placeholder="N° recepción"
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <button
          type="button"
          onClick={onGuardar}
          disabled={guardando}
          style={{
            ...botonVerde,
            opacity: guardando ? 0.7 : 1,
            cursor: guardando ? 'not-allowed' : 'pointer',
          }}
        >
          {guardando ? 'Recepcionando...' : 'Recepcionar material'}
        </button>
      </div>

      <h4 style={{ margin: '14px 0 8px' }}>Material recepcionado</h4>
      <TablaMovimientoMateriales
        datalistId="materiales-bodega-recepcion"
        materialesInventario={materialesInventario}
        filas={materialesRecepcion}
        mostrarStock
        onCambiarMaterial={onCambiarMaterial}
        onQuitarMaterial={onQuitarMaterial}
      />

      <div style={accionesPanelStyle}>
        <button type="button" onClick={onAgregarMaterial} style={botonGris}>
          + Agregar material
        </button>
      </div>
    </div>
  )
}

function CampanaBodega({
  alertas,
  visible,
  onToggle,
  onActualizar,
  onSeleccionar,
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Ver pedidos y devoluciones de bodega"
        onClick={(e) => {
          e.stopPropagation()
          onToggle?.()
          onActualizar?.()
        }}
        style={{
          position: 'fixed',
          left: '12px',
          bottom: '20px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: '2px solid white',
          background: '#1976d2',
          color: 'white',
          fontSize: '24px',
          zIndex: 2600,
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
        }}
      >
        {'\u{1F514}'}
        {alertas.length > 0 && (
          <span style={contadorCampanaStyle}>
            {alertas.length}
          </span>
        )}
      </button>

      {visible && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={panelCampanaBodegaStyle}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>Solicitudes bodega</h3>
            <button type="button" onClick={onActualizar} style={botonMiniGris}>
              Actualizar
            </button>
          </div>

          {alertas.length === 0 ? (
            <p style={{ margin: 0, color: '#ccc' }}>No hay pedidos o devoluciones registrados hoy.</p>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {alertas.map((alerta) => {
                const totalItems = (alerta.items || []).length
                return (
                  <button
                    key={alerta.id}
                    type="button"
                    onClick={() => onSeleccionar?.(alerta)}
                    style={botonAlertaBodegaStyle}
                  >
                    <strong>{obtenerEtiquetaAlertaBodega(alerta)}</strong>
                    <span>{alerta.solicitante_nombre || alerta.usuario_nombre || 'Sin usuario'}</span>
                    <strong>total {formatearNumero(totalItems)}</strong>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function PanelPedidosBodegaHoy({ pedidos, onSeleccionar, onImprimir, onImprimirGeneral }) {
  return (
    <div style={{ ...panelMovimientoStyle, marginTop: '-2px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Pedidos de hoy</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onImprimir}
            disabled={pedidos.length === 0}
            style={{
              ...botonAzul,
              padding: '8px 14px',
              opacity: pedidos.length === 0 ? 0.65 : 1,
              cursor: pedidos.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Imprimir detalle
          </button>
          <button
            type="button"
            onClick={onImprimirGeneral}
            disabled={pedidos.length === 0}
            style={{
              ...botonAzul,
              padding: '8px 14px',
              opacity: pedidos.length === 0 ? 0.65 : 1,
              cursor: pedidos.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Imprimir general
          </button>
        </div>
      </div>
      {pedidos.length === 0 ? (
        <p style={{ color: '#bbb', margin: 0 }}>No hay pedidos registrados hoy.</p>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {pedidos.map((pedido) => {
            const total = (pedido.items || []).length
            const entregado = String(pedido.estado_bodega || '').toLowerCase() === 'entregado'
            const etiquetaEstado = entregado ? 'Entregado' : 'Pendiente'
            const solicitante = pedido.solicitante_nombre || pedido.usuario_nombre || 'Sin usuario'
            const detalle = [
              pedido.proyecto ? `Proyecto: ${pedido.proyecto}` : '',
              pedido.tipo_modulo ? `Tipo: ${pedido.tipo_modulo}` : '',
              pedido.serie ? `Serie: ${pedido.serie}` : '',
              `Total: ${formatearNumero(total)}`,
            ].filter(Boolean).join(' | ')

            return (
              <button
                type="button"
                key={pedido.id || `${pedido.fecha}-${solicitante}-${total}`}
                onClick={() => onSeleccionar?.(pedido)}
                style={filaPedidoHoyStyle}
              >
                <span style={{ display: 'grid', gap: '3px', minWidth: 0 }}>
                  <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Pedido | {solicitante}
                  </strong>
                  <small style={{ color: '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {detalle}
                  </small>
                </span>
                <strong style={{
                  color: entregado ? '#66bb6a' : '#ffcc80',
                  border: `1px solid ${entregado ? '#2e7d32' : '#f9a825'}`,
                  borderRadius: '999px',
                  padding: '5px 10px',
                  whiteSpace: 'nowrap',
                  background: entregado ? '#15351c' : '#3a2b10',
                }}>
                  {etiquetaEstado}
                </strong>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PanelHistorialValesBodega({
  pedidos,
  fecha,
  cargando,
  onCambiarFecha,
  onActualizar,
  onSeleccionar,
  onImprimir,
  onImprimirGeneral,
}) {
  return (
    <div style={{ ...panelMovimientoStyle, marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Historial de vales</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <input
            type="date"
            value={fecha}
            onChange={(e) => onCambiarFecha?.(e.target.value)}
            style={{ ...inputStyle, width: '170px' }}
          />
          <button type="button" onClick={onActualizar} style={botonAzul}>
            Actualizar
          </button>
          <button
            type="button"
            onClick={onImprimir}
            disabled={pedidos.length === 0}
            style={{
              ...botonAzul,
              padding: '8px 14px',
              opacity: pedidos.length === 0 ? 0.65 : 1,
              cursor: pedidos.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Imprimir detalle
          </button>
          <button
            type="button"
            onClick={onImprimirGeneral}
            disabled={pedidos.length === 0}
            style={{
              ...botonAzul,
              padding: '8px 14px',
              opacity: pedidos.length === 0 ? 0.65 : 1,
              cursor: pedidos.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Imprimir general
          </button>
        </div>
      </div>

      {cargando ? (
        <p style={{ color: '#bbb', margin: 0 }}>Cargando vales...</p>
      ) : pedidos.length === 0 ? (
        <p style={{ color: '#bbb', margin: 0 }}>No hay pedidos registrados para esta fecha.</p>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {pedidos.map((pedido) => {
            const total = (pedido.items || []).length
            const entregado = String(pedido.estado_bodega || '').toLowerCase() === 'entregado'
            const etiquetaEstado = entregado ? 'Entregado' : 'Pendiente'
            const solicitante = pedido.solicitante_nombre || pedido.usuario_nombre || 'Sin usuario'
            const detalle = [
              pedido.proyecto ? `Proyecto: ${pedido.proyecto}` : '',
              pedido.tipo_modulo ? `Tipo: ${pedido.tipo_modulo}` : '',
              pedido.serie ? `Serie: ${pedido.serie}` : '',
              `Total: ${formatearNumero(total)}`,
            ].filter(Boolean).join(' | ')

            return (
              <button
                type="button"
                key={pedido.id || `${pedido.fecha}-${solicitante}-${total}`}
                onClick={() => onSeleccionar?.(pedido)}
                style={filaPedidoHoyStyle}
              >
                <span style={{ display: 'grid', gap: '3px', minWidth: 0 }}>
                  <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Pedido | {solicitante}
                  </strong>
                  <small style={{ color: '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {detalle}
                  </small>
                </span>
                <strong style={{
                  color: entregado ? '#66bb6a' : '#ffcc80',
                  border: `1px solid ${entregado ? '#2e7d32' : '#f9a825'}`,
                  borderRadius: '999px',
                  padding: '5px 10px',
                  whiteSpace: 'nowrap',
                  background: entregado ? '#15351c' : '#3a2b10',
                }}>
                  {etiquetaEstado}
                </strong>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PanelRecepcionesBodega({
  recepciones,
  rango,
  fecha,
  onCambiarRango,
  onCambiarFecha,
  onActualizar,
  onSeleccionar,
}) {
  return (
    <div style={{ ...panelMovimientoStyle, marginTop: '-2px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Material recepcionado</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={rango}
            onChange={(e) => onCambiarRango?.(e.target.value)}
            style={{ ...inputStyle, width: '120px' }}
          >
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
            <option value="anio">Año</option>
          </select>
          <input
            type={tipoInputRangoRecepcion(rango)}
            value={fecha}
            onChange={(e) => onCambiarFecha?.(e.target.value)}
            min={rango === 'anio' ? '2000' : undefined}
            max={rango === 'anio' ? '2100' : undefined}
            style={{ ...inputStyle, width: rango === 'anio' ? '110px' : '170px' }}
          />
          <button type="button" onClick={onActualizar} style={botonAzul}>
            Actualizar
          </button>
        </div>
      </div>
      {recepciones.length === 0 ? (
        <p style={{ color: '#bbb', margin: 0 }}>No hay recepciones registradas en este rango.</p>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {recepciones.map((recepcion) => (
            <button
              type="button"
              key={recepcion.id}
              onClick={() => onSeleccionar?.(recepcion)}
              style={filaPedidoHoyStyle}
            >
              <span style={{ display: 'grid', gap: '3px', minWidth: 0 }}>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {recepcion.fecha || '-'} | OC: {recepcion.orden_compra || '-'} | Factura: {recepcion.numero_factura || '-'} | Recepción: {recepcion.numero_recepcion || '-'}
                </strong>
                <small style={{ color: '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {recepcion.bodega || 'Sin bodega'} | {(recepcion.items || []).length} materiales
                </small>
              </span>
              <strong style={{
                color: '#66bb6a',
                border: '1px solid #2e7d32',
                borderRadius: '999px',
                padding: '5px 10px',
                whiteSpace: 'nowrap',
                background: '#15351c',
              }}>
                Ver detalle
              </strong>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PanelDespachosBodega({
  despachos,
  rango,
  fecha,
  onCambiarRango,
  onCambiarFecha,
  onActualizar,
  onSeleccionar,
}) {
  return (
    <div style={{ ...panelMovimientoStyle, marginTop: '-2px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Material despachado</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={rango}
            onChange={(e) => onCambiarRango?.(e.target.value)}
            style={{ ...inputStyle, width: '120px' }}
          >
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
            <option value="anio">Año</option>
          </select>
          <input
            type={tipoInputRangoRecepcion(rango)}
            value={fecha}
            onChange={(e) => onCambiarFecha?.(e.target.value)}
            min={rango === 'anio' ? '2000' : undefined}
            max={rango === 'anio' ? '2100' : undefined}
            style={{ ...inputStyle, width: rango === 'anio' ? '110px' : '170px' }}
          />
          <button type="button" onClick={onActualizar} style={botonAzul}>
            Actualizar
          </button>
        </div>
      </div>
      {despachos.length === 0 ? (
        <p style={{ color: '#bbb', margin: 0 }}>No hay despachos registrados en este rango.</p>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {despachos.map((despacho) => (
            <button
              type="button"
              key={despacho.id}
              onClick={() => onSeleccionar?.(despacho)}
              style={filaPedidoHoyStyle}
            >
              <span style={{ display: 'grid', gap: '3px', minWidth: 0 }}>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {despacho.fecha || '-'} | Documento: {despacho.documento || '-'}
                </strong>
                <small style={{ color: '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {despacho.bodega || 'Sin bodega'} | {despacho.usuario_nombre || 'Sin usuario'} | {(despacho.items || []).length} materiales
                </small>
              </span>
              <strong style={{
                color: '#ffcc80',
                border: '1px solid #ef6c00',
                borderRadius: '999px',
                padding: '5px 10px',
                whiteSpace: 'nowrap',
                background: '#3a2610',
              }}>
                Ver detalle
              </strong>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DetalleRecepcionBodega({ recepcion, onCerrar }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={modalDetalleBodegaOverlayStyle}
    >
      <div style={modalDetalleBodegaStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Recepción de material</h3>
            <p style={{ margin: '6px 0 0', color: '#ccc' }}>
              {recepcion.fecha || ''} | {recepcion.usuario_nombre || 'Sin usuario'}
            </p>
          </div>
          <button type="button" onClick={onCerrar} style={botonMiniGris}>
            Cerrar
          </button>
        </div>

        <div style={{ padding: '10px', border: '1px solid #455a64', borderRadius: '8px', background: '#1f2529', color: '#cfd8dc', marginBottom: '12px' }}>
          <div><strong>Orden de compra:</strong> {recepcion.orden_compra || '-'}</div>
          <div><strong>N° factura:</strong> {recepcion.numero_factura || '-'}</div>
          <div><strong>N° recepción:</strong> {recepcion.numero_recepcion || '-'}</div>
          <div><strong>Bodega:</strong> {recepcion.bodega || '-'}</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
            <thead>
              <tr style={{ background: '#333' }}>
                <th style={{ ...thStyle, width: '190px' }}>Código</th>
                <th style={thStyle}>Material</th>
                <th style={thStyle}>Unidad</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {(recepcion.items || []).map((item) => (
                <tr key={item.id || `${item.codigo_bodega}-${item.descripcion}`}>
                  <td style={tdStyle}>{item.codigo_bodega || '-'}</td>
                  <td style={tdStyle}>{item.descripcion || '-'}</td>
                  <td style={tdStyle}>{item.unidad || '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900 }}>{formatearNumero(item.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(recepcion.items || []).length === 0 && (
          <p style={{ color: '#bbb' }}>Esta recepción no tiene materiales asociados.</p>
        )}
      </div>
    </div>
  )
}

function DetalleDespachoBodega({ despacho, onCerrar }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={modalDetalleBodegaOverlayStyle}
    >
      <div style={modalDetalleBodegaStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Despacho de material</h3>
            <p style={{ margin: '6px 0 0', color: '#ccc' }}>
              {despacho.fecha || ''} | {despacho.usuario_nombre || 'Sin usuario'}
            </p>
          </div>
          <button type="button" onClick={onCerrar} style={botonMiniGris}>
            Cerrar
          </button>
        </div>

        <div style={{ padding: '10px', border: '1px solid #5d4037', borderRadius: '8px', background: '#2a1d18', color: '#ffcc80', marginBottom: '12px' }}>
          <div><strong>N° documento:</strong> {despacho.documento || '-'}</div>
          <div><strong>Bodega:</strong> {despacho.bodega || '-'}</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
            <thead>
              <tr style={{ background: '#333' }}>
                <th style={{ ...thStyle, width: '190px' }}>Código</th>
                <th style={thStyle}>Material</th>
                <th style={thStyle}>Unidad</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {(despacho.items || []).map((item) => (
                <tr key={item.id || `${item.codigo_bodega}-${item.descripcion}`}>
                  <td style={tdStyle}>{item.codigo_bodega || '-'}</td>
                  <td style={tdStyle}>{item.descripcion || '-'}</td>
                  <td style={tdStyle}>{item.unidad || '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900 }}>{formatearNumero(item.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(despacho.items || []).length === 0 && (
          <p style={{ color: '#bbb' }}>Este despacho no tiene materiales asociados.</p>
        )}
      </div>
    </div>
  )
}

function DetalleSolicitudBodega({
  alerta,
  entregando,
  materialesInventario = [],
  puedeEditar,
  puedeEditarEntregados,
  puedeGestionar,
  onEditar,
  onEntregar,
  onCerrar,
}) {
  const [editando, setEditando] = useState(false)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [itemsEditados, setItemsEditados] = useState([])
  const [filaSugerenciasEdicion, setFilaSugerenciasEdicion] = useState(null)
  const esPedido = alerta?.tipo_ingreso === 'pedido_app'
  const entregado = String(alerta?.estado_bodega || '').toLowerCase() === 'entregado'
  const puedeEditarEstePedido = puedeEditar && esPedido && (!entregado || puedeEditarEntregados)
  const fueModificadoPorBodega = tieneMarcaModificacionBodega(alerta.observacion)

  useEffect(() => {
    setItemsEditados((alerta?.items || []).map((item, indice) => ({
      _uid: item.id || crearIdFilaEdicionPedido(`pedido-${alerta?.id || 'sin-id'}-${indice}`),
      id: item.id,
      material_vale: item.material_vale || item.material_balance || '',
      material_balance: item.material_balance || item.material_vale || '',
      cantidad: item.cantidad || '',
    })))
  }, [alerta?.id])

  function cambiarItem(indice, campo, valor) {
    setItemsEditados((actuales) => actuales.map((item, i) => (
      i === indice ? { ...item, [campo]: valor } : item
    )))
  }

  function seleccionarMaterialEdicion(indice, material) {
    setItemsEditados((actuales) => actuales.map((item, i) => (
      i === indice
        ? {
            ...item,
            material_vale: material.codigo || material.descripcion || '',
            material_balance: material.descripcion || material.codigo || '',
          }
        : item
    )))
    setFilaSugerenciasEdicion(null)
  }

  function agregarItem() {
    setItemsEditados((actuales) => [...actuales, {
      _uid: crearIdFilaEdicionPedido(`nuevo-${alerta?.id || 'pedido'}`),
      material_vale: '',
      material_balance: '',
      cantidad: '',
    }])
  }

  function quitarItem(indice) {
    setItemsEditados((actuales) => actuales.length <= 1 ? actuales : actuales.filter((_, i) => i !== indice))
  }

  async function guardarEdicion() {
    setGuardandoEdicion(true)
    const ok = await onEditar?.(itemsEditados.map(({ _uid, ...item }) => item))
    setGuardandoEdicion(false)
    if (ok) setEditando(false)
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={modalDetalleBodegaOverlayStyle}
    >
      <div style={modalDetalleBodegaStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0 }}>{obtenerEtiquetaAlertaBodega(alerta)} de bodega</h3>
            <p style={{ margin: '6px 0 0', color: '#ccc' }}>
              {alerta.solicitante_nombre || alerta.usuario_nombre || 'Sin usuario'} | {alerta.fecha || ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {puedeEditarEstePedido && !editando && (
              <button type="button" onClick={() => setEditando(true)} style={botonMiniAzul}>
                Editar
              </button>
            )}
            <button type="button" onClick={onCerrar} style={botonMiniGris}>
              Cerrar
            </button>
          </div>
        </div>

        {(limpiarObservacionSolicitudBodega(alerta.observacion) || fueModificadoPorBodega) && (
          <div
            className={fueModificadoPorBodega ? 'vale-bodega-modificado' : ''}
            style={{ padding: '10px', border: '1px solid #795548', borderRadius: '8px', background: '#2b211b', color: '#ffcc80', marginBottom: '12px' }}
          >
            {fueModificadoPorBodega && (
              <span style={{ display: 'inline-block', marginRight: '8px', color: '#ffe082', fontWeight: 900 }}>
                Editado por bodega
              </span>
            )}
            {limpiarObservacionSolicitudBodega(alerta.observacion)}
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '190px' }} />
              <col />
              <col style={{ width: '130px' }} />
              {editando && <col style={{ width: '82px' }} />}
            </colgroup>
            <thead>
              <tr style={{ background: '#333' }}>
                <th style={thStyle}>Código</th>
                <th style={thStyle}>Material</th>
                <th style={{ ...thStyle, width: '130px', textAlign: 'right' }}>Cantidad</th>
                {editando && <th style={{ ...thStyle, width: '82px', textAlign: 'center' }}>Quitar</th>}
              </tr>
            </thead>
            <tbody>
              {(editando ? itemsEditados : (alerta.items || [])).map((item, indice) => {
                const codigo = editando ? (item.material_vale || '') : obtenerCodigoMaterialPedido(item, materialesInventario)
                return (
                  <tr key={item._uid || item.id || indice}>
                    <td style={{ ...tdStyle, width: '190px' }}>
                      {editando ? (
                        <input
                          type="text"
                          value={codigo}
                          onChange={(e) => cambiarItem(indice, 'material_vale', e.target.value)}
                          style={inputTablaStyle}
                        />
                      ) : (
                        codigo || '-'
                      )}
                    </td>
                    <td style={tdStyle}>
                      {editando ? (
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            value={item.material_balance ?? ''}
                            onFocus={() => setFilaSugerenciasEdicion(indice)}
                            onBlur={() => setTimeout(() => setFilaSugerenciasEdicion(null), 160)}
                            onChange={(e) => {
                              cambiarItem(indice, 'material_balance', e.target.value)
                              setFilaSugerenciasEdicion(indice)
                            }}
                            style={inputTablaStyle}
                          />
                          {filaSugerenciasEdicion === indice && obtenerSugerenciasMateriales(
                            item.material_balance,
                            materialesInventario,
                          ).length > 0 && (
                            <div style={{ ...sugerenciasMaterialStyle, position: 'absolute', zIndex: 3300 }}>
                              {obtenerSugerenciasMateriales(item.material_balance, materialesInventario).map((material) => (
                                <button
                                  key={`editar-pedido-${indice}-${material.codigo}-${material.descripcion}`}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    seleccionarMaterialEdicion(indice, material)
                                  }}
                                  style={botonSugerenciaMaterialStyle}
                                  title={material.descripcion}
                                >
                                  <span>{material.descripcion}</span>
                                  <span style={{ display: 'grid', gap: '2px', justifyItems: 'end', fontSize: '12px' }}>
                                    {material.codigo && <small style={{ color: '#9fb3c8' }}>{material.codigo}</small>}
                                    <small style={{ color: Number(material.saldoFinal || 0) > 0 ? '#81c784' : '#ff8a80', fontWeight: 900 }}>
                                      Stock: {formatearNumero(material.saldoFinal || 0)}
                                    </small>
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        item.material_balance || item.material_vale
                      )}
                    </td>
                    <td style={{ ...tdStyle, width: '130px', textAlign: 'right', fontWeight: 900 }}>
                      {editando ? (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.cantidad}
                          onChange={(e) => cambiarItem(indice, 'cantidad', e.target.value)}
                          style={{ ...inputTablaStyle, textAlign: 'right' }}
                        />
                      ) : (
                        formatearNumero(item.cantidad)
                      )}
                    </td>
                    {editando && (
                      <td style={{ ...tdStyle, width: '82px', textAlign: 'center' }}>
                        <button type="button" onClick={() => quitarItem(indice)} style={botonIconoRojo}>
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {(alerta.items || []).length === 0 && (
          <p style={{ color: '#bbb' }}>Esta solicitud no tiene materiales asociados.</p>
        )}

        <div style={accionesPanelStyle}>
          {editando && (
            <>
              <button type="button" onClick={agregarItem} style={botonGris}>
                + Agregar material
              </button>
              <button type="button" onClick={() => setEditando(false)} style={botonMiniGris}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardandoEdicion}
                onClick={guardarEdicion}
                style={{
                  ...botonAzul,
                  opacity: guardandoEdicion ? 0.7 : 1,
                  cursor: guardandoEdicion ? 'not-allowed' : 'pointer',
                }}
              >
                {guardandoEdicion ? 'Guardando...' : 'Guardar edición'}
              </button>
            </>
          )}
          {puedeGestionar && esPedido && (
            <button
              type="button"
              disabled={entregando || entregado || editando}
              onClick={entregado ? undefined : onEntregar}
              style={{
                ...botonVerde,
                opacity: entregando || entregado || editando ? 0.7 : 1,
                cursor: entregando || entregado || editando ? 'not-allowed' : 'pointer',
              }}
            >
              {entregado ? 'Pedido ya entregado' : entregando ? 'Descontando...' : 'Pedido entregado'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function obtenerCodigoMaterialPedido(item = {}, materialesInventario = []) {
  const textoCodigo = String(item.material_vale || '').trim()
  const textoMaterial = String(item.material_balance || item.material_vale || '').trim()
  const encontrado = materialesInventario.find((material) => (
    normalizarBusqueda(material.codigo) === normalizarBusqueda(textoCodigo)
    || normalizarBusqueda(material.descripcion) === normalizarBusqueda(textoMaterial)
    || normalizarBusqueda(material.codigo) === normalizarBusqueda(textoMaterial)
  ))

  return encontrado?.codigo || (textoCodigo !== textoMaterial ? textoCodigo : '')
}

function obtenerSugerenciasMateriales(texto, materialesInventario = []) {
  const busqueda = normalizarBusqueda(texto)
  if (!busqueda) return []

  return materialesInventario
    .filter((item) => (
      normalizarBusqueda(item.descripcion).includes(busqueda) ||
      normalizarBusqueda(item.codigo).includes(busqueda)
    ))
    .sort((a, b) => {
      const stockA = Number(a.saldoFinal || 0)
      const stockB = Number(b.saldoFinal || 0)
      const disponibleA = stockA > 0 ? 1 : 0
      const disponibleB = stockB > 0 ? 1 : 0
      if (disponibleA !== disponibleB) return disponibleB - disponibleA
      return stockB - stockA
    })
    .slice(0, 8)
}

function tipoInputRangoRecepcion(rango) {
  if (rango === 'semana') return 'week'
  if (rango === 'mes') return 'month'
  if (rango === 'anio') return 'number'
  return 'date'
}

function PanelCrearPedido({
  pedido,
  electricos,
  materialesPedido,
  materialesInventario,
  guardando,
  onCambiarPedido,
  onCambiarMaterial,
  onAgregarMaterial,
  onQuitarMaterial,
  onGuardar,
  onCerrar,
}) {
  return (
    <div style={panelMovimientoStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Crear pedido de material</h3>
        <button type="button" onClick={onCerrar} style={botonMiniGris}>
          Cerrar
        </button>
      </div>

      <div style={gridPedidoStyle}>
        <CampoTexto
          label="Fecha"
          type="date"
          value={pedido.fecha}
          onChange={(valor) => onCambiarPedido('fecha', valor)}
        />
        <CampoTexto
          label="Proyecto"
          value={pedido.proyecto}
          onChange={(valor) => onCambiarPedido('proyecto', valor)}
          placeholder="Proyecto"
        />
        <CampoTexto
          label="Tipo módulo"
          value={pedido.tipoModulo}
          onChange={(valor) => onCambiarPedido('tipoModulo', valor)}
          placeholder="Tipo módulo"
        />
        <CampoTexto
          label="Serie"
          value={pedido.serie || ''}
          onChange={(valor) => onCambiarPedido('serie', valor)}
          placeholder="Ej: 2020xxxx"
        />
        <label style={labelStyle}>
          Bodega
          <select
            value={pedido.bodega}
            onChange={(e) => onCambiarPedido('bodega', e.target.value)}
            style={inputStyle}
          >
            <option value="bayona">Bayona</option>
            <option value="rental">Rental</option>
            <option value="montaña">Montaña</option>
          </select>
        </label>
        <label style={labelStyle}>
          Retira
          <select
            value={pedido.retira}
            onChange={(e) => onCambiarPedido('retira', e.target.value)}
            style={inputStyle}
          >
            <option value="">Seleccionar eléctrico...</option>
            {electricos.map((item) => (
              <option key={item.id || item.nombre} value={item.id || item.nombre}>
                {item.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h4 style={{ margin: '14px 0 8px' }}>Material solicitado</h4>
      <TablaMovimientoMateriales
        datalistId="materiales-bodega-pedido"
        materialesInventario={materialesInventario}
        filas={materialesPedido}
        mostrarStock
        onCambiarMaterial={onCambiarMaterial}
        onQuitarMaterial={onQuitarMaterial}
      />

      {electricos.length === 0 && (
        <p style={{ color: '#ffcc80', margin: '8px 0 0', fontSize: '13px' }}>
          No se encontraron eléctricos cargados para seleccionar.
        </p>
      )}

      <div style={accionesPanelStyle}>
        <button type="button" onClick={onAgregarMaterial} style={botonGris}>
          + Agregar material
        </button>
        <button
          type="button"
          disabled={guardando}
          onClick={onGuardar}
          style={{
            ...botonAzul,
            opacity: guardando ? 0.7 : 1,
            cursor: guardando ? 'not-allowed' : 'pointer',
          }}
        >
          {guardando ? 'Solicitando...' : 'Solicitar a bodega'}
        </button>
      </div>
    </div>
  )
}

function PanelCrearDevolucion({
  devolucion,
  materialesDevolucion,
  materialesInventario,
  guardando,
  onCambiarDevolucion,
  onCambiarMaterial,
  onAgregarMaterial,
  onQuitarMaterial,
  onGuardar,
  onCerrar,
}) {
  return (
    <div style={panelMovimientoStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Crear devolución</h3>
        <button type="button" onClick={onCerrar} style={botonMiniGris}>
          Cerrar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        <CampoTexto
          label="Fecha"
          type="date"
          value={devolucion.fecha}
          onChange={(valor) => onCambiarDevolucion('fecha', valor)}
        />
        <label style={labelStyle}>
          Bodega
          <select
            value={devolucion.bodega}
            onChange={(e) => onCambiarDevolucion('bodega', e.target.value)}
            style={inputStyle}
          >
            <option value="bayona">Bayona</option>
            <option value="rental">Rental</option>
            <option value="montaña">Montaña</option>
          </select>
        </label>
      </div>

      <label style={labelStyle}>
        Motivo de la devolución
        <textarea
          value={devolucion.motivo}
          onChange={(e) => onCambiarDevolucion('motivo', e.target.value)}
          placeholder="Escribe el motivo de la devolución"
          style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
        />
      </label>

      <h4 style={{ margin: '14px 0 8px' }}>Material devuelto</h4>
      <TablaMovimientoMateriales
        datalistId="materiales-bodega-devolucion"
        materialesInventario={materialesInventario}
        filas={materialesDevolucion}
        mostrarStock
        onCambiarMaterial={onCambiarMaterial}
        onQuitarMaterial={onQuitarMaterial}
      />

      <div style={accionesPanelStyle}>
        <button type="button" onClick={onAgregarMaterial} style={botonGris}>
          + Agregar material
        </button>
        <button
          type="button"
          disabled={guardando}
          onClick={onGuardar}
          style={{
            ...botonAzul,
            opacity: guardando ? 0.7 : 1,
            cursor: guardando ? 'not-allowed' : 'pointer',
          }}
        >
          {guardando ? 'Registrando...' : 'Devolución a bodega'}
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
  onGuardar,
  guardando,
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        <CampoTexto label="Fecha" type="date" value={salidaMaterial.fecha} onChange={(valor) => onCambiarSalida('fecha', valor)} />
        <CampoTexto label="N° documento" value={salidaMaterial.documento} onChange={(valor) => onCambiarSalida('documento', valor)} placeholder="N° vale o guía" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <button
          type="button"
          onClick={onGuardar}
          disabled={guardando}
          style={{
            ...botonRojo,
            opacity: guardando ? 0.7 : 1,
            cursor: guardando ? 'not-allowed' : 'pointer',
          }}
        >
          {guardando ? 'Despachando...' : 'Despachar material'}
        </button>
      </div>

      <TablaMovimientoMateriales
        datalistId="materiales-bodega-salida"
        materialesInventario={materialesInventario}
        filas={materialesSalida}
        onCambiarMaterial={onCambiarMaterial}
        onQuitarMaterial={onQuitarMaterial}
      />

      <div style={accionesPanelStyle}>
        <button type="button" onClick={onAgregarMaterial} style={botonGris}>
          + Agregar material
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
  mostrarStock = false,
  onCambiarMaterial,
  onQuitarMaterial,
}) {
  const [filaSugerenciasActiva, setFilaSugerenciasActiva] = useState(null)

  function obtenerSugerencias(texto) {
    return obtenerSugerenciasMateriales(texto, materialesInventario)
  }

  function seleccionarMaterial(indice, item) {
    onCambiarMaterial(indice, 'codigo', item.codigo || '')
    onCambiarMaterial(indice, 'descripcion', item.descripcion || '')
    onCambiarMaterial(indice, 'unidad', item.unidad || '')
    onCambiarMaterial(indice, 'stock', item.saldoFinal || 0)
    setFilaSugerenciasActiva(null)
  }

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#333' }}>
              <th style={thStyle}>Código</th>
              <th style={thStyle}>Material</th>
              <th style={thStyle}>{mostrarStock ? 'Stock' : 'Unidad'}</th>
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
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={fila.descripcion}
                      onFocus={() => setFilaSugerenciasActiva(indice)}
                      onBlur={() => setTimeout(() => setFilaSugerenciasActiva(null), 160)}
                      onChange={(e) => {
                        onCambiarMaterial(indice, 'descripcion', e.target.value)
                        setFilaSugerenciasActiva(indice)
                      }}
                      style={inputTablaStyle}
                    />
                    {filaSugerenciasActiva === indice && obtenerSugerencias(fila.descripcion).length > 0 && (
                      <div style={sugerenciasMaterialStyle}>
                        {obtenerSugerencias(fila.descripcion).map((item) => (
                          <button
                            key={`${datalistId}-${indice}-${item.codigo}-${item.descripcion}`}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              seleccionarMaterial(indice, item)
                            }}
                            style={botonSugerenciaMaterialStyle}
                            title={item.descripcion}
                          >
                            <span>{item.descripcion}</span>
                            <span style={{ display: 'grid', gap: '2px', justifyItems: 'end', fontSize: '12px' }}>
                              {item.codigo && <small style={{ color: '#9fb3c8' }}>{item.codigo}</small>}
                              <small style={{ color: Number(item.saldoFinal || 0) > 0 ? '#81c784' : '#ff8a80', fontWeight: 900 }}>
                                Stock: {formatearNumero(item.saldoFinal || 0)}
                              </small>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td style={tdStyle}>
                  <input
                    type="text"
                    value={mostrarStock ? formatearNumero(fila.stock) : fila.unidad}
                    onChange={(e) => {
                      if (!mostrarStock) onCambiarMaterial(indice, 'unidad', e.target.value)
                    }}
                    readOnly={mostrarStock}
                    style={{
                      ...inputTablaStyle,
                      textAlign: mostrarStock ? 'right' : 'left',
                      background: mostrarStock ? '#e8f5e9' : inputTablaStyle.background,
                      fontWeight: mostrarStock ? 900 : inputTablaStyle.fontWeight,
                    }}
                  />
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <input
                    type="number"
                    min="0"
                    step="1"
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

function Tarjeta({ titulo, valor, onClick }) {
  function activarConTeclado(evento) {
    if (!onClick) return
    if (evento.key !== 'Enter' && evento.key !== ' ') return
    evento.preventDefault()
    onClick()
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={activarConTeclado}
      style={{
        padding: '12px',
        border: '1px solid #455a64',
        borderRadius: '10px',
        background: '#263238',
        cursor: onClick ? 'pointer' : 'default',
        minHeight: '72px',
        boxSizing: 'border-box',
      }}
    >
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

function fechaActualInput() {
  const fecha = new Date()
  const zonaLocal = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
  return zonaLocal.toISOString().slice(0, 10)
}

function obtenerEtiquetaAlertaBodega(alerta = {}) {
  if (alerta.tipo_ingreso === 'devolucion_app') return 'Devolución'
  if (alerta.tipo_ingreso === 'pedido_app') return 'Pedido'
  return 'Movimiento'
}

function limpiarObservacionSolicitudBodega(observacion = '') {
  return String(observacion || '')
    .split('|')
    .map((parte) => parte.trim())
    .filter((parte) => parte && normalizarBusqueda(parte) !== 'pedido generado desde app')
    .filter((parte) => !normalizarBusqueda(parte).startsWith('modificado por bodega'))
    .join(' | ')
}

function tieneMarcaModificacionBodega(observacion = '') {
  return String(observacion || '')
    .split('|')
    .some((parte) => normalizarBusqueda(parte).startsWith('modificado por bodega'))
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

const sugerenciasMaterialStyle = {
  position: 'static',
  width: '100%',
  maxHeight: '260px',
  overflowY: 'auto',
  marginTop: '6px',
  padding: '6px',
  border: '1px solid #555',
  borderRadius: '8px',
  background: '#1f1f1f',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03)',
}

const botonSugerenciaMaterialStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(90px, auto)',
  gap: '12px',
  width: '100%',
  padding: '9px 10px',
  border: 'none',
  borderRadius: '6px',
  background: 'transparent',
  color: 'white',
  cursor: 'pointer',
  textAlign: 'left',
  fontWeight: 700,
  whiteSpace: 'normal',
}

const contadorCampanaStyle = {
  position: 'absolute',
  top: '-6px',
  right: '-6px',
  minWidth: '20px',
  height: '20px',
  padding: '0 4px',
  boxSizing: 'border-box',
  borderRadius: '10px',
  background: '#d32f2f',
  color: 'white',
  fontSize: '12px',
  lineHeight: '20px',
  fontWeight: 700,
}

const panelCampanaBodegaStyle = {
  position: 'fixed',
  left: '12px',
  bottom: '82px',
  width: 'calc(100vw - 24px)',
  maxWidth: '430px',
  maxHeight: '62vh',
  overflowY: 'auto',
  padding: '16px',
  boxSizing: 'border-box',
  border: '1px solid white',
  borderRadius: '10px',
  background: '#222',
  color: 'white',
  textAlign: 'left',
  zIndex: 2599,
  boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
}

const botonAlertaBodegaStyle = {
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  gap: '8px',
  alignItems: 'center',
  width: '100%',
  padding: '10px',
  border: '1px solid #555',
  borderRadius: '8px',
  background: '#333',
  color: 'white',
  cursor: 'pointer',
  textAlign: 'left',
  fontWeight: 800,
}

const filaPedidoHoyStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: '12px',
  alignItems: 'center',
  width: '100%',
  padding: '11px 12px',
  border: '1px solid #555',
  borderRadius: '8px',
  background: '#303030',
  color: 'white',
  cursor: 'pointer',
  textAlign: 'left',
}

const modalDetalleBodegaOverlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 3000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '18px',
  background: 'rgba(0,0,0,0.55)',
  boxSizing: 'border-box',
}

const modalDetalleBodegaStyle = {
  width: 'min(980px, 100%)',
  maxHeight: '86vh',
  overflowY: 'auto',
  padding: '18px',
  border: '1px solid #888',
  borderRadius: '12px',
  background: '#202020',
  color: 'white',
  boxShadow: '0 10px 28px rgba(0,0,0,0.55)',
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

const botonFiltroStock = {
  ...botonGris,
  minHeight: '43px',
  whiteSpace: 'nowrap',
  padding: '9px 16px',
}

const botonAccionInventarioCompacto = {
  width: '112px',
  minHeight: '72px',
  padding: '8px 9px',
  borderRadius: '10px',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 900,
  lineHeight: 1.12,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  textAlign: 'center',
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

const botonMiniAzul = {
  ...botonAzul,
  padding: '7px 10px',
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

const gridPedidoStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '10px',
  marginBottom: '12px',
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
