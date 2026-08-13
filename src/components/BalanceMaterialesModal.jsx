import { useState } from 'react'
import { compilarTrazabilidadMaterialesPorGrupo } from '../services/trazabilidadMaterialesService'

function BalanceMaterialesModal({
  rango,
  fecha,
  cargando,
  filas,
  registrosProtocolos = [],
  itemsVales = [],
  trazabilidadSolicitantes = [],
  solicitantesDisponibles = [],
  configMateriales = {},
  materialesCatalogados = [],
  catalogoPrecios = [],
  equivalenciasMateriales = [],
  preciosMateriales = {},
  preciosCompraMateriales = {},
  lineasDisponibles = [],
  formatearPrecio,
  onCambiarRango,
  onCambiarFecha,
  onActualizar,
  onActualizarConfigMaterial,
  onCerrar,
  onClickFondo,
}) {
  const [mostrarReutilizados, setMostrarReutilizados] = useState(false)
  const [mostrarPorSolicitante, setMostrarPorSolicitante] = useState(false)
  const [mostrarPorGrupo, setMostrarPorGrupo] = useState(false)
  const [solicitantesGrupo, setSolicitantesGrupo] = useState([])
  const [lineasGrupo, setLineasGrupo] = useState([])
  const clavesMaterialesCatalogados = new Set(materialesCatalogados.map(normalizarTextoBalance))
  materialesCatalogados.forEach((material) => clavesMaterialesCatalogados.add(normalizarTextoBalanceFlexible(material)))
  const preciosVentaPorMaterial = construirMapaPreciosBalance(catalogoPrecios, preciosMateriales, 'precio')
  const preciosCompraPorMaterial = construirMapaPreciosBalance(catalogoPrecios, preciosCompraMateriales, 'precioCompra')
  const preciosVentaPorId = construirMapaPreciosBalancePorId(catalogoPrecios, preciosMateriales, 'precio')
  const preciosCompraPorId = construirMapaPreciosBalancePorId(catalogoPrecios, preciosCompraMateriales, 'precioCompra')
  const nombresCatalogoPorMaterial = construirMapaNombresCatalogoBalance(catalogoPrecios)
  const nombresCatalogoPorId = construirMapaNombresCatalogoBalancePorId(catalogoPrecios)
  const obtenerNombreCatalogo = (fila) => {
    if (fila.idArt && nombresCatalogoPorId[String(fila.idArt)]) {
      return nombresCatalogoPorId[String(fila.idArt)]
    }

    const candidatos = [
      configMateriales[fila.clave]?.nombreVisible,
      fila.materialVisible,
      fila.material,
      fila.materialOriginal,
      fila.clave,
    ]

    for (const candidato of candidatos) {
      const nombre = nombresCatalogoPorMaterial[normalizarTextoBalance(candidato)]
        || nombresCatalogoPorMaterial[normalizarTextoBalanceFlexible(candidato)]
      if (nombre) return nombre
    }

    return configMateriales[fila.clave]?.nombreVisible || fila.material
  }
  const obtenerPrecioCatalogo = (fila, mapaPrecios, respaldo = 0) => {
    const mapaPorId = mapaPrecios === preciosCompraPorMaterial ? preciosCompraPorId : preciosVentaPorId
    if (fila.idArt && Number(normalizarPrecioManual(mapaPorId[String(fila.idArt)])) > 0) {
      return normalizarPrecioManual(mapaPorId[String(fila.idArt)])
    }

    const candidatos = [
      configMateriales[fila.clave]?.nombreVisible,
      fila.materialVisible,
      fila.material,
      fila.materialOriginal,
      fila.clave,
    ]

    for (const candidato of candidatos) {
      const valor = mapaPrecios[normalizarTextoBalance(candidato)]
        || mapaPrecios[normalizarTextoBalanceFlexible(candidato)]
      if (Number(normalizarPrecioManual(valor)) > 0) return normalizarPrecioManual(valor)
    }

    return normalizarPrecioManual(respaldo)
  }
  const filasBalance = filas.map((fila) => {
    const materialVisible = obtenerNombreCatalogo(fila)
    const valorVenta = obtenerPrecioCatalogo(
      { ...fila, materialVisible },
      preciosVentaPorMaterial,
      fila.precioUnitarioNuevo || 0
    )
    const valorCompra = obtenerPrecioCatalogo(
      { ...fila, materialVisible },
      preciosCompraPorMaterial,
      fila.precioUnitarioCompra || 0
    )
    const valorCompraNumero = normalizarPrecioManual(valorCompra)
    const estaEnCatalogoPrecios = clavesMaterialesCatalogados.has(normalizarTextoBalance(materialVisible))
      || clavesMaterialesCatalogados.has(normalizarTextoBalanceFlexible(materialVisible))
      || clavesMaterialesCatalogados.has(normalizarTextoBalance(fila.material))
      || clavesMaterialesCatalogados.has(normalizarTextoBalanceFlexible(fila.material))

    return {
      ...fila,
      materialVisible,
      noCatalogado: fila.noCatalogado && !estaEnCatalogoPrecios,
      instalado: Number(fila.nuevo || 0),
      valorVenta,
      valorCompra,
      valorCompraNumero,
      retirado: Number(fila.retirado || 0),
      balance: (Number(valorVenta || 0) * Number(fila.nuevo || 0)) - (valorCompraNumero * Number(fila.retirado || 0)),
    }
  })
  const balanceTotal = filasBalance.reduce(
    (total, fila) => total + Number(fila.balance || 0),
    0
  )
  const filasReutilizadas = filas
    .filter((fila) => Number(fila.reutilizado || 0) > 0)
    .map((fila) => {
      const materialVisible = obtenerNombreCatalogo(fila)
      const estaEnCatalogoPrecios = clavesMaterialesCatalogados.has(normalizarTextoBalance(materialVisible))
        || clavesMaterialesCatalogados.has(normalizarTextoBalanceFlexible(materialVisible))
        || clavesMaterialesCatalogados.has(normalizarTextoBalance(fila.material))
        || clavesMaterialesCatalogados.has(normalizarTextoBalanceFlexible(fila.material))

      return {
        ...fila,
        material: materialVisible,
        materialVisible,
        noCatalogado: fila.noCatalogado && !estaEnCatalogoPrecios,
        cantidadReutilizada: Number(fila.reutilizado || 0),
        valorUnitarioReutilizado: Number(fila.precioUnitarioReutilizado || 0),
        valorTotalReutilizado: Number(fila.valorReutilizado || 0),
      }
    })
  const totalReutilizados = filasReutilizadas.reduce(
    (total, fila) => total + Number(fila.cantidadReutilizada || 0),
    0
  )
  const totalValorReutilizados = filasReutilizadas.reduce(
    (total, fila) => total + Number(fila.valorTotalReutilizado || 0),
    0
  )
  const indicadorBalance = mostrarReutilizados ? totalValorReutilizados : balanceTotal
  const colorBalanceTotal = balanceTotal > 0 ? '#66bb6a' : balanceTotal < 0 ? '#ff5252' : 'white'
  const alertasCriticas = trazabilidadSolicitantes.filter((fila) => fila.estado === 'critico' && fila.diferencia > 0).length
  const opcionesSolicitantesGrupo = obtenerOpcionesSolicitantesGrupo(itemsVales, solicitantesDisponibles)
  const trazabilidadGrupo = compilarTrazabilidadMaterialesPorGrupo({
    registros: registrosProtocolos,
    vales: itemsVales,
    catalogoPrecios,
    solicitantesDisponibles,
    solicitantesSeleccionados: solicitantesGrupo,
    lineasSeleccionadas: lineasGrupo,
    equivalenciasMateriales,
    normalizarTextoComparacion: normalizarTextoBalance,
  })
  const alertasGrupo = trazabilidadGrupo.filter((fila) => fila.estado === 'critico' && fila.diferencia > 0).length

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
        maxWidth: '980px',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Balance materiales</h2>
          <p style={{ color: '#ccc', margin: '6px 0 0' }}>
            Compilado de materiales cobrados en protocolos.
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          style={{
            padding: '9px 14px',
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

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
        <select
          value={rango}
          onChange={(e) => onCambiarRango(e.target.value)}
          style={{ padding: '8px', fontWeight: 700 }}
          title="Cambiar rango"
        >
          <option value="dia">Dia</option>
          <option value="semana">Semana</option>
          <option value="mes">Mes</option>
        </select>
        <input
          type={rango === 'dia' ? 'date' : rango === 'semana' ? 'week' : 'month'}
          value={fecha}
          onChange={(e) => onCambiarFecha(e.target.value)}
          style={{ padding: '8px' }}
        />
        <button
          type="button"
          onClick={onActualizar}
          disabled={cargando}
          style={{
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid #777',
            background: '#1565c0',
            color: 'white',
            cursor: cargando ? 'not-allowed' : 'pointer',
            fontWeight: 700,
          }}
        >
          {cargando ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '14px',
        }}
      >
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#263238', border: '1px solid #546e7a', fontWeight: 800 }}>
          {mostrarReutilizados ? filasReutilizadas.length : filasBalance.length} materiales
        </div>
        <button
          type="button"
          onClick={() => {
            setMostrarReutilizados((actual) => !actual)
            setMostrarPorSolicitante(false)
            setMostrarPorGrupo(false)
          }}
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: mostrarReutilizados ? '#0d47a1' : '#263238',
            border: '1px solid #64b5f6',
            color: 'white',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Reutilizados ({totalReutilizados})
        </button>
        <button
          type="button"
          onClick={() => {
            setMostrarPorSolicitante((actual) => !actual)
            setMostrarReutilizados(false)
            setMostrarPorGrupo(false)
          }}
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: mostrarPorSolicitante ? '#6d1b1b' : '#263238',
            border: '1px solid #ff8a80',
            color: 'white',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Por solicitante ({alertasCriticas} alertas)
        </button>
        <button
          type="button"
          onClick={() => {
            setMostrarPorGrupo((actual) => !actual)
            setMostrarReutilizados(false)
            setMostrarPorSolicitante(false)
          }}
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: mostrarPorGrupo ? '#4a148c' : '#263238',
            border: '1px solid #ce93d8',
            color: 'white',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Por grupo ({alertasGrupo} alertas)
        </button>
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#1b5e20', border: '1px solid #66bb6a', fontWeight: 800, color: mostrarReutilizados ? 'white' : colorBalanceTotal }}>
          Balance: {formatearPrecio(indicadorBalance)}
        </div>
      </div>

      {filas.length === 0 && !cargando ? (
        <p style={{ color: '#ccc' }}>No hay materiales cobrados en el rango seleccionado.</p>
      ) : (
        mostrarPorGrupo ? (
          <VistaTrazabilidadGrupo
            filas={trazabilidadGrupo}
            solicitantes={opcionesSolicitantesGrupo}
            lineas={lineasDisponibles}
            solicitantesSeleccionados={solicitantesGrupo}
            lineasSeleccionadas={lineasGrupo}
            onCambiarSolicitantes={setSolicitantesGrupo}
            onCambiarLineas={setLineasGrupo}
            formatearPrecio={formatearPrecio}
          />
        ) : mostrarPorSolicitante ? (
          <TablaTrazabilidadSolicitantes
            filas={trazabilidadSolicitantes}
            formatearPrecio={formatearPrecio}
          />
        ) : mostrarReutilizados ? (
          <TablaMaterialesReutilizados
            filas={filasReutilizadas}
            tituloVacio="No hay material reutilizado cobrado en el rango seleccionado."
            formatearPrecio={formatearPrecio}
          />
        ) : (
          <TablaBalanceMateriales
            filas={filasBalance}
            catalogoPrecios={catalogoPrecios}
            tituloVacio="No hay materiales cobrados en el rango seleccionado."
            formatearPrecio={formatearPrecio}
            onCambiarNombreMaterial={(clave, valor) => {
              onActualizarConfigMaterial(clave, { nombreVisible: valor })
            }}
          />
        )
      )}
    </div>
  )
}

