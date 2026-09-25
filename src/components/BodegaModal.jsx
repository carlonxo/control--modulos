import { useEffect, useMemo, useRef, useState } from 'react'

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
  puedeOperarBodega = false,
  puedeAdministrar,
  puedeVerPedidosHoy,
  puedeEditarPedidos,
  puedeEditarPedidosEntregados,
  puedeGestionarPedidos,
  puedeAprobarPedidos,
  puedeCrearPedido = false,
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
  codigosBarraBodega = [],
  cargandoCodigosBarraBodega = false,
  guardandoCodigoBarraBodega = false,
  solicitudMaterialInicial = 0,
  soloSolicitarMaterial = false,
  onCambiarArchivo,
  onLeerArchivo,
  onGuardarPedido,
  onGuardarDevolucion,
  onGuardarRecepcion,
  onGuardarSalida,
  onEntregarSolicitudBodega,
  onAprobarSolicitudBodega,
  onDenegarSolicitudBodega,
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
  onActualizarCodigosBarraBodega,
  onGuardarCodigoBarraBodega,
  onEliminarCodigoBarraBodega,
  onActualizarAlertasBodega,
  onActualizarPedidoBodega,
  onSeleccionarInventario,
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
  const [mostrarCodigosBarra, setMostrarCodigosBarra] = useState(false)
  const [alertaBodegaSeleccionada, setAlertaBodegaSeleccionada] = useState(null)
  const actualizarPedidoBodegaRef = useRef(onActualizarPedidoBodega)
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

  useEffect(() => {
    const overflowBodyAnterior = document.body.style.overflow
    const overflowHtmlAnterior = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = overflowBodyAnterior
      document.documentElement.style.overflow = overflowHtmlAnterior
    }
  }, [])
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
  const puedeVerHistorialVales = Boolean(puedeAdministrar || modoSoloBodega || puedeVerPedidosHoy)

  useEffect(() => {
    actualizarPedidoBodegaRef.current = onActualizarPedidoBodega
  }, [onActualizarPedidoBodega])

  useEffect(() => {
    if (!alertaBodegaSeleccionada?.id) return undefined
    let activo = true
    let consultando = false
    const id = alertaBodegaSeleccionada.id

    async function actualizarPedidoAbierto() {
      if (consultando) return
      consultando = true
      try {
        const pedido = await actualizarPedidoBodegaRef.current?.(id)
        if (activo && pedido?.id === id && pedido.items?.length) {
          if (['entregado', 'denegado'].includes(String(pedido.estado_bodega || '').toLowerCase())) {
            limpiarEscaneosPedido(id)
          }
          setAlertaBodegaSeleccionada((actual) => (
            actual?.id === id && JSON.stringify(actual) !== JSON.stringify(pedido) ? pedido : actual
          ))
        }
      } catch (error) {
        console.error('No se pudo actualizar el pedido abierto', error)
      } finally {
        consultando = false
      }
    }

    actualizarPedidoAbierto()
    const intervalo = setInterval(actualizarPedidoAbierto, 15000)
    return () => {
      activo = false
      clearInterval(intervalo)
    }
  }, [alertaBodegaSeleccionada?.id])

  useEffect(() => {
    if (!solicitudMaterialInicial) return
    setMostrarCrearPedido(true)
    setMostrarCrearDevolucion(false)
    setMostrarRecepcionarMaterial(false)
    setMostrarSalidaMaterial(false)
    setMostrarIngresoProveedor(false)
    setMostrarCargaExcel(false)
    setMostrarCodigosBarra(false)
  }, [solicitudMaterialInicial])

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
      className="bodega-modal-overlay"
      onClick={(e) => {
        e.stopPropagation()
        onClickFondo?.()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
        background: '#111318',
        border: 'none',
        borderRadius: 0,
        zIndex: 1450,
        color: 'white',
        textAlign: 'left',
      }}
    >
      <div
        className="bodega-modal"
        style={{
          width: '100%',
          height: '100%',
          overflowY: 'scroll',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          scrollbarGutter: 'stable',
          boxSizing: 'border-box',
          padding: '24px',
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

      {(puedeOperarBodega || puedeAprobarPedidos) && (
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
          codigosBarraBodega={codigosBarraBodega}
          puedeEditar={puedeEditarPedidos}
          puedeEditarEntregados={puedeEditarPedidosEntregados}
          puedeGestionar={puedeGestionarPedidos}
          puedeAprobar={puedeAprobarPedidos}
          onEditar={async (itemsEditados) => {
            const resultado = await onEditarSolicitudBodega?.(alertaBodegaSeleccionada, itemsEditados)
            if (!resultado || resultado.error) {
              return { ok: false, error: resultado?.error || 'No se pudo guardar la modificación.' }
            }
            if (resultado?.items) {
              setAlertaBodegaSeleccionada((actual) => ({ ...actual, ...resultado }))
            }
            onActualizarAlertasBodega?.()
            return { ok: true }
          }}
          onActualizarPedido={async () => {
            const pedido = await onActualizarPedidoBodega?.(alertaBodegaSeleccionada.id)
            if (pedido?.id === alertaBodegaSeleccionada.id && pedido.items?.length) {
              setAlertaBodegaSeleccionada(pedido)
            }
            return pedido
          }}
          onEntregar={async (opcionesEntrega = {}) => {
            const ok = await onEntregarSolicitudBodega?.(alertaBodegaSeleccionada, opcionesEntrega)
            if (!ok) return
            limpiarEscaneosPedido(alertaBodegaSeleccionada.id)
            setAlertaBodegaSeleccionada(null)
            onActualizarAlertasBodega?.()
          }}
          onAprobar={async () => {
            const ok = await onAprobarSolicitudBodega?.(alertaBodegaSeleccionada)
            if (!ok) return
            setAlertaBodegaSeleccionada(null)
            onActualizarAlertasBodega?.()
          }}
          onDenegar={async () => {
            const ok = await onDenegarSolicitudBodega?.(alertaBodegaSeleccionada)
            if (!ok) return
            limpiarEscaneosPedido(alertaBodegaSeleccionada.id)
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

      {puedeVerHistorialVales ? (
        <>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
            {puedeAdministrar && (
            <button
              type="button"
              onClick={() => {
                setMostrarCargaExcel((actual) => !actual)
                if (!mostrarCargaExcel && mostrarHistorialValesBodega) onToggleHistorialValesBodega?.()
                setMostrarCodigosBarra(false)
              }}
              style={botonAzul}
            >
              Cargar inventario Excel
            </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMostrarCargaExcel(false)
                setMostrarCodigosBarra(false)
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
            {puedeExportarInventario && (
              <button
                type="button"
                onClick={() => {
                  setMostrarCargaExcel(false)
                  if (mostrarHistorialValesBodega) onToggleHistorialValesBodega?.()
                  setMostrarCodigosBarra((actual) => !actual)
                  if (!mostrarCodigosBarra) onActualizarCodigosBarraBodega?.()
                }}
                style={{
                  ...botonAzul,
                  background: mostrarCodigosBarra ? '#0d47a1' : '#455a64',
                  borderColor: mostrarCodigosBarra ? '#64b5f6' : '#607d8b',
                }}
              >
                Códigos de barra
              </button>
            )}
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

          {mostrarCodigosBarra && puedeExportarInventario && (
            <PanelCodigosBarraBodega
              codigos={codigosBarraBodega}
              materialesInventario={materialesInventario}
              cargando={cargandoCodigosBarraBodega}
              guardando={guardandoCodigoBarraBodega}
              onGuardar={onGuardarCodigoBarraBodega}
              onEliminar={onEliminarCodigoBarraBodega}
              onActualizar={onActualizarCodigosBarraBodega}
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

            {puedeOperarBodega && (
              <div style={{ minWidth: '180px', maxWidth: '240px', flex: '1 1 180px' }}>
                <Tarjeta
                  titulo="Material recepcionado"
                  valor={recepcionesBodega.length}
                  onClick={onToggleRecepcionesBodega}
                />
              </div>
            )}

            {puedeOperarBodega && (
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
                {puedeOperarBodega && (
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
            {!puedeAdministrar && !modoSoloBodega && puedeCrearPedido && (
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
                  {soloSolicitarMaterial ? 'Solicitar material' : 'Crear pedido'}
                </button>
                {!soloSolicitarMaterial && (
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
                )}
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

          {puedeOperarBodega && mostrarRecepcionesBodega && (
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

          {puedeOperarBodega && mostrarDespachosBodega && (
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

          {mostrarCrearPedido && (puedeAdministrar || puedeCrearPedido) && (
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

          {mostrarSalidaMaterial && (puedeAdministrar || puedeOperarBodega) && (
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
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
              <thead>
                <tr style={{ background: '#333' }}>
                  <th style={thStyle}>Código bodega</th>
                  <th style={thStyle}>Descripción</th>
                  <th style={thStyle}>Unidad</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Entradas</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Salidas</th>
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
            const estadoVisual = obtenerEstadoVisualPedidoBodega(pedido)
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
                  color: estadoVisual.color,
                  border: `1px solid ${estadoVisual.borde}`,
                  borderRadius: '999px',
                  padding: '5px 10px',
                  whiteSpace: 'nowrap',
                  background: estadoVisual.fondo,
                }}>
                  {estadoVisual.etiqueta}
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
            const estadoVisual = obtenerEstadoVisualPedidoBodega(pedido)
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
                  color: estadoVisual.color,
                  border: `1px solid ${estadoVisual.borde}`,
                  borderRadius: '999px',
                  padding: '5px 10px',
                  whiteSpace: 'nowrap',
                  background: estadoVisual.fondo,
                }}>
                  {estadoVisual.etiqueta}
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

function PanelCodigosBarraBodega({
  codigos = [],
  materialesInventario = [],
  cargando,
  guardando,
  onGuardar,
  onEliminar,
  onActualizar,
}) {
  const [formulario, setFormulario] = useState({
    id: '',
    codigoBarra: '',
    codigoBodega: '',
    descripcion: '',
    cantidadPorEscaneo: '1',
  })
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [mensaje, setMensaje] = useState(null)
  const [mostrarSugerenciasCodigo, setMostrarSugerenciasCodigo] = useState(false)
  const formularioCodigoRef = useRef(null)

  function desplazarAFormularioCodigo() {
    window.requestAnimationFrame(() => {
      formularioCodigoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const filasCodigos = useMemo(() => {
    const inventarioPorCodigo = new Map()
    const codigosPorMaterial = new Map()

    for (const material of materialesInventario) {
      const clave = normalizarBusqueda(material.codigo)
      if (clave) inventarioPorCodigo.set(clave, material)
    }

    for (const codigo of codigos) {
      const clave = normalizarBusqueda(codigo.codigoBodega)
      if (!clave) continue
      const actuales = codigosPorMaterial.get(clave) || []
      actuales.push(codigo)
      codigosPorMaterial.set(clave, actuales)
    }

    const filasInventario = materialesInventario.flatMap((material, indiceInventario) => {
      const clave = normalizarBusqueda(material.codigo)
      const equivalencias = codigosPorMaterial.get(clave) || []
      if (equivalencias.length === 0) {
        return [{
          id: '',
          codigoBodega: material.codigo || '',
          codigoBarra: material.codigo || '',
          descripcion: material.descripcion || '',
          cantidadPorEscaneo: 1,
          estado: 'sin_configurar',
          indiceInventario,
        }]
      }

      return equivalencias.map((item) => ({
        ...item,
        descripcion: material.descripcion || item.descripcion || '',
        estado: normalizarBusqueda(item.codigoBarra) === clave ? 'codigo_bodega' : 'externo',
        indiceInventario,
      }))
    })

    const filasFueraInventario = codigos
      .filter((item) => !inventarioPorCodigo.has(normalizarBusqueda(item.codigoBodega)))
      .map((item) => ({
        ...item,
        estado: 'fuera_inventario',
        indiceInventario: Number.MAX_SAFE_INTEGER,
      }))

    return [...filasInventario, ...filasFueraInventario]
  }, [codigos, materialesInventario])

  const codigosFiltrados = useMemo(() => {
    const texto = normalizarBusqueda(busqueda)
    return filasCodigos.filter((item) => {
      if (filtroEstado !== 'todos' && item.estado !== filtroEstado) return false
      if (!texto) return true
      return normalizarBusqueda(item.codigoBarra).includes(texto) ||
        normalizarBusqueda(item.codigoBodega).includes(texto) ||
        normalizarBusqueda(item.descripcion).includes(texto)
    })
  }, [busqueda, filasCodigos, filtroEstado])

  const codigosInventario = useMemo(
    () => new Set(materialesInventario.map((item) => normalizarBusqueda(item.codigo)).filter(Boolean)),
    [materialesInventario],
  )
  const materialesConCodigoExterno = useMemo(() => new Set(
    codigos
      .filter((item) => (
        codigosInventario.has(normalizarBusqueda(item.codigoBodega)) &&
        normalizarBusqueda(item.codigoBarra) !== normalizarBusqueda(item.codigoBodega)
      ))
      .map((item) => normalizarBusqueda(item.codigoBodega)),
  ).size, [codigos, codigosInventario])
  const materialesConfigurados = useMemo(() => new Set(
    codigos
      .filter((item) => codigosInventario.has(normalizarBusqueda(item.codigoBodega)))
      .map((item) => normalizarBusqueda(item.codigoBodega)),
  ).size, [codigos, codigosInventario])
  const materialesSinConfigurar = Math.max(0, materialesInventario.length - materialesConfigurados)

  function cambiarFormulario(campo, valor) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }))
  }

  function seleccionarMaterial(material) {
    setFormulario((actual) => ({
      ...actual,
      codigoBodega: material.codigo || '',
      descripcion: material.descripcion || '',
    }))
    setMostrarSugerenciasCodigo(false)
  }

  async function guardarActual() {
    setMensaje({ tipo: 'info', texto: formulario.id ? 'Actualizando código de barra...' : 'Guardando código de barra...' })
    const resultado = await onGuardar?.(formulario)
    const ok = resultado === true || resultado?.ok
    if (!ok) {
      const detalle = resultado?.error ? ` Detalle: ${resultado.error}` : ''
      setMensaje({ tipo: 'error', texto: `No se pudo guardar. Revisa permisos RLS de la tabla bodega_codigos_barra.${detalle}` })
      return
    }
    setFormulario({
      id: '',
      codigoBarra: '',
      codigoBodega: '',
      descripcion: '',
      cantidadPorEscaneo: '1',
    })
    setMostrarSugerenciasCodigo(false)
    setMensaje({ tipo: 'ok', texto: formulario.id ? 'Código de barra actualizado correctamente.' : 'Código de barra guardado correctamente.' })
  }

  function editarCodigo(item) {
    setFormulario({
      id: item.id || '',
      codigoBarra: item.codigoBarra || '',
      codigoBodega: item.codigoBodega || '',
      descripcion: item.descripcion || obtenerDescripcionMaterialPorCodigo(item.codigoBodega, materialesInventario) || '',
      cantidadPorEscaneo: String(item.cantidadPorEscaneo || 1),
    })
    setMostrarSugerenciasCodigo(false)
    setMensaje({ tipo: 'info', texto: 'Editando código de barra. Modifica los datos y presiona Actualizar código.' })
    desplazarAFormularioCodigo()
  }

  function configurarCodigoInventario(item) {
    if (item.id) {
      editarCodigo(item)
      return
    }
    setFormulario({
      id: '',
      codigoBarra: item.codigoBodega || '',
      codigoBodega: item.codigoBodega || '',
      descripcion: item.descripcion || '',
      cantidadPorEscaneo: String(item.cantidadPorEscaneo || 1),
    })
    setMostrarSugerenciasCodigo(false)
    setMensaje({
      tipo: 'info',
      texto: 'Configura la cantidad por escaneo. Si el producto tiene un código externo, reemplaza el código de barra antes de guardar.',
    })
    desplazarAFormularioCodigo()
  }

  function cancelarEdicion() {
    setFormulario({
      id: '',
      codigoBarra: '',
      codigoBodega: '',
      descripcion: '',
      cantidadPorEscaneo: '1',
    })
    setMostrarSugerenciasCodigo(false)
    setMensaje(null)
  }

  const sugerencias = obtenerSugerenciasMateriales(
    formulario.codigoBodega || formulario.descripcion,
    materialesInventario,
  )

  return (
    <div style={panelMovimientoStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Códigos de barra</h3>
          <p style={{ color: '#bbb', margin: '4px 0 0', fontSize: '13px' }}>
            {formulario.id ? 'Actualiza la equivalencia seleccionada.' : 'Asocia códigos externos de proveedor al código interno de bodega.'}
          </p>
        </div>
        <button type="button" onClick={onActualizar} style={botonMiniGris}>
          {cargando ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <div ref={formularioCodigoRef} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) minmax(150px, 1fr) minmax(240px, 2fr) minmax(120px, 0.7fr) auto', gap: '10px', alignItems: 'end', marginBottom: '12px', scrollMarginTop: '14px' }}>
        <CampoTexto
          label="Código de barra"
          value={formulario.codigoBarra}
          onChange={(valor) => cambiarFormulario('codigoBarra', valor)}
          placeholder="Escanea o escribe el código"
        />
        <CampoTexto
          label="Código bodega"
          value={formulario.codigoBodega}
          onChange={(valor) => cambiarFormulario('codigoBodega', valor)}
          placeholder="Código interno"
        />
        <label style={{ display: 'grid', gap: '5px', position: 'relative' }}>
          <strong>Material</strong>
          <input
            type="text"
            value={formulario.descripcion}
            onChange={(e) => {
              cambiarFormulario('descripcion', e.target.value)
              setMostrarSugerenciasCodigo(true)
            }}
            onFocus={() => setMostrarSugerenciasCodigo(true)}
            onBlur={() => setMostrarSugerenciasCodigo(false)}
            placeholder="Buscar material"
            style={inputStyle}
          />
          {mostrarSugerenciasCodigo && (formulario.descripcion || formulario.codigoBodega) && sugerencias.length > 0 && (
            <div style={{ ...sugerenciasMaterialStyle, position: 'absolute', top: '70px', left: 0, right: 0, zIndex: 2100 }}>
              {sugerencias.map((material) => (
                <button
                  key={`codigo-barra-${material.codigo}-${material.descripcion}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    seleccionarMaterial(material)
                  }}
                  style={botonSugerenciaMaterialStyle}
                  title={material.descripcion}
                >
                  <span>{material.descripcion}</span>
                  <small style={{ color: '#9fb3c8', fontWeight: 800 }}>{material.codigo}</small>
                </button>
              ))}
            </div>
          )}
        </label>
        <CampoTexto
          label="Cant. por escaneo"
          type="number"
          value={formulario.cantidadPorEscaneo}
          onChange={(valor) => cambiarFormulario('cantidadPorEscaneo', valor)}
          placeholder="1"
        />
        <button
          type="button"
          onClick={guardarActual}
          disabled={guardando || !formulario.codigoBarra.trim() || !formulario.codigoBodega.trim()}
          style={{
            ...botonVerde,
            opacity: guardando || !formulario.codigoBarra.trim() || !formulario.codigoBodega.trim() ? 0.7 : 1,
            cursor: guardando || !formulario.codigoBarra.trim() || !formulario.codigoBodega.trim() ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {guardando ? 'Guardando...' : formulario.id ? 'Actualizar código' : 'Guardar código'}
        </button>
      </div>

      {formulario.id && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <button type="button" onClick={cancelarEdicion} style={botonMiniGris}>
            Cancelar edición
          </button>
        </div>
      )}

      {mensaje && (
        <div
          style={{
            padding: '9px 10px',
            borderRadius: '8px',
            border: `1px solid ${mensaje.tipo === 'ok' ? '#66bb6a' : mensaje.tipo === 'error' ? '#ef5350' : '#607d8b'}`,
            background: mensaje.tipo === 'ok' ? '#14351a' : mensaje.tipo === 'error' ? '#3a1717' : '#263238',
            color: mensaje.tipo === 'ok' ? '#a5d6a7' : mensaje.tipo === 'error' ? '#ff8a80' : '#d7e3ea',
            fontWeight: 800,
            marginBottom: '10px',
          }}
        >
          {mensaje.texto}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        <div style={cardResumenCodigoStyle}><small>Materiales del inventario</small><strong>{materialesInventario.length}</strong></div>
        <div style={cardResumenCodigoStyle}><small>Con código externo</small><strong style={{ color: '#81d4fa' }}>{materialesConCodigoExterno}</strong></div>
        <div style={cardResumenCodigoStyle}><small>Sin configurar</small><strong style={{ color: '#ffe082' }}>{materialesSinConfigurar}</strong></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(190px, 260px)', gap: '10px', marginBottom: '10px' }}>
        <label style={{ display: 'grid', gap: '5px' }}>
          <strong>Buscar material</strong>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código de barra, código bodega o material"
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'grid', gap: '5px' }}>
          <strong>Mostrar</strong>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={inputStyle}>
            <option value="todos">Todos los materiales</option>
            <option value="externo">Código externo</option>
            <option value="codigo_bodega">Código bodega configurado</option>
            <option value="sin_configurar">Sin configurar</option>
            <option value="fuera_inventario">Fuera del inventario</option>
          </select>
        </label>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
          <thead>
            <tr style={{ background: '#333' }}>
              <th style={thStyle}>Código bodega</th>
              <th style={thStyle}>Material</th>
              <th style={thStyle}>Código de lectura</th>
              <th style={{ ...thStyle, width: '170px' }}>Tipo</th>
              <th style={{ ...thStyle, width: '130px', textAlign: 'right' }}>Cant. escaneo</th>
              <th style={{ ...thStyle, width: '170px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {codigosFiltrados.map((item) => (
              <tr key={item.id || `${item.estado}-${item.codigoBarra}-${item.codigoBodega}-${item.indiceInventario}`}>
                <td style={tdStyle}>{item.codigoBodega}</td>
                <td style={tdStyle}>{item.descripcion || obtenerDescripcionMaterialPorCodigo(item.codigoBodega, materialesInventario)}</td>
                <td style={{ ...tdStyle, fontWeight: 900 }}>{item.codigoBarra || item.codigoBodega}</td>
                <td style={tdStyle}>
                  <span style={estiloEstadoCodigo(item.estado)}>{etiquetaEstadoCodigo(item.estado)}</span>
                </td>
                <td style={{ ...tdStyle, width: '130px', textAlign: 'right', fontWeight: 900 }}>{formatearNumero(item.cantidadPorEscaneo || 1)}</td>
                <td style={{ ...tdStyle, width: '170px', textAlign: 'center' }}>
                  <button type="button" onClick={() => configurarCodigoInventario(item)} style={{ ...botonMiniAzul, marginRight: item.id ? '8px' : 0 }}>
                    {item.id ? 'Editar' : 'Configurar'}
                  </button>
                  {item.id && (
                    <button type="button" onClick={() => onEliminar?.(item.id)} style={botonIconoRojo}>
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!cargando && codigosFiltrados.length === 0 && (
        <p style={{ color: '#bbb', marginBottom: 0 }}>No hay materiales que coincidan con la búsqueda o el filtro.</p>
      )}
    </div>
  )
}

function obtenerDescripcionMaterialPorCodigo(codigoBodega, materialesInventario = []) {
  const encontrado = materialesInventario.find((item) => (
    normalizarBusqueda(item.codigo) === normalizarBusqueda(codigoBodega)
  ))
  return encontrado?.descripcion || ''
}

function etiquetaEstadoCodigo(estado) {
  if (estado === 'externo') return 'Código externo'
  if (estado === 'codigo_bodega') return 'Código bodega'
  if (estado === 'fuera_inventario') return 'Fuera del inventario'
  return 'Sin configurar'
}

function estiloEstadoCodigo(estado) {
  const colores = estado === 'externo'
    ? { fondo: '#0d47a1', borde: '#64b5f6', texto: '#bbdefb' }
    : estado === 'codigo_bodega'
      ? { fondo: '#1b5e20', borde: '#66bb6a', texto: '#c8e6c9' }
      : estado === 'fuera_inventario'
        ? { fondo: '#5d4037', borde: '#bcaaa4', texto: '#efebe9' }
        : { fondo: '#4e342e', borde: '#ffb74d', texto: '#ffe0b2' }

  return {
    display: 'inline-block',
    padding: '4px 8px',
    border: `1px solid ${colores.borde}`,
    borderRadius: '999px',
    background: colores.fondo,
    color: colores.texto,
    fontSize: '12px',
    fontWeight: 900,
    whiteSpace: 'nowrap',
  }
}

function DetalleSolicitudBodega({
  alerta,
  entregando,
  materialesInventario = [],
  codigosBarraBodega = [],
  puedeEditar,
  puedeEditarEntregados,
  puedeGestionar,
  puedeAprobar,
  onEditar,
  onActualizarPedido,
  onAprobar,
  onEntregar,
  onDenegar,
  onCerrar,
}) {
  const [editando, setEditando] = useState(false)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [itemsEditados, setItemsEditados] = useState([])
  const [filaSugerenciasEdicion, setFilaSugerenciasEdicion] = useState(null)
  const [textoEscaner, setTextoEscaner] = useState('')
  const [cantidadesEscaneadas, setCantidadesEscaneadas] = useState(() => leerEscaneosPedido(alerta?.id))
  const [mensajeEscaner, setMensajeEscaner] = useState(null)
  const [ajusteEscaneoPendiente, setAjusteEscaneoPendiente] = useState(null)
  const [guardandoAjusteEscaneo, setGuardandoAjusteEscaneo] = useState(false)
  const [indiceCambioMaterial, setIndiceCambioMaterial] = useState(null)
  const [guardandoCambioMaterial, setGuardandoCambioMaterial] = useState(false)
  const [verificandoEntrega, setVerificandoEntrega] = useState(false)
  const inputEscanerRef = useRef(null)
  const esPedido = alerta?.tipo_ingreso === 'pedido_app'
  const estadoPedido = String(alerta?.estado_bodega || '').toLowerCase()
  const solicitado = estadoPedido === 'solicitado'
  const entregado = estadoPedido === 'entregado'
  const denegado = estadoPedido === 'denegado'
  const puedeEditarEstePedido = puedeEditar && esPedido
    && ((!entregado && !denegado) || puedeEditarEntregados)
    && (!solicitado || puedeAprobar)
  const fueModificadoPorBodega = tieneMarcaModificacionBodega(alerta.observacion)
  const itemsPedido = alerta.items || []
  const firmaItems = firmaItemsPedido(itemsPedido, materialesInventario)
  const pedidoObservadoRef = useRef({ id: null, firma: '' })
  const puedeRevisarSolicitud = puedeAprobar && esPedido && solicitado && !entregado && !denegado
  const puedeGestionarEntrega = puedeGestionar && esPedido && !solicitado && !entregado && !denegado
  const requiereEscaneo = puedeGestionarEntrega && !editando && itemsPedido.length > 0
  const puedeCambiarMaterialPedido = requiereEscaneo
  const cambioMaterialActivo = indiceCambioMaterial !== null
  const estadoVisualPedido = obtenerEstadoVisualPedidoBodega(alerta)
  const resumenEscaneo = calcularResumenEscaneoPedido(itemsPedido, cantidadesEscaneadas, materialesInventario)
  const pedidoEscaneadoCompleto = resumenEscaneo.every((fila) => !fila.requiereEscaneo || fila.escaneado >= fila.cantidad)

  useEffect(() => {
    const anterior = pedidoObservadoRef.current
    if (anterior.id === alerta?.id && anterior.firma === firmaItems) return
    const esOtroPedido = anterior.id !== alerta?.id
    pedidoObservadoRef.current = { id: alerta?.id, firma: firmaItems }

    setItemsEditados(itemsPedido.map((item, indice) => ({
      _uid: item.id || crearIdFilaEdicionPedido(`pedido-${alerta?.id || 'sin-id'}-${indice}`),
      id: item.id,
      material_vale: item.material_vale || item.material_balance || '',
      material_balance: item.material_balance || item.material_vale || '',
      cantidad: item.cantidad || '',
    })))
    setCantidadesEscaneadas((actuales) => {
      const base = esOtroPedido ? leerEscaneosPedido(alerta?.id) : actuales
      const conciliadas = conciliarEscaneosPedido(base, itemsPedido, materialesInventario)
      guardarEscaneosPedido(alerta?.id, conciliadas)
      return conciliadas
    })
    if (esOtroPedido) setMensajeEscaner(null)
    else setMensajeEscaner({ tipo: 'info', texto: 'El pedido fue modificado. Se conservaron las lecturas de los materiales vigentes; revisa las cantidades antes de entregar.' })
    setIndiceCambioMaterial(null)
    setAjusteEscaneoPendiente(null)
  }, [alerta?.id, firmaItems, itemsPedido, materialesInventario])

  useEffect(() => {
    if (!requiereEscaneo || ajusteEscaneoPendiente) return undefined

    const enfocar = () => inputEscanerRef.current?.focus()
    enfocar()
    const intervalo = setInterval(enfocar, 1500)
    return () => clearInterval(intervalo)
  }, [requiereEscaneo, ajusteEscaneoPendiente])

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
    const resultado = await onEditar?.(itemsEditados.map(({ _uid, ...item }) => item))
    setGuardandoEdicion(false)
    if (resultado?.ok) setEditando(false)
    else setMensajeEscaner({ tipo: 'error', texto: resultado?.error || 'No se pudo guardar la modificación.' })
  }

  async function procesarEscaneo(valor) {
    if (ajusteEscaneoPendiente || guardandoAjusteEscaneo) return
    const { cantidad, codigo } = interpretarLecturaEscaner(valor)
    if (!codigo) return

    const materialResuelto = resolverMaterialEscaneado(codigo, materialesInventario, codigosBarraBodega)
    if (!materialResuelto) {
      setMensajeEscaner({ tipo: 'error', texto: `Código no reconocido: ${codigo}` })
      return
    }

    if (indiceCambioMaterial !== null) {
      await cambiarMaterialPorEscaneo(indiceCambioMaterial, materialResuelto)
      return
    }

    const itemPedido = buscarItemPedidoPorMaterial(materialResuelto, itemsPedido, materialesInventario)
    if (!itemPedido) {
      setMensajeEscaner({ tipo: 'error', texto: `El material ${materialResuelto.codigo || codigo} no pertenece a este pedido.` })
      return
    }

    const clave = claveItemEscaneoPedido(itemPedido, materialesInventario)
    const filaResumen = resumenEscaneo.find((fila) => fila.clave === clave)
    const solicitado = Number(filaResumen?.cantidad || itemPedido.cantidad || 0)
    const escaneadoActual = Number(cantidadesEscaneadas[clave] || 0)
    const cantidadPorEscaneo = Number(materialResuelto.cantidadPorEscaneo || 1)
    const cantidadTotal = cantidad * cantidadPorEscaneo
    const nuevoTotal = escaneadoActual + cantidadTotal

    if (nuevoTotal > solicitado) {
      setAjusteEscaneoPendiente({
        clave,
        material: itemPedido.material_balance || itemPedido.material_vale,
        solicitado,
        escaneadoActual,
        cantidadTotal,
        nuevoTotal,
        firma: firmaItems,
        idPedido: alerta.id,
      })
      setMensajeEscaner({ tipo: 'info', texto: 'La lectura supera lo solicitado. Confirma el ajuste de cantidad para registrar la entrega real.' })
      return
    }

    setCantidadesEscaneadas((actuales) => {
      const siguientes = { ...actuales, [clave]: nuevoTotal }
      guardarEscaneosPedido(alerta.id, siguientes)
      return siguientes
    })
    setMensajeEscaner({
      tipo: 'ok',
      texto: `OK: ${formatearNumero(cantidadTotal)} x ${itemPedido.material_balance || itemPedido.material_vale}`,
    })
  }

  async function confirmarAjusteEscaneo() {
    const ajuste = ajusteEscaneoPendiente
    if (!ajuste || guardandoAjusteEscaneo) return
    setGuardandoAjusteEscaneo(true)
    try {
      const pedidoActual = await onActualizarPedido?.()
      if (!pedidoActual || pedidoActual.id !== ajuste.idPedido) {
        setMensajeEscaner({ tipo: 'error', texto: 'No se pudo verificar el pedido. Vuelve a intentarlo.' })
        return
      }
      if (String(pedidoActual.estado_bodega || '').toLowerCase() !== estadoPedido
        || firmaItemsPedido(pedidoActual.items || [], materialesInventario) !== ajuste.firma) {
        setAjusteEscaneoPendiente(null)
        setMensajeEscaner({ tipo: 'info', texto: 'El pedido cambió. Revisa las cantidades actualizadas antes de repetir la lectura.' })
        return
      }

      const itemsActualizados = itemsPedido.map((item) => (
        claveItemEscaneoPedido(item, materialesInventario) === ajuste.clave
          ? { ...item, cantidad: ajuste.nuevoTotal }
          : item
      ))
      const resultado = await onEditar?.(itemsActualizados)
      if (!resultado?.ok) {
        setMensajeEscaner({ tipo: 'error', texto: `No se pudo ajustar el pedido: ${resultado?.error || 'Inténtalo nuevamente.'}` })
        return
      }

      setCantidadesEscaneadas((actuales) => {
        const siguientes = { ...actuales, [ajuste.clave]: ajuste.nuevoTotal }
        guardarEscaneosPedido(ajuste.idPedido, siguientes)
        return siguientes
      })
      setAjusteEscaneoPendiente(null)
      setMensajeEscaner({
        tipo: 'ok',
        texto: `Pedido ajustado a ${formatearNumero(ajuste.nuevoTotal)} unidades de ${ajuste.material}. La lectura quedó registrada.`,
      })
    } catch (error) {
      setMensajeEscaner({ tipo: 'error', texto: `No se pudo ajustar el pedido: ${error?.message || 'Error de conexión'}` })
    } finally {
      setGuardandoAjusteEscaneo(false)
    }
  }

  async function entregarPedidoActual() {
    if (entregado || denegado || entregando || verificandoEntrega || editando || guardandoCambioMaterial || cambioMaterialActivo || ajusteEscaneoPendiente || guardandoAjusteEscaneo) return

    setVerificandoEntrega(true)
    let pedidoActual = null
    try {
      pedidoActual = await onActualizarPedido?.()
    } catch (error) {
      console.error('No se pudo verificar el pedido antes de entregarlo', error)
    } finally {
      setVerificandoEntrega(false)
    }
    if (!pedidoActual) {
      setMensajeEscaner({ tipo: 'error', texto: 'No se pudo verificar el pedido actualizado. Inténtalo nuevamente.' })
      return
    }
    if (String(pedidoActual.estado_bodega || '').toLowerCase() !== estadoPedido
      || firmaItemsPedido(pedidoActual.items || [], materialesInventario) !== firmaItems) {
      setMensajeEscaner({ tipo: 'info', texto: 'El pedido cambió mientras escaneabas. Revisa el detalle actualizado antes de confirmar la entrega.' })
      return
    }

    if (requiereEscaneo && !pedidoEscaneadoCompleto) {
      const confirmar = window.confirm(
        'Hay materiales pendientes de lectura por código de barras. ¿Deseas marcar el pedido como entregado de todas formas?'
      )
      if (!confirmar) return
    }

    onEntregar?.({
      omitirConfirmacion: requiereEscaneo && pedidoEscaneadoCompleto,
    })
  }

  async function cambiarMaterialPorEscaneo(indice, materialResuelto) {
    const itemOriginal = itemsPedido[indice]
    if (!itemOriginal) {
      setIndiceCambioMaterial(null)
      setMensajeEscaner({ tipo: 'error', texto: 'No se encontró el material seleccionado para cambiar.' })
      return
    }

    const codigoNuevo = materialResuelto.codigo || ''
    const descripcionNueva = materialResuelto.descripcion || codigoNuevo
    const claveOriginal = claveItemEscaneoPedido(itemOriginal, materialesInventario)
    const claveNueva = normalizarBusqueda(codigoNuevo || descripcionNueva)
    if (!codigoNuevo && !descripcionNueva) {
      setMensajeEscaner({ tipo: 'error', texto: 'El código escaneado no tiene material asociado.' })
      return
    }
    if (claveOriginal === claveNueva) {
      setIndiceCambioMaterial(null)
      setMensajeEscaner({ tipo: 'info', texto: 'El código escaneado corresponde al mismo material. No se modificó el pedido.' })
      return
    }

    const indicesDestino = itemsPedido.flatMap((item, i) => (
      i !== indice && claveItemEscaneoPedido(item, materialesInventario) === claveNueva ? [i] : []
    ))
    const indiceDestino = indicesDestino[0]
    const cantidadDestino = Number(itemOriginal.cantidad || 0)
      + indicesDestino.reduce((total, i) => total + Number(itemsPedido[i].cantidad || 0), 0)

    const confirmado = window.confirm(
      `¿Cambiar "${itemOriginal.material_balance || itemOriginal.material_vale}" por "${descripcionNueva}"?`
      + (indicesDestino.length ? `\n\nYa existe en el pedido: quedará una sola línea con ${formatearNumero(cantidadDestino)} unidades.` : '')
    )
    if (!confirmado) return

    setGuardandoCambioMaterial(true)
    setMensajeEscaner({ tipo: 'info', texto: `Cambiando material por ${descripcionNueva}...` })
    const itemsActualizados = itemsPedido.flatMap((item, i) => {
      if (indicesDestino.length) {
        if (i === indice || (indicesDestino.includes(i) && i !== indiceDestino)) return []
        if (i === indiceDestino) return [{
          ...item,
          material_vale: codigoNuevo || descripcionNueva,
          material_balance: descripcionNueva,
          cantidad: cantidadDestino,
        }]
        return [item]
      }
      return [i === indice
        ? { ...item, material_vale: codigoNuevo || descripcionNueva, material_balance: descripcionNueva }
        : item]
    })
    let resultado
    try {
      resultado = await onEditar?.(itemsActualizados)
    } catch (error) {
      resultado = { ok: false, error: error?.message || 'Error de conexión' }
    } finally {
      setGuardandoCambioMaterial(false)
    }

    if (!resultado?.ok) {
      setMensajeEscaner({ tipo: 'error', texto: `No se pudo cambiar el material: ${resultado?.error || 'No se pudo guardar la modificación.'}` })
      return
    }

    setCantidadesEscaneadas((actuales) => {
      const siguiente = { ...actuales }
      delete siguiente[claveOriginal]
      guardarEscaneosPedido(alerta.id, siguiente)
      return siguiente
    })
    setIndiceCambioMaterial(null)
    setMensajeEscaner({
      tipo: 'ok',
      texto: indicesDestino.length
        ? `Material cambiado a ${descripcionNueva}. Se sumaron las cantidades y se conservó el escaneo previo de ${descripcionNueva}.`
        : `Material cambiado a ${descripcionNueva}. Sólo se reinició el escaneo de ese material.`,
    })
  }

  function activarCambioMaterial(indice) {
    setIndiceCambioMaterial(indice)
    setMensajeEscaner({ tipo: 'info', texto: `Cambio activo: escanea el material que entregarás para reemplazar "${itemsPedido[indice]?.material_balance || itemsPedido[indice]?.material_vale}".` })
    setTimeout(() => inputEscanerRef.current?.focus(), 0)
  }

  function cancelarCambioMaterial() {
    setIndiceCambioMaterial(null)
    setMensajeEscaner({ tipo: 'info', texto: 'Cambio de material cancelado. Puedes seguir escaneando el pedido normalmente.' })
    setTimeout(() => inputEscanerRef.current?.focus(), 0)
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
            {esPedido && (
              <span style={{ display: 'inline-block', marginTop: '8px', padding: '3px 9px', borderRadius: '999px', color: estadoVisualPedido.color, border: `1px solid ${estadoVisualPedido.borde}`, background: estadoVisualPedido.fondo, fontWeight: 800 }}>
                Estado: {estadoVisualPedido.etiqueta}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {puedeEditarEstePedido && !editando && (
              <button type="button" onClick={() => setEditando(true)} style={botonMiniAzul}>
                {puedeGestionarEntrega ? 'Ajustar cantidades' : 'Editar'}
              </button>
            )}
            <button type="button" onClick={onCerrar} style={botonMiniGris}>
              Cerrar
            </button>
          </div>
        </div>

        {puedeGestionar && esPedido && solicitado && (
          <p style={{ color: '#90caf9', margin: '0 0 12px' }}>
            Este pedido espera aprobación de admin u operador. Bodega podrá cambiar y escanear materiales cuando pase a Pendiente.
          </p>
        )}
        {puedeGestionar && esPedido && denegado && (
          <p style={{ color: '#ef9a9a', margin: '0 0 12px' }}>
            Este pedido fue denegado. No se pueden cambiar ni entregar sus materiales.
          </p>
        )}
        {editando && puedeGestionarEntrega && (
          <p style={{ color: '#bbdefb', margin: '0 0 12px' }}>
            Ajusta la columna Cantidad a lo que entregarás y presiona Guardar edición. Las lecturas ya realizadas de los materiales vigentes se conservan.
          </p>
        )}

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

        {requiereEscaneo && (
          <div style={panelEscanerPedidoStyle}>
            <label style={{ display: 'grid', gap: '5px', flex: '1 1 320px' }}>
              <strong>Escáner activo</strong>
              <input
                ref={inputEscanerRef}
                type="text"
                value={textoEscaner}
                disabled={Boolean(ajusteEscaneoPendiente) || guardandoAjusteEscaneo}
                onChange={(e) => setTextoEscaner(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  procesarEscaneo(textoEscaner)
                  setTextoEscaner('')
                  if (!ajusteEscaneoPendiente) setTimeout(() => inputEscanerRef.current?.focus(), 0)
                }}
                placeholder="Escanea código o escribe cantidad*código, ej: 5*7801234567890"
                style={inputStyle}
              />
              <small style={{ color: '#bbb' }}>
                Puedes escanear directo. La cantidad se calcula como multiplicador × cantidad por escaneo. Ej: 3*código.
              </small>
              {cambioMaterialActivo && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <small style={{ color: '#ffcc80', fontWeight: 900 }}>
                    Cambiando: {itemsPedido[indiceCambioMaterial]?.material_balance || itemsPedido[indiceCambioMaterial]?.material_vale}
                  </small>
                  <button
                    type="button"
                    onClick={cancelarCambioMaterial}
                    disabled={guardandoCambioMaterial}
                    style={{
                      ...botonMiniGris,
                      borderColor: '#ffcc80',
                      color: '#ffcc80',
                      opacity: guardandoCambioMaterial ? 0.7 : 1,
                    }}
                  >
                    Cancelar cambio
                  </button>
                </div>
              )}
            </label>
            <div style={{ flex: '1 1 260px', alignSelf: 'stretch', display: 'grid', alignItems: 'center' }}>
              {mensajeEscaner ? (
                <div
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: `1px solid ${mensajeEscaner.tipo === 'ok' ? '#66bb6a' : mensajeEscaner.tipo === 'error' ? '#ef5350' : '#607d8b'}`,
                    background: mensajeEscaner.tipo === 'ok' ? '#14351a' : mensajeEscaner.tipo === 'error' ? '#3a1717' : '#263238',
                    color: mensajeEscaner.tipo === 'ok' ? '#a5d6a7' : mensajeEscaner.tipo === 'error' ? '#ff8a80' : '#d7e3ea',
                    fontWeight: 800,
                  }}
                >
                  {mensajeEscaner.texto}
                </div>
              ) : (
                <div style={{ color: '#bbb', fontWeight: 700 }}>
                  Esperando lectura...
                </div>
              )}
            </div>
          </div>
        )}

        {requiereEscaneo && ajusteEscaneoPendiente && (
          <div
            role="dialog"
            aria-label="Confirmar cantidad escaneada"
            style={{ padding: '16px', marginBottom: '14px', border: '2px solid #ffb74d', borderRadius: '10px', background: '#30251b' }}
          >
            <strong style={{ display: 'block', marginBottom: '8px', color: '#ffcc80' }}>Confirmar cantidad entregada</strong>
            <p style={{ margin: '0 0 8px' }}>{ajusteEscaneoPendiente.material}</p>
            <p style={{ margin: '0 0 12px', color: '#eee' }}>
              Pedido: {formatearNumero(ajusteEscaneoPendiente.solicitado)} · Ya escaneado: {formatearNumero(ajusteEscaneoPendiente.escaneadoActual)} · Esta lectura: {formatearNumero(ajusteEscaneoPendiente.cantidadTotal)}.
              {' '}Si entregas la bolsa completa, el pedido aumentará a <strong>{formatearNumero(ajusteEscaneoPendiente.nuevoTotal)}</strong> unidades.
              Esa será la cantidad descontada del inventario al confirmar la entrega.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={guardandoAjusteEscaneo}
                onClick={confirmarAjusteEscaneo}
                style={{ ...botonVerde, opacity: guardandoAjusteEscaneo ? 0.7 : 1 }}
              >
                {guardandoAjusteEscaneo ? 'Guardando...' : `Sí, ajustar a ${formatearNumero(ajusteEscaneoPendiente.nuevoTotal)} y registrar lectura`}
              </button>
              <button
                type="button"
                disabled={guardandoAjusteEscaneo}
                onClick={() => {
                  setAjusteEscaneoPendiente(null)
                  setMensajeEscaner({ tipo: 'info', texto: 'Lectura cancelada. El pedido y el inventario no cambiaron.' })
                }}
                style={botonMiniGris}
              >
                Cancelar lectura
              </button>
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '190px' }} />
              <col />
              <col style={{ width: '130px' }} />
              {puedeCambiarMaterialPedido && <col style={{ width: '120px' }} />}
              {requiereEscaneo && <col style={{ width: '150px' }} />}
              {editando && <col style={{ width: '82px' }} />}
            </colgroup>
            <thead>
              <tr style={{ background: '#333' }}>
                <th style={thStyle}>Código</th>
                <th style={thStyle}>Material</th>
                <th style={{ ...thStyle, width: '130px', textAlign: 'right' }}>Cantidad</th>
                {puedeCambiarMaterialPedido && <th style={{ ...thStyle, width: '120px', textAlign: 'center' }}>Cambiar</th>}
                {requiereEscaneo && <th style={{ ...thStyle, width: '150px', textAlign: 'right' }}>Escaneado</th>}
                {editando && <th style={{ ...thStyle, width: '82px', textAlign: 'center' }}>Quitar</th>}
              </tr>
            </thead>
            <tbody>
              {(editando ? itemsEditados : (alerta.items || [])).map((item, indice) => {
                const codigo = editando ? (item.material_vale || '') : obtenerCodigoMaterialPedido(item, materialesInventario)
                const filaEscaneo = requiereEscaneo
                  ? resumenEscaneo.find((fila) => fila.clave === claveItemEscaneoPedido(item, materialesInventario))
                  : null
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
                    {puedeCambiarMaterialPedido && (
                      <td style={{ ...tdStyle, width: '120px', textAlign: 'center' }}>
                        <button
                          type="button"
                          disabled={guardandoCambioMaterial}
                          onClick={() => (
                            indiceCambioMaterial === indice
                              ? cancelarCambioMaterial()
                              : activarCambioMaterial(indice)
                          )}
                          title={indiceCambioMaterial === indice ? 'Cancelar cambio de este material' : 'Escanear material alternativo para reemplazar este ítem'}
                          style={{
                            ...botonMiniAzul,
                            opacity: guardandoCambioMaterial ? 0.7 : 1,
                            borderColor: indiceCambioMaterial === indice ? '#ffcc80' : botonMiniAzul.border,
                            background: indiceCambioMaterial === indice ? '#ef6c00' : botonMiniAzul.background,
                          }}
                        >
                          {indiceCambioMaterial === indice ? 'Cancelar' : 'Cambiar'}
                        </button>
                      </td>
                    )}
                    {requiereEscaneo && (
                      <td
                        style={{
                          ...tdStyle,
                          width: '150px',
                          textAlign: 'right',
                          fontWeight: 900,
                          color: !filaEscaneo?.requiereEscaneo || Number(filaEscaneo?.escaneado || 0) >= Number(filaEscaneo?.cantidad || 0) ? '#66bb6a' : '#ffcc80',
                        }}
                      >
                        {filaEscaneo?.requiereEscaneo
                          ? `${formatearNumero(filaEscaneo?.escaneado || 0)} / ${formatearNumero(filaEscaneo?.cantidad || item.cantidad || 0)}`
                          : 'No requiere'}
                      </td>
                    )}
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
          {puedeRevisarSolicitud && !editando && (
            <>
              <button
                type="button"
                disabled={entregando || denegado || guardandoCambioMaterial}
                onClick={onDenegar}
                style={{
                  ...botonRojo,
                  opacity: entregando || denegado || guardandoCambioMaterial ? 0.7 : 1,
                  cursor: entregando || denegado || guardandoCambioMaterial ? 'not-allowed' : 'pointer',
                }}
              >
                {denegado ? 'Solicitud denegada' : 'Denegar solicitud'}
              </button>
              <button
                type="button"
                disabled={entregando || denegado || guardandoCambioMaterial}
                onClick={onAprobar}
                style={{
                  ...botonVerde,
                  opacity: entregando || denegado || guardandoCambioMaterial ? 0.7 : 1,
                  cursor: entregando || denegado || guardandoCambioMaterial ? 'not-allowed' : 'pointer',
                }}
              >
                {entregando ? 'Aprobando...' : 'Aprobar pedido'}
              </button>
            </>
          )}
          {puedeGestionarEntrega && (
            <>
              <button
                type="button"
                disabled={entregando || entregado || denegado || editando || guardandoCambioMaterial || cambioMaterialActivo || Boolean(ajusteEscaneoPendiente) || guardandoAjusteEscaneo}
                onClick={onDenegar}
                style={{
                  ...botonRojo,
                  opacity: entregando || entregado || denegado || editando || guardandoCambioMaterial || cambioMaterialActivo || ajusteEscaneoPendiente || guardandoAjusteEscaneo ? 0.7 : 1,
                  cursor: entregando || entregado || denegado || editando || guardandoCambioMaterial || cambioMaterialActivo || ajusteEscaneoPendiente || guardandoAjusteEscaneo ? 'not-allowed' : 'pointer',
                }}
              >
                {denegado ? 'Pedido denegado' : 'Denegar pedido'}
              </button>
              <button
                type="button"
                disabled={entregando || verificandoEntrega || entregado || denegado || editando || guardandoCambioMaterial || cambioMaterialActivo || Boolean(ajusteEscaneoPendiente) || guardandoAjusteEscaneo}
                onClick={entregarPedidoActual}
                style={{
                  ...botonVerde,
                  opacity: entregando || verificandoEntrega || entregado || denegado || editando || guardandoCambioMaterial || cambioMaterialActivo || ajusteEscaneoPendiente || guardandoAjusteEscaneo ? 0.7 : 1,
                  cursor: entregando || verificandoEntrega || entregado || denegado || editando || guardandoCambioMaterial || cambioMaterialActivo || ajusteEscaneoPendiente || guardandoAjusteEscaneo ? 'not-allowed' : 'pointer',
                }}
              >
                {denegado ? 'Pedido denegado' : entregado ? 'Pedido ya entregado' : entregando ? 'Descontando...' : verificandoEntrega ? 'Verificando...' : 'Pedido entregado'}
              </button>
            </>
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

function interpretarLecturaEscaner(valor = '') {
  const lectura = String(valor || '').trim()
  if (!lectura) return { cantidad: 0, codigo: '' }

  const conMultiplicadorInicio = lectura.match(/^(\d+(?:[.,]\d+)?)\s*\*\s*(.+)$/)
  if (conMultiplicadorInicio) {
    return {
      cantidad: Math.max(1, Math.floor(Number(conMultiplicadorInicio[1].replace(',', '.')) || 1)),
      codigo: conMultiplicadorInicio[2].trim(),
    }
  }

  const conMultiplicadorFinal = lectura.match(/^(.+?)\s*\*\s*(\d+(?:[.,]\d+)?)$/)
  if (conMultiplicadorFinal) {
    return {
      cantidad: Math.max(1, Math.floor(Number(conMultiplicadorFinal[2].replace(',', '.')) || 1)),
      codigo: conMultiplicadorFinal[1].trim(),
    }
  }

  return { cantidad: 1, codigo: lectura }
}

function resolverMaterialEscaneado(codigoLeido, materialesInventario = [], codigosBarraBodega = []) {
  const codigoNormalizado = normalizarBusqueda(codigoLeido)
  if (!codigoNormalizado) return null

  const equivalencia = codigosBarraBodega.find((item) => (
    normalizarBusqueda(item.codigoBarra) === codigoNormalizado
  ))
  if (equivalencia?.codigoBodega) {
    const materialPorEquivalencia = materialesInventario.find((material) => (
      normalizarBusqueda(material.codigo) === normalizarBusqueda(equivalencia.codigoBodega)
    ))

    return {
      ...(materialPorEquivalencia || {
        codigo: equivalencia.codigoBodega,
        descripcion: equivalencia.descripcion || '',
      }),
      cantidadPorEscaneo: Number(equivalencia.cantidadPorEscaneo || 1),
    }
  }

  const materialPorCodigoBodega = materialesInventario.find((material) => (
    normalizarBusqueda(material.codigo) === codigoNormalizado
  ))
  return materialPorCodigoBodega ? { ...materialPorCodigoBodega, cantidadPorEscaneo: 1 } : null
}

function buscarItemPedidoPorMaterial(material, itemsPedido = [], materialesInventario = []) {
  const codigoMaterial = normalizarBusqueda(material?.codigo)
  const descripcionMaterial = normalizarBusqueda(material?.descripcion)

  return itemsPedido.find((item) => {
    const codigoItem = normalizarBusqueda(obtenerCodigoMaterialPedido(item, materialesInventario))
    const textoCodigoItem = normalizarBusqueda(item.material_vale)
    const textoMaterialItem = normalizarBusqueda(item.material_balance || item.material_vale)

    return (
      (codigoMaterial && (codigoItem === codigoMaterial || textoCodigoItem === codigoMaterial || textoMaterialItem === codigoMaterial)) ||
      (descripcionMaterial && textoMaterialItem === descripcionMaterial)
    )
  })
}

function claveItemEscaneoPedido(item = {}, materialesInventario = []) {
  return normalizarBusqueda(obtenerCodigoMaterialPedido(item, materialesInventario))
    || normalizarBusqueda(item.material_vale)
    || normalizarBusqueda(item.material_balance)
}

function firmaItemsPedido(items = [], materialesInventario = []) {
  return JSON.stringify(items.map((item) => [
    claveItemEscaneoPedido(item, materialesInventario),
    normalizarBusqueda(item.material_vale),
    normalizarBusqueda(item.material_balance),
    Number(item.cantidad || 0),
  ].join('|')).sort())
}

function conciliarEscaneosPedido(escaneos = {}, items = [], materialesInventario = []) {
  const siguientes = {}
  for (const item of items) {
    const clave = claveItemEscaneoPedido(item, materialesInventario)
    const escaneado = Number(escaneos[clave] || 0)
    const solicitado = Number(item.cantidad || 0)
    if (clave && escaneado > 0 && solicitado > 0) {
      siguientes[clave] = Math.min(escaneado, solicitado)
    }
  }
  return siguientes
}

function claveEscaneosGuardadosPedido(id) {
  return `bodega-escaneos-pedido:${id}`
}

function leerEscaneosPedido(id) {
  if (!id) return {}
  try {
    return JSON.parse(sessionStorage.getItem(claveEscaneosGuardadosPedido(id)) || '{}') || {}
  } catch {
    return {}
  }
}

function guardarEscaneosPedido(id, escaneos) {
  if (!id) return
  try {
    sessionStorage.setItem(claveEscaneosGuardadosPedido(id), JSON.stringify(escaneos))
  } catch {
    // El escaneo sigue funcionando en memoria si el navegador restringe el almacenamiento.
  }
}

function limpiarEscaneosPedido(id) {
  if (!id) return
  try {
    sessionStorage.removeItem(claveEscaneosGuardadosPedido(id))
  } catch {
    // El almacenamiento puede estar deshabilitado en este navegador.
  }
}

function calcularResumenEscaneoPedido(itemsPedido = [], cantidadesEscaneadas = {}, materialesInventario = []) {
  return itemsPedido.map((item) => {
    const clave = claveItemEscaneoPedido(item, materialesInventario)
    const codigo = obtenerCodigoMaterialPedido(item, materialesInventario)
    return {
      clave,
      cantidad: Number(item.cantidad || 0),
      escaneado: Number(cantidadesEscaneadas[clave] || 0),
      requiereEscaneo: esCodigoEscaneable(codigo),
    }
  })
}

function esCodigoEscaneable(codigo) {
  const limpio = String(codigo || '').trim()
  return Boolean(limpio && limpio !== '-' && normalizarBusqueda(limpio) !== 'sin codigo')
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
    <div className="bodega-panel-crear-pedido" style={panelMovimientoStyle}>
      <div className="bodega-panel-header" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Crear pedido de material</h3>
        <button type="button" onClick={onCerrar} style={botonMiniGris}>
          Cerrar
        </button>
      </div>

      <div className="bodega-grid-pedido" style={gridPedidoStyle}>
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
        <button className="bodega-boton-secundario-movil" type="button" onClick={onAgregarMaterial} style={botonGris}>
          + Agregar material
        </button>
        <button
          className="bodega-boton-principal-movil"
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
      <div className="bodega-tabla-movimiento-wrap" style={{ overflowX: 'auto' }}>
        <table className="bodega-tabla-movimiento" style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse' }}>
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
                <td data-label="Código" style={tdStyle}>
                  <input
                    type="text"
                    value={fila.codigo}
                    onChange={(e) => onCambiarMaterial(indice, 'codigo', e.target.value)}
                    style={inputTablaStyle}
                  />
                </td>
                <td data-label="Material" style={tdStyle}>
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
                <td data-label={mostrarStock ? 'Stock' : 'Unidad'} style={tdStyle}>
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
                <td data-label="Cantidad" style={{ ...tdStyle, textAlign: 'right' }}>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={fila.cantidad}
                    onChange={(e) => onCambiarMaterial(indice, 'cantidad', e.target.value)}
                    style={{ ...inputTablaStyle, textAlign: 'right' }}
                  />
                </td>
                <td data-label="Quitar" style={{ ...tdStyle, textAlign: 'center' }}>
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

function obtenerEstadoVisualPedidoBodega(pedido = {}) {
  const estado = String(pedido.estado_bodega || '').toLowerCase()

  if (estado === 'solicitado') {
    return {
      etiqueta: 'Solicitado',
      color: '#90caf9',
      borde: '#1976d2',
      fondo: '#102b45',
    }
  }

  if (estado === 'entregado') {
    return {
      etiqueta: 'Entregado',
      color: '#66bb6a',
      borde: '#2e7d32',
      fondo: '#15351c',
    }
  }

  if (estado === 'denegado') {
    return {
      etiqueta: 'Denegado',
      color: '#ef9a9a',
      borde: '#c62828',
      fondo: '#3b1111',
    }
  }

  return {
    etiqueta: 'Pendiente',
    color: '#ffcc80',
    borde: '#f9a825',
    fondo: '#3a2b10',
  }
}

function limpiarObservacionSolicitudBodega(observacion = '') {
  return String(observacion || '')
    .split('|')
    .map((parte) => parte.trim())
    .filter((parte) => parte && normalizarBusqueda(parte) !== 'pedido generado desde app')
    .filter((parte) => !normalizarBusqueda(parte).startsWith('modificado por bodega'))
    .filter((parte) => !normalizarBusqueda(parte).startsWith('revision'))
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

const panelEscanerPedidoStyle = {
  display: 'flex',
  gap: '12px',
  alignItems: 'stretch',
  flexWrap: 'wrap',
  padding: '12px',
  border: '1px solid #455a64',
  borderRadius: '10px',
  background: '#1b2a30',
  marginBottom: '12px',
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

const cardResumenCodigoStyle = {
  display: 'grid',
  gap: '5px',
  padding: '11px 12px',
  border: '1px solid #546e7a',
  borderRadius: '8px',
  background: '#263238',
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
