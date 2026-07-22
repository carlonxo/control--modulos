function BotonValorCobro({
  registro,
  tipo,
  children,
  destacado = false,
  onAbrirDetalle,
}) {
  return (
    <button
      type="button"
      onClick={() => onAbrirDetalle(registro, tipo)}
      style={{
        width: '100%',
        padding: '4px 6px',
        border: 'none',
        background: 'transparent',
        color: 'white',
        cursor: 'pointer',
        textAlign: 'right',
        fontWeight: destacado ? 800 : 600,
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
      }}
      title="Ver detalle del cobro"
    >
      {children}
    </button>
  )
}

export default BotonValorCobro
