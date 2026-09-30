import { useRef, useState } from 'react'
import { calcularIndicadoresHorasHombre } from '../utils/indicadores'

function formatearHoras(valor) {
  return Number(valor || 0).toLocaleString('es-CL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function formatearFechaHora(valor) {
  if (!valor) return '-'
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '-'
  return fecha.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function IndicadoresHorasHombre({
  modulos = [],
  historial = [],
  puedeCorregir = false,
  guardandoId = null,
  onCorregir,
}) {
  const [factorEfectividad, setFactorEfectividad] = useState(() => {
    const valorGuardado = window.localStorage.getItem('factor_efectividad_horas_hombre')
    if (valorGuardado === null) return 100
    const guardado = Number(valorGuardado)
    return Number.isFinite(guardado) && guardado >= 0 && guardado <= 100 ? guardado : 100
  })
  const { registros, porTipo } = calcularIndicadoresHorasHombre(modulos, historial, factorEfectividad)
  const [tipoDetalle, setTipoDetalle] = useState(null)
  const detalleRef = useRef(null)
  const registrosDetalle = tipoDetalle
    ? registros.filter((registro) => String(registro.tipo || '').trim().localeCompare(
      String(tipoDetalle).trim(),
      'es',
      { sensitivity: 'base' }
    ) === 0)
    : registros

  function abrirDetalleTipo(tipo) {
    setTipoDetalle(tipo)
    window.requestAnimationFrame(() => {
      if (!detalleRef.current) return
      detalleRef.current.open = true
      detalleRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  function solicitarCorreccion(registro) {
    const actual = registro.tiene_correccion_hh ? registro.horas_hombre_base : registro.horas_hombre_calculadas
    const valor = window.prompt(
      'Ingrese las H/H corregidas. Deje el campo vacío para volver al cálculo automático.',
      Number(actual || 0).toFixed(1)
    )
    if (valor === null) return
    const horas = valor.trim() === '' ? null : Number(valor.replace(',', '.'))
    if (horas !== null && (!Number.isFinite(horas) || horas < 0)) {
      window.alert('Ingrese una cantidad de horas válida.')
      return
    }
    const motivo = horas === null
      ? 'Se restableció el cálculo automático'
      : window.prompt('Motivo de la corrección:', registro.horas_hombre_motivo || '')
    if (motivo === null) return
    if (horas !== null && !motivo.trim()) {
      window.alert('Debe indicar el motivo de la corrección.')
      return
    }
    onCorregir?.(registro, horas, motivo)
  }

  return (
    <section
      className="indicadores-hh"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="indicadores-hh-cabecera">
        <div>
          <h2>Horas-hombre por módulo</h2>
          <p>Tiempo entre el ingreso y la prueba eléctrica, contabilizando solamente la jornada de 09:00 a 17:00. Las H/H utilizadas aplican el factor de efectividad sobre el valor calculado o corregido.</p>
        </div>
        <strong className="indicadores-hh-total">{registros.length} módulos medidos</strong>
      </div>

      {porTipo.length === 0 ? (
        <p className="indicadores-hh-vacio">Aún no hay módulos con fecha y hora válidas de ingreso y prueba eléctrica.</p>
      ) : (
        <div className="indicadores-hh-tabla-contenedor">
          <table className="indicadores-hh-tabla">
            <thead>
              <tr>
                <th>Tipo de módulo</th>
                <th>Muestra</th>
                <th>Promedio</th>
                <th>Mediana</th>
                <th>Moda*</th>
              </tr>
            </thead>
            <tbody>
              {porTipo.map((fila) => (
                <tr key={fila.tipo}>
                  <td
                    className="indicadores-hh-tipo"
                    title={`Doble clic para ver los ${fila.cantidad} módulos de tipo ${fila.tipo}`}
                    tabIndex={0}
                    onDoubleClick={() => abrirDetalleTipo(fila.tipo)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') abrirDetalleTipo(fila.tipo)
                    }}
                  >
                    <strong>{fila.tipo}</strong>
                  </td>
                  <td>{fila.cantidad}</td>
                  <td>{formatearHoras(fila.promedio)} h</td>
                  <td>{formatearHoras(fila.mediana)} h</td>
                  <td>{fila.modas.length ? fila.modas.map((valor) => `${valor} h`).join(' / ') : 'Sin moda'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <small>* La moda utiliza horas redondeadas para agrupar duraciones equivalentes.</small>
          <small className="indicadores-hh-ayuda">Doble clic sobre un tipo de módulo para abrir su detalle.</small>
        </div>
      )}

      <details ref={detalleRef} className="indicadores-hh-detalle">
        <summary>{tipoDetalle ? `Detalle: ${tipoDetalle}` : 'Ver detalle por módulo'}</summary>
        {tipoDetalle && (
          <div className="indicadores-hh-filtro-detalle">
            <span>{registrosDetalle.length} módulos de tipo <strong>{tipoDetalle}</strong></span>
            <button type="button" onClick={() => setTipoDetalle(null)}>Ver todos</button>
          </div>
        )}
        <div className="indicadores-hh-tabla-contenedor">
          <table className="indicadores-hh-tabla indicadores-hh-tabla-detalle">
            <thead>
              <tr>
                <th>Serie</th>
                <th>Tipo</th>
                <th>Ingreso</th>
                <th>Prueba eléctrica</th>
                <th>H/H calculadas</th>
                <th>
                  <span className="indicadores-hh-titulo-columna">H/H utilizadas</span>
                  <label className="indicadores-hh-factor">
                    <span>F/E</span>
                    <span className="indicadores-hh-factor-campo">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={factorEfectividad}
                        onChange={(event) => {
                          const valor = Number(event.target.value)
                          const porcentaje = Math.min(100, Math.max(0, Number.isFinite(valor) ? valor : 0))
                          setFactorEfectividad(porcentaje)
                          window.localStorage.setItem('factor_efectividad_horas_hombre', String(porcentaje))
                        }}
                        aria-label="Factor de efectividad en porcentaje"
                      />
                      <strong>%</strong>
                    </span>
                  </label>
                </th>
                {puedeCorregir && <th>Acción</th>}
              </tr>
            </thead>
            <tbody>
              {registrosDetalle.map((registro) => (
                <tr key={`${registro.origen_hh}-${registro.id}`}>
                  <td><strong>{registro.serie}</strong></td>
                  <td>{registro.tipo}</td>
                  <td>{formatearFechaHora(registro.fecha_ingreso)}</td>
                  <td>{formatearFechaHora(registro.fecha_prueba_electrica)}</td>
                  <td>{formatearHoras(registro.horas_hombre_calculadas)} h</td>
                  <td>
                    <strong className={registro.tiene_correccion_hh ? 'indicadores-hh-corregido' : ''}>
                      {formatearHoras(registro.horas_hombre)} h
                    </strong>
                    {registro.tiene_correccion_hh && <small title={registro.horas_hombre_motivo || ''}> Corregido</small>}
                  </td>
                  {puedeCorregir && (
                    <td>
                      <button
                        type="button"
                        disabled={guardandoId === `${registro.origen_hh}-${registro.id}`}
                        onClick={() => solicitarCorreccion(registro)}
                      >
                        {guardandoId === `${registro.origen_hh}-${registro.id}` ? 'Guardando…' : 'Corregir'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
