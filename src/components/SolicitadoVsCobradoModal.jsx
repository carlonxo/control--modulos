function SolicitadoVsCobradoModal({
  serie,
  filas = [],
  cargando = false,
  error = '',
  onCerrar,
  onClickFondo,
}) {
  function imprimirDetalle() {
    if (typeof window === 'undefined' || filas.length === 0) return

    const ventana = window.open('', '_blank', 'width=900,height=700')
    if (!ventana) return

    const filasHtml = filas.map((fila) => `
      <tr>
        <td>${escaparHtml(fila.material)}</td>
        <td class="numero">${formatearCantidad(fila.retirado)}</td>
        <td class="numero">${formatearCantidad(fila.cobrado)}</td>
      </tr>
    `).join('')

    ventana.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Solicitado vs cobrado - ${escaparHtml(serie || '')}</title>
          <style>
            @page { size: auto; margin: 16mm; }
            body { font-family: Arial, sans-serif; color: #111; margin: 0; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            .serie { margin-bottom: 18px; color: #444; font-size: 15px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #555; padding: 8px 10px; text-align: left; }
            th { background: #e5e7eb; }
            .numero { text-align: right; }
            .nota { margin-top: 12px; color: #555; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Solicitado vs cobrado</h1>
          <div class="serie">Serie ${escaparHtml(serie || '-')}</div>
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th class="numero">Retirado bodega</th>
                <th class="numero">Cobrado en protocolo</th>
              </tr>
            </thead>
            <tbody>${filasHtml}</tbody>
          </table>
          <div class="nota">Retirado considera pedidos entregados por bodega. Cobrado corresponde a las cantidades registradas en el protocolo del módulo.</div>
        </body>
      </html>
    `)
    ventana.document.close()
    ventana.focus()
    ventana.print()
  }

  return (
    <div
      onClick={onClickFondo}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.72)',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(evento) => evento.stopPropagation()}
        style={{
          width: 'min(760px, 100%)',
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'auto',
          padding: '18px',
          border: '1px solid #607d8b',
          borderRadius: '11px',
          background: '#202426',
          color: 'white',
          boxSizing: 'border-box',
          boxShadow: '0 18px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Solicitado vs cobrado</h2>
            <div style={{ color: '#b0bec5', marginTop: '4px' }}>Serie {serie || '-'}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={imprimirDetalle}
              disabled={cargando || Boolean(error) || filas.length === 0}
              style={{
                ...botonImprimirStyle,
                opacity: cargando || error || filas.length === 0 ? 0.55 : 1,
                cursor: cargando || error || filas.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Imprimir detalle
            </button>
            <button type="button" onClick={onCerrar} style={botonCerrarStyle}>Cerrar</button>
          </div>
        </div>

        {cargando ? (
          <p style={{ color: '#ddd' }}>Cargando materiales...</p>
        ) : error ? (
          <div style={{ padding: '11px', border: '1px solid #c62828', borderRadius: '8px', background: '#3a1717', color: '#ffcdd2' }}>
            {error}
          </div>
        ) : filas.length === 0 ? (
          <p style={{ color: '#ccc' }}>No hay materiales retirados ni cobrados para esta serie.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '540px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#37474f' }}>
                  <th style={thStyle}>Material</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Retirado bodega</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cobrado en protocolo</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.clave || fila.material}>
                    <td style={tdStyle}>{fila.material}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{formatearCantidad(fila.retirado)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{formatearCantidad(fila.cobrado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ margin: '12px 0 0', color: '#90a4ae', fontSize: '0.86rem' }}>
          Retirado considera pedidos entregados por bodega. Cobrado corresponde a las cantidades registradas en el protocolo del módulo.
        </p>
      </div>
    </div>
  )
}

function formatearCantidad(valor) {
  const numero = Number(valor || 0)
  return numero.toLocaleString('es-CL', { maximumFractionDigits: 3 })
}

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const thStyle = {
  padding: '11px 12px',
  border: '1px solid #546e7a',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '10px 12px',
  border: '1px solid #455a64',
}

const botonCerrarStyle = {
  padding: '8px 13px',
  border: '1px solid #777',
  borderRadius: '7px',
  background: '#555',
  color: 'white',
  fontWeight: 800,
  cursor: 'pointer',
}

const botonImprimirStyle = {
  padding: '8px 13px',
  border: '1px solid #42a5f5',
  borderRadius: '7px',
  background: '#1565c0',
  color: 'white',
  fontWeight: 800,
}

export default SolicitadoVsCobradoModal
