function ProtocolosMensualesFila({
  registro,
  claveRegistro,
  estaDuplicado,
  puedeEliminarProtocolosMensuales,
  BotonValorCobro,
  formatearFecha,
  formatearPrecio,
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
  return (
    <tr style={{ background: estaDuplicado ? 'rgba(255, 152, 0, 0.16)' : 'transparent' }}>
      <td style={{ padding: '8px', border: '1px solid #444', textAlign: 'center', position: 'relative', overflow: 'visible' }}>
        {puedeEliminarProtocolosMensuales && (
          <button
            type="button"
            onClick={() => onEliminar(registro)}
            title="Eliminar protocolo"
            style={{
              position: 'absolute',
              left: '-34px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '28px',
              height: '28px',
              display: 'grid',
              placeItems: 'center',
              background: '#050505',
              border: '1px solid #777',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              zIndex: 2,
            }}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none">
              <path d="M9 4h6l1 2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 6h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 9l1 11h8l1-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => onAbrirProtocolo(registro)}
          title="Ver protocolo"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '24px',
          }}
        >
          📜
        </button>
      </td>
      <td style={{ padding: '8px', border: '1px solid #444', fontWeight: 700 }}>
        {registro.serie}
        {estaDuplicado && (
          <div style={{ color: '#ffb74d', fontSize: '11px', marginTop: '2px' }}>
            Duplicado
          </div>
        )}
      </td>
      <td style={{ padding: '8px', border: '1px solid #444' }}>
        {registro.fecha_prueba_electrica ? formatearFecha(registro.fecha_prueba_electrica) : '-'}
      </td>
      <td style={{ padding: '8px', border: '1px solid #444' }}>{registro.tipo || '-'}</td>
      <td style={{ padding: '8px', border: '1px solid #444', textAlign: 'right' }}>
        <BotonValorCobro registro={registro} tipo="mantencion">
          {formatearPrecio(registro.valorMantencion)}
          {registro.tieneAjusteValorizacion ? ' *' : ''}
        </BotonValorCobro>
      </td>
      <td style={{ padding: '8px', border: '1px solid #444', textAlign: 'right' }}>
        <BotonValorCobro registro={registro} tipo="modificacion">
          {formatearPrecio(registro.valorModificacion)}
          {registro.tieneAjusteValorizacion ? ' *' : ''}
        </BotonValorCobro>
      </td>
      <td style={{ padding: '8px', border: '1px solid #444', textAlign: 'right', fontWeight: 800 }}>
        <BotonValorCobro registro={registro} tipo="total" destacado>
          {formatearPrecio(registro.valorTotal)}
          {registro.tieneAjusteValorizacion ? ' *' : ''}
        </BotonValorCobro>
      </td>
      <td style={{ padding: '8px', border: '1px solid #444' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {idOtEnEdicion === claveRegistro ? (
            <div style={{ display: 'grid', gap: '4px' }}>
              {idsOtEnEdicion.map((valorOt, indiceOt) => (
                <input
                  key={indiceOt}
                  type="text"
                  value={valorOt}
                  placeholder={`OT ${indiceOt + 1}`}
                  onChange={(e) => {
                    const nuevosValores = [...idsOtEnEdicion]
                    nuevosValores[indiceOt] = e.target.value
                    setIdsOtEnEdicion(nuevosValores)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onGuardarIdOt(registro, unirIdsOt(idsOtEnEdicion))
                  }}
                  style={{
                    width: '92px',
                    padding: '6px',
                    background: 'white',
                    color: '#111',
                    border: '1px solid #777',
                    borderRadius: '6px',
                    font: 'inherit',
                    fontWeight: 700,
                  }}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minWidth: '98px' }}>
              {separarIdsOt(registro.idOt).filter(Boolean).length > 0 ? (
                separarIdsOt(registro.idOt).filter(Boolean).map((valorOt, indiceOt) => (
                  <span
                    key={`${valorOt}-${indiceOt}`}
                    style={{
                      padding: '3px 7px',
                      borderRadius: '999px',
                      background: '#263238',
                      border: '1px solid #546e7a',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '13px',
                    }}
                  >
                    {valorOt}
                  </span>
                ))
              ) : (
                <span style={{ color: '#aaa', fontWeight: 700 }}>-</span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (idOtEnEdicion === claveRegistro) {
                onGuardarIdOt(registro, unirIdsOt(idsOtEnEdicion))
              } else {
                setIdsOtEnEdicion(separarIdsOt(registro.idOt))
                setIdOtEnEdicion(claveRegistro)
              }
            }}
            title={idOtEnEdicion === claveRegistro ? 'Guardar ID OT' : 'Editar ID OT'}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              border: idOtEnEdicion === claveRegistro ? '1px solid #66bb6a' : '1px solid #555',
              background: idOtEnEdicion === claveRegistro ? '#2e7d32' : 'transparent',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {idOtEnEdicion === claveRegistro ? '✓' : '✏️'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export default ProtocolosMensualesFila
