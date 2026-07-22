function FormularioElectrico({ secciones, valores, onChange }) {
  return (
    <div style={{ display: 'grid', gap: '8px', marginBottom: '14px', textAlign: 'left' }}>
      {secciones.map((seccion, index) => (
        <details
          key={seccion.nombre}
          defaultOpen={index === 0}
          style={{ border: '1px solid #555', borderRadius: '8px', overflow: 'hidden' }}
        >
          <summary
            style={{
              padding: '10px 12px',
              background: '#333',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {seccion.nombre}
          </summary>

          <div style={{ padding: '6px 10px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 64px 76px',
                gap: '7px',
                padding: '4px 0',
                fontSize: '12px',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              <span />
              <span>Nuevo</span>
              <span>Reutilizado</span>
            </div>

            {seccion.items.map((item) => {
              const valorGuardado = valores[item]
              const cantidades =
                valorGuardado && typeof valorGuardado === 'object'
                  ? valorGuardado
                  : { nuevo: valorGuardado ?? '', reutilizado: '' }

              return (
                <div
                  key={item}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 64px 76px',
                    gap: '7px',
                    alignItems: 'center',
                    padding: '7px 0',
                    borderBottom: '1px solid #444',
                  }}
                >
                  <span style={{ lineHeight: 1.2 }}>{item}</span>
                  {['nuevo', 'reutilizado'].map((tipo) => (
                    <input
                      key={tipo}
                      type="number"
                      min="0"
                      inputMode="numeric"
                      aria-label={`${tipo} de ${item}`}
                      value={cantidades[tipo] ?? ''}
                      onChange={(e) => onChange(item, tipo, e.target.value)}
                      style={{ width: '100%', padding: '8px 5px', boxSizing: 'border-box' }}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </details>
      ))}
    </div>
  )
}

export default FormularioElectrico