function TablaMaterialesReutilizados({
  filas,
  tituloVacio,
  formatearPrecio,
}) {
  if (filas.length === 0) {
    return <p style={{ color: '#ccc' }}>{tituloVacio}</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
        <thead>
          <tr style={{ background: '#333' }}>
            <th style={thStyle}>Material</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>$ unitario</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Reutilizado</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Valor total</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.clave}>
              <td style={{ ...tdStyle, fontWeight: 700 }}>
                {fila.material}
                {fila.noCatalogado && (
                  <span style={{ display: 'inline-block', marginLeft: '8px', color: '#ffcc80', fontSize: '12px', fontWeight: 800 }}>
                    no catalogado
                  </span>
                )}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{formatearPrecio(fila.valorUnitarioReutilizado || 0)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fila.cantidadReutilizada || '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900 }}>{formatearPrecio(fila.valorTotalReutilizado || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TablaBalanceMateriales({
  filas,
  catalogoPrecios,
  tituloVacio,
  formatearPrecio,
  onCambiarNombreMaterial,
}) {
  if (filas.length === 0) {
    return <p style={{ color: '#ccc' }}>{tituloVacio}</p>
  }

  const opcionesCatalogo = obtenerOpcionesCatalogoBalance(catalogoPrecios)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
        <thead>
          <tr style={{ background: '#333' }}>
            <th style={thStyle}>Material</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Valor venta</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Instalado</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Valor compra</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Retirado</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.clave}>
              <td style={{ ...tdStyle, fontWeight: 700 }}>
                <SelectorMaterialBalance
                  fila={fila}
                  opcionesCatalogo={opcionesCatalogo}
                  onCambiarNombreMaterial={onCambiarNombreMaterial}
                />
                {fila.noCatalogado && (
                  <span style={{ display: 'inline-block', marginTop: '5px', color: '#ffcc80', fontSize: '12px', fontWeight: 800 }}>
                    no catalogado
                  </span>
                )}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{formatearPrecio(fila.valorVenta || 0)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fila.instalado || '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>
                <span
                  title="Este valor se edita en Precios materiales"
                  style={{
                    display: 'inline-block',
                    minWidth: '86px',
                    fontWeight: 700,
                  }}
                >
                  {formatearPrecio(fila.valorCompra || 0)}
                </span>
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fila.retirado || '-'}</td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: 'right',
                  fontWeight: 900,
                  color: fila.balance > 0 ? '#66bb6a' : fila.balance < 0 ? '#ff5252' : 'white',
                }}
              >
                {formatearPrecio(fila.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TablaTrazabilidadSolicitantes({
  filas,
  formatearPrecio,
}) {
  const filasConDiferencia = filas.filter((fila) => Number(fila.diferencia || 0) !== 0)

  if (filasConDiferencia.length === 0) {
    return <p style={{ color: '#ccc' }}>No hay diferencias por solicitante en el rango seleccionado.</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
        <thead>
          <tr style={{ background: '#333' }}>
            <th style={thStyle}>Estado</th>
            <th style={thStyle}>Solicitante</th>
            <th style={thStyle}>Material</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Retirado</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Cobrado</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Diferencia</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>% fuga</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Valor fuga</th>
          </tr>
        </thead>
        <tbody>
          {filasConDiferencia.map((fila) => {
            const color = fila.estado === 'critico'
              ? '#ff5252'
              : fila.estado === 'alerta'
                ? '#ffb74d'
                : '#66bb6a'
            const etiqueta = fila.estado === 'critico'
              ? 'Crítico'
              : fila.estado === 'alerta'
                ? 'Alerta'
                : 'OK'

            return (
              <tr key={fila.clave}>
                <td style={{ ...tdStyle, color, fontWeight: 900 }}>{etiqueta}</td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>{fila.solicitante}</td>
                <td style={tdStyle}>{fila.material}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fila.retirado || '-'}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fila.cobrado || '-'}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color, fontWeight: 900 }}>{fila.diferencia}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color, fontWeight: 900 }}>
                  {Number(fila.porcentajeDiferencia || 0).toFixed(1)}%
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color, fontWeight: 900 }}>
                  {formatearPrecio(fila.valorDiferencia || 0)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function VistaTrazabilidadGrupo({
  filas,
  solicitantes,
  lineas,
  solicitantesSeleccionados,
  lineasSeleccionadas,
  onCambiarSolicitantes,
  onCambiarLineas,
  formatearPrecio,
}) {
  const filtrosCompletos = solicitantesSeleccionados.length > 0 && lineasSeleccionadas.length > 0

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(220px, 1fr)', gap: '12px', marginBottom: '12px' }}>
        <PanelSeleccionSolicitantesGrupo
          titulo="Eléctricos / solicitantes"
          opciones={solicitantes}
          seleccionados={solicitantesSeleccionados}
          onCambiar={onCambiarSolicitantes}
        />
        <PanelSeleccionGrupo
          titulo="Líneas"
          opciones={lineas.map(String)}
          seleccionados={lineasSeleccionadas.map(String)}
          onCambiar={onCambiarLineas}
          prefijoOpcion="Línea "
        />
      </div>

      {!filtrosCompletos ? (
        <p style={{ color: '#ccc' }}>
          Selecciona al menos un solicitante y una línea para cruzar material retirado versus material instalado.
        </p>
      ) : (
        <TablaTrazabilidadGrupo filas={filas} formatearPrecio={formatearPrecio} />
      )}
    </div>
  )
}

