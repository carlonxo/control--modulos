import { useMemo, useState } from 'react'
import ProtocolosMensualesFila from './ProtocolosMensualesFila'

function ProtocolosMensualesTabla({
  protocolos,
  protocolosFiltrados,
  cargando,
  encabezados,
  conteoClaves,
  puedeEliminarProtocolosMensuales,
  puedeEditarMetadatos = true,
  mostrarSoloIdOtPendiente,
  onAlternarIdOtPendiente,
  mostrarSoloConAlertaMensual,
  onAlternarAlertaMensual,
  BotonValorCobro,
  formatearFecha,
  formatearPrecio,
  claveProtocoloUnico,
  idOtEnEdicion,
  idsOtEnEdicion,
  setIdsOtEnEdicion,
  setIdOtEnEdicion,
  separarIdsOt,
  unirIdsOt,
  onEliminar,
  onAbrirProtocolo,
  onGuardarIdOt,
  onGuardarNotaAlerta,
}) {
  const [pagina, setPagina] = useState(1)
  const tamanoPagina = 50
  const totalPaginas = Math.max(1, Math.ceil(protocolosFiltrados.length / tamanoPagina))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const protocolosPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * tamanoPagina
    return protocolosFiltrados.slice(inicio, inicio + tamanoPagina)
  }, [paginaSegura, protocolosFiltrados])

  if (protocolos.length === 0 && !cargando) {
    return (
      <p style={{ color: '#ccc' }}>
        No hay protocolos con fecha de prueba electrica en el rango seleccionado.
      </p>
    )
  }

  return (
    <div style={{ overflowX: 'auto', paddingLeft: puedeEliminarProtocolosMensuales ? '38px' : 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
        <thead>
          <tr style={{ background: '#333' }}>
            {encabezados.map((encabezado) => (
              <th
                key={encabezado.clave}
                style={{
                  padding: '8px 10px',
                  border: '1px solid #555',
                  textAlign: encabezado.align || 'left',
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                }}
              >
                {encabezado.clave === 'idOt' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                    <button
                      type="button"
                      onClick={onAlternarIdOtPendiente}
                      style={{
                        padding: '4px 7px',
                        borderRadius: '6px',
                        border: mostrarSoloIdOtPendiente ? '1px solid #90caf9' : '1px solid #666',
                        background: mostrarSoloIdOtPendiente ? '#0d47a1' : '#444',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                      }}
                      title="Mostrar solo protocolos sin ID OT"
                    >
                      ID pendiente
                    </button>
                    <button
                      type="button"
                      onClick={onAlternarAlertaMensual}
                      style={{
                        width: '38px',
                        height: '26px',
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '6px',
                        border: mostrarSoloConAlertaMensual ? '1px solid #ffb74d' : '1px solid #666',
                        background: mostrarSoloConAlertaMensual ? '#4e342e' : '#444',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        lineHeight: 1,
                        opacity: mostrarSoloConAlertaMensual ? 1 : 0.65,
                      }}
                      title="Mostrar solo protocolos con alerta"
                    >
                      {'\u{1F6A8}'}
                    </button>
                  </div>
                )}
                {encabezado.lineas.map((linea) => (
                  <span key={linea} style={{ display: 'block' }}>{linea}</span>
                ))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {protocolosFiltrados.length === 0 && !cargando ? (
            <tr>
              <td
                colSpan={encabezados.length}
                style={{
                  padding: '18px',
                  border: '1px solid #444',
                  color: '#ccc',
                  textAlign: 'center',
                }}
              >
                No hay resultados para los filtros seleccionados.
              </td>
            </tr>
          ) : protocolosPagina.map((registro) => {
            const claveRegistro = `${registro.origen}-${registro.id}`
            const claveUnica = claveProtocoloUnico(registro.serie, registro.fecha_prueba_electrica)
            const estaDuplicado = !registro.esGarantia && claveUnica && conteoClaves[claveUnica] > 1

            return (
              <ProtocolosMensualesFila
                key={claveRegistro}
                registro={registro}
                claveRegistro={claveRegistro}
                estaDuplicado={estaDuplicado}
                puedeEliminarProtocolosMensuales={puedeEliminarProtocolosMensuales}
                puedeEditarMetadatos={puedeEditarMetadatos}
                BotonValorCobro={BotonValorCobro}
                formatearFecha={formatearFecha}
                formatearPrecio={formatearPrecio}
                idOtEnEdicion={idOtEnEdicion}
                idsOtEnEdicion={idsOtEnEdicion}
                setIdsOtEnEdicion={setIdsOtEnEdicion}
                setIdOtEnEdicion={setIdOtEnEdicion}
                separarIdsOt={separarIdsOt}
                unirIdsOt={unirIdsOt}
                onEliminar={onEliminar}
                onAbrirProtocolo={onAbrirProtocolo}
                onGuardarIdOt={onGuardarIdOt}
                onGuardarNotaAlerta={onGuardarNotaAlerta}
              />
            )
          })}
        </tbody>
      </table>
      {protocolosFiltrados.length > tamanoPagina && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '14px 0 4px' }}>
          <button type="button" onClick={() => setPagina(1)} disabled={paginaSegura === 1} style={botonPaginacion}>« Primera</button>
          <button type="button" onClick={() => setPagina(Math.max(1, paginaSegura - 1))} disabled={paginaSegura === 1} style={botonPaginacion}>‹ Anterior</button>
          <strong style={{ color: '#b8d4df' }}>Página {paginaSegura} de {totalPaginas} · {protocolosFiltrados.length} protocolos</strong>
          <button type="button" onClick={() => setPagina(Math.min(totalPaginas, paginaSegura + 1))} disabled={paginaSegura === totalPaginas} style={botonPaginacion}>Siguiente ›</button>
          <button type="button" onClick={() => setPagina(totalPaginas)} disabled={paginaSegura === totalPaginas} style={botonPaginacion}>Última »</button>
        </div>
      )}
    </div>
  )
}

const botonPaginacion = {
  padding: '7px 11px',
  borderRadius: '7px',
  border: '1px solid #607d8b',
  background: '#37474f',
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer',
}

export default ProtocolosMensualesTabla
