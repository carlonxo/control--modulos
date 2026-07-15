import ProtocolosMensualesFila from './ProtocolosMensualesFila'

function ProtocolosMensualesTabla({
  protocolos,
  protocolosFiltrados,
  cargando,
  encabezados,
  conteoClaves,
  puedeEliminarProtocolosMensuales,
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
}) {
  if (protocolos.length === 0 && !cargando) {
    return (
      <p style={{ color: '#ccc' }}>
        No hay protocolos con fecha de prueba electrica en el rango seleccionado.
      </p>
    )
  }

  if (protocolosFiltrados.length === 0 && !cargando) {
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
                {encabezado.lineas.map((linea) => (
                  <span key={linea} style={{ display: 'block' }}>{linea}</span>
                ))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {protocolosFiltrados.map((registro) => {
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
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default ProtocolosMensualesTabla
