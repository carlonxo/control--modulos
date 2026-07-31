import ProtocolosMensualesFila from './ProtocolosMensualesFila'

function ProtocolosMensualesTabla({
  protocolos,
  protocolosFiltrados,
  cargando,
  encabezados,
  conteoClaves,
  puedeEliminarProtocolosMensuales,
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
  if (protocolos.length === 0 && !cargando) {
    return (
      <p style={{ color: '#ccc' }}>
        No hay protocolos con fecha de prueba electrica en el rango seleccionado.
      </p>
    )
  }

  if (false && protocolosFiltrados.length === 0 && !cargando) {
    return <p style={{ color: '#ccc' }}>No hay resultados para la búsqueda indicada.</p>
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
          ) : protocolosFiltrados.map((registro) => {
            const claveRegistro = `${registro.origen}-${registro.id}`
            const claveUnica = claveProtocoloUnico(registro.serie, registro.fecha_prueba_electrica)
            const estaDuplicado = claveUnica && conteoClaves[claveUnica] > 1

            return (
              <ProtocolosMensualesFila
                key={claveRegistro}
                registro={registro}
                claveRegistro={claveRegistro}
                estaDuplicado={estaDuplicado}
                puedeEliminarProtocolosMensuales={puedeEliminarProtocolosMensuales}
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
    </div>
  )
}

export default ProtocolosMensualesTabla