function PanelSeleccionGrupo({
  titulo,
  opciones,
  seleccionados,
  onCambiar,
  prefijoOpcion = '',
}) {
  const seleccion = new Set(seleccionados.map(String))
  const alternar = (opcion) => {
    const valor = String(opcion)
    const nuevaSeleccion = new Set(seleccion)
    if (nuevaSeleccion.has(valor)) {
      nuevaSeleccion.delete(valor)
    } else {
      nuevaSeleccion.add(valor)
    }
    onCambiar([...nuevaSeleccion])
  }

  return (
    <div style={{ border: '1px solid #555', borderRadius: '8px', padding: '10px', background: '#252525' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
        <strong>{titulo}</strong>
        <button
          type="button"
          onClick={() => onCambiar(seleccionados.length === opciones.length ? [] : opciones.map(String))}
          style={{ ...botonMini, borderColor: '#777' }}
        >
          {seleccionados.length === opciones.length ? 'Limpiar' : 'Todos'}
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '145px', overflowY: 'auto' }}>
        {opciones.length === 0 ? (
          <span style={{ color: '#aaa' }}>Sin opciones en el rango</span>
        ) : opciones.map((opcion) => {
          const activo = seleccion.has(String(opcion))
          return (
            <button
              key={opcion}
              type="button"
              onClick={() => alternar(opcion)}
              style={{
                ...botonMini,
                background: activo ? '#1565c0' : '#333',
                borderColor: activo ? '#64b5f6' : '#555',
              }}
            >
              {prefijoOpcion}{opcion}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PanelSeleccionSolicitantesGrupo({
  titulo,
  opciones,
  seleccionados,
  onCambiar,
}) {
  const seleccion = new Set(seleccionados.map(String))
  const opcionesPendientes = opciones.filter((opcion) => !seleccion.has(String(opcion.valor)))
  const etiquetasPorValor = Object.fromEntries(opciones.map((opcion) => [String(opcion.valor), opcion.etiqueta]))

  const agregar = (valor) => {
    if (!valor) return
    onCambiar([...seleccionados.map(String), valor])
  }

  const quitar = (valor) => {
    onCambiar(seleccionados.map(String).filter((item) => item !== String(valor)))
  }

  return (
    <div style={{ border: '1px solid #555', borderRadius: '8px', padding: '10px', background: '#252525' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
        <strong>{titulo}</strong>
        <button
          type="button"
          onClick={() => onCambiar([])}
          style={{ ...botonMini, borderColor: '#777' }}
        >
          Limpiar
        </button>
      </div>

      <select
        value=""
        onChange={(e) => agregar(e.target.value)}
        style={{
          width: '100%',
          padding: '8px',
          boxSizing: 'border-box',
          borderRadius: '6px',
          border: '1px solid #777',
          background: '#fff',
          color: '#111',
          fontWeight: 700,
          marginBottom: '8px',
        }}
      >
        <option value="">Seleccionar eléctrico...</option>
        {opcionesPendientes.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '34px', maxHeight: '100px', overflowY: 'auto' }}>
        {seleccionados.length === 0 ? (
          <span style={{ color: '#aaa' }}>Sin eléctricos seleccionados</span>
        ) : seleccionados.map((opcion) => (
          <button
            key={opcion}
            type="button"
            onClick={() => quitar(opcion)}
            title="Quitar"
            style={{
              ...botonMini,
              background: '#1565c0',
              borderColor: '#64b5f6',
            }}
          >
            {etiquetasPorValor[String(opcion)] || opcion} ×
          </button>
        ))}
      </div>
    </div>
  )
}

function TablaTrazabilidadGrupo({
  filas,
  formatearPrecio,
}) {
  const filasConDiferencia = filas.filter((fila) => Number(fila.diferencia || 0) !== 0)

  if (filasConDiferencia.length === 0) {
    return <p style={{ color: '#ccc' }}>No hay diferencias para el grupo seleccionado.</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
        <thead>
          <tr style={{ background: '#333' }}>
            <th style={thStyle}>Estado</th>
            <th style={thStyle}>Material</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Retirado grupo</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Instalado líneas</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Diferencia</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>% fuga</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Valor fuga</th>
          </tr>
        </thead>
        <tbody>
          {filasConDiferencia.map((fila) => {
            const color = fila.estado === 'critico'
              ? '#ff5252'
              : fila.estado === 'alerta'
                ? '#ffb74d'
                : '#66bb6a'
            const etiqueta = fila.estado === 'critico'
              ? 'Crítico'
              : fila.estado === 'alerta'
                ? 'Alerta'
                : 'OK'

            return (
              <tr key={fila.clave}>
                <td style={{ ...tdStyle, color, fontWeight: 900 }}>{etiqueta}</td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>{fila.material}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fila.retirado || '-'}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fila.instalado || '-'}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color, fontWeight: 900 }}>{fila.diferencia}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color, fontWeight: 900 }}>
                  {Number(fila.porcentajeDiferencia || 0).toFixed(1)}%
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color, fontWeight: 900 }}>
                  {formatearPrecio(fila.valorDiferencia || 0)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SelectorMaterialBalance({
  fila,
  opcionesCatalogo,
  onCambiarNombreMaterial,
}) {
  const materialCatalogo = opcionesCatalogo.find((opcion) => (
    normalizarTextoBalance(opcion) === normalizarTextoBalance(fila.materialVisible) ||
    normalizarTextoBalanceFlexible(opcion) === normalizarTextoBalanceFlexible(fila.materialVisible)
  ))
  const valorSelector = materialCatalogo || '__otro__'

  return (
    <div style={{ display: 'grid', gap: '6px', minWidth: '240px' }}>
      <select
        value={valorSelector}
        onChange={(e) => {
          const valor = e.target.value
          if (valor === '__otro__') {
            onCambiarNombreMaterial(fila.clave, fila.materialVisible || fila.material || '')
            return
          }
          onCambiarNombreMaterial(fila.clave, valor)
        }}
        title="Vincular este material con un material del catálogo"
        style={{
          width: '100%',
          padding: '6px',
          boxSizing: 'border-box',
          background: '#fff',
          color: '#111',
          border: '1px solid #777',
          borderRadius: '6px',
          fontWeight: 800,
        }}
      >
        <option value="__otro__">Otro / no catalogado</option>
        {opcionesCatalogo.map((material) => (
          <option key={material} value={material}>
            {material}
          </option>
        ))}
      </select>

      {valorSelector === '__otro__' && (
        <input
          type="text"
          value={fila.materialVisible}
          onChange={(e) => onCambiarNombreMaterial(fila.clave, e.target.value)}
          title="Nombre visible para materiales que no están en catálogo"
          style={{
            width: '100%',
            padding: '6px',
            boxSizing: 'border-box',
            background: '#fff',
            color: '#111',
            border: '1px solid #777',
            borderRadius: '6px',
            fontWeight: 800,
          }}
        />
      )}
    </div>
  )
}

function obtenerOpcionesCatalogoBalance(catalogoPrecios = []) {
  const opciones = new Map()

  catalogoPrecios
    .filter((item) => item?.activo !== false && item?.material)
    .forEach((item) => {
      const clave = normalizarTextoBalance(item.material)
      if (!clave || opciones.has(clave)) return
      opciones.set(clave, item.material)
    })

  return [...opciones.values()].sort((a, b) => a.localeCompare(b, 'es', {
    numeric: true,
    sensitivity: 'base',
  }))
}

const thStyle = {
  padding: '8px 10px',
  border: '1px solid #555',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '8px 10px',
  border: '1px solid #444',
}

const botonMini = {
  padding: '6px 9px',
  borderRadius: '999px',
  border: '1px solid #555',
  background: '#333',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 800,
}

function normalizarPrecioManual(valor) {
  if (valor === null || valor === undefined || valor === '') return 0
  const limpio = String(valor).replace(/[^\d,-]/g, '').replace(',', '.')
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : 0
}

function obtenerOpcionesSolicitantesGrupo(itemsVales = [], solicitantesDisponibles = []) {
  const opciones = new Map()
  solicitantesDisponibles.forEach((item) => {
    const nombre = String(item?.nombre || item || '').trim()
    const valor = String(item?.id || nombre).trim()
    if (nombre && valor) opciones.set(valor, { valor, etiqueta: nombre })
  })
  itemsVales.forEach((item) => {
    const nombre = String(item.solicitante_nombre || item.solicitante || item.responsable || '').trim()
    const valor = String(item.solicitante_id || nombre).trim()
    if (nombre && valor && !opciones.has(valor)) opciones.set(valor, { valor, etiqueta: nombre })
  })

  return [...opciones.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es', {
    numeric: true,
    sensitivity: 'base',
  }))
}

function normalizarTextoBalance(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/°/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function normalizarTextoBalanceFlexible(valor) {
  return normalizarTextoBalance(valor)
    .replace(/modulo/g, '')
    .replace(/matix/g, '')
    .replace(/vimar/g, '')
    .replace(/neve/g, '')
    .replace(/r\d+/g, '')
    .replace(/(\d+)a/g, '$1')
    .replace(/enchufe/g, 'ench')
    .replace(/hembra/g, 'hemb')
    .replace(/macho/g, 'mch')
}

function construirMapaPreciosBalance(catalogoPrecios = [], precios = {}, campoCatalogo) {
  const mapa = {}

  catalogoPrecios.forEach((item) => {
    const valor = precios[item.material] ?? precios[item.materialOriginal] ?? item[campoCatalogo] ?? 0
    const claves = [
      item.material,
      item.materialOriginal,
      item.clave,
    ]

    claves.forEach((clave) => {
      if (!normalizarTextoBalance(clave)) return
      mapa[normalizarTextoBalance(clave)] = valor
      mapa[normalizarTextoBalanceFlexible(clave)] = valor
    })
  })

  Object.entries(precios || {}).forEach(([material, valor]) => {
    if (!normalizarTextoBalance(material)) return
    mapa[normalizarTextoBalance(material)] = valor
    mapa[normalizarTextoBalanceFlexible(material)] = valor
  })

  return mapa
}

function construirMapaPreciosBalancePorId(catalogoPrecios = [], precios = {}, campoCatalogo) {
  const mapa = {}

  catalogoPrecios.forEach((item) => {
    if (!item.idArt) return
    mapa[String(item.idArt)] = precios[item.material] ?? precios[item.materialOriginal] ?? item[campoCatalogo] ?? 0
  })

  return mapa
}

function construirMapaNombresCatalogoBalance(catalogoPrecios = []) {
  const mapa = {}

  catalogoPrecios.forEach((item) => {
    const claves = [
      item.material,
      item.materialOriginal,
      item.clave,
    ]

    claves.forEach((clave) => {
      if (!normalizarTextoBalance(clave)) return
      mapa[normalizarTextoBalance(clave)] = item.material
      mapa[normalizarTextoBalanceFlexible(clave)] = item.material
    })
  })

  return mapa
}

function construirMapaNombresCatalogoBalancePorId(catalogoPrecios = []) {
  const mapa = {}

  catalogoPrecios.forEach((item) => {
    if (!item.idArt) return
    mapa[String(item.idArt)] = item.material
  })

  return mapa
}

export default BalanceMaterialesModal
