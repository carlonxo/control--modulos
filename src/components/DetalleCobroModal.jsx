function DetalleCobroModal({
  detalle,
  puedeAjustar,
  ajusteCobro,
  setAjusteCobro,
  formatearPrecio,
  claveItemCobro,
  onGuardarAjuste,
  onCerrar,
  onClickFondo,
}) {
  return (
    <div
      onClick={onClickFondo}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'calc(100vw - 32px)',
        maxWidth: '560px',
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        padding: '18px',
        background: '#222',
        border: '1px solid white',
        borderRadius: '10px',
        zIndex: 1500,
        color: 'white',
        textAlign: 'left',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Detalle de cobro</h3>
          <div style={{ color: '#ccc', marginTop: '4px' }}>
            Serie: {detalle.serie || '-'}
          </div>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #777',
            background: '#555',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Cerrar
        </button>
      </div>

      {detalle.lineas.length === 0 ? (
        <p style={{ color: '#ccc' }}>No hay cobros asociados a este valor.</p>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {detalle.lineas.map((item, index) => {
            const itemKey = item.claveAjuste || claveItemCobro(item.tipoCobro || detalle.tipo, item)

            return (
              <div
                key={`${item.material}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: '8px',
                  padding: '10px',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  background: '#2b2b2b',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>{item.material}</div>
                  <div style={{ color: '#ccc', fontSize: '13px', marginTop: '3px' }}>
                    {item.cantidad} x {formatearPrecio(item.precioUnitario)}
                    {item.tipoCantidad ? ` | ${item.tipoCantidad}` : ''}
                    {item.materialPrecio && item.materialPrecio !== item.material ? ` | precio: ${item.materialPrecio}` : ''}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '6px', justifyItems: 'end' }}>
                  <div style={{ fontWeight: 800, textAlign: 'right' }}>
                    {formatearPrecio(item.subtotal)}
                  </div>
                  {item.ajusteValorizacionItem && (
                    <div style={{ color: '#ffcc80', fontSize: '12px', textAlign: 'right' }}>
                      Ajustado{item.subtotalOriginal !== undefined ? ` desde ${formatearPrecio(item.subtotalOriginal)}` : ''}
                    </div>
                  )}
                  {puedeAjustar && (
                    <button
                      type="button"
                      onClick={() => setAjusteCobro({
                        itemKey,
                        itemLabel: item.material,
                        tipoCobro: item.tipoCobro || detalle.tipo,
                        valor: String(item.subtotal ?? 0),
                        motivo: item.ajusteValorizacionItem?.motivo || '',
                      })}
                      title="Modificar este cobro"
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        border: '1px solid #777',
                        background: '#333',
                        color: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      
                    </button>
                  )}
                </div>
                {ajusteCobro.itemKey === itemKey && (
                  <div style={{ gridColumn: '1 / -1', display: 'grid', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #555' }}>
                    <strong>Modificar: {item.material}</strong>
                    <input
                      value={ajusteCobro.valor}
                      onChange={(e) => setAjusteCobro((actual) => ({ ...actual, valor: e.target.value }))}
                      inputMode="numeric"
                      placeholder="Nuevo valor"
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #777' }}
                    />
                    <textarea
                      value={ajusteCobro.motivo}
                      onChange={(e) => setAjusteCobro((actual) => ({ ...actual, motivo: e.target.value }))}
                      rows={2}
                      placeholder="Motivo de la modificación"
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #777', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={onGuardarAjuste}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #66bb6a', background: '#1b5e20', color: 'white', cursor: 'pointer', fontWeight: 800 }}
                      >
                        Guardar item
                      </button>
                      <button
                        type="button"
                        onClick={() => setAjusteCobro({ itemKey: '', itemLabel: '', tipoCobro: '', valor: '', motivo: '' })}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #777', background: '#555', color: 'white', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid #555',
          fontWeight: 900,
          fontSize: '18px',
        }}
      >
        <span>Total detalle</span>
        <span>{formatearPrecio(detalle.total)}</span>
      </div>
    </div>
  )
}

export default DetalleCobroModal
