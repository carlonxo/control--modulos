import { useEffect, useState } from 'react'
import plantillaProtocolo from '../assets/protocolo-entrega-base.png'
import './ProtocoloEntrega.css'

const camposMateriales = [
  ['Conduit 20mm', ['Conduit 20mm'], 375, 546], ['Conduit 25mm', ['Conduit 25mm'], 375, 568], ['Caja PVC 100x100x65', ['Caja PVC 100x100x65'], 375, 590],
  ['Caja metálica 100x100x65', ['Caja metálica 100x100x65'], 375, 632], ['Caja tabique LH', ['Caja tabique LH'], 375, 653], ['Tapa ciega - Pasac.', ['Tapa ciega - Pasac.'], 375, 675],
  ['Cable RZ1 2,5mm', ['Cable RZ1 2,5mm'], 375, 739], ['Cable RZ1 4mm', ['Cable RZ1 4mm'], 375, 760], ['Cable RZ1 6mm', ['Cable RZ1 6mm'], 375, 781],
  ['Ampolleta LED', ['Ampolleta LED'], 375, 867], ['Foco tortuga 60W', ['Foco tortuga 60W'], 375, 888], ['Tubo LED', ['Tubo LED'], 375, 909],
  ['EQ. Herm. LED 40W (tubo/placa)', ['EQ. Herm. LED 40W (tubo/placa)'], 375, 931], ['Foco tortuga LED', ['Foco tortuga LED'], 375, 952], ['Extractor', ['Extractor'], 375, 995],
  ['Conduit 32mm', ['Conduit 32mm'], 375, 1235], ['Artefacto simple', ['Artefacto simple'], 981, 546], ['Artefacto doble', ['Artefacto doble'], 981, 568],
  ['Artefacto triple', ['Artefacto triple'], 981, 590], ['Tapa ciega artefacto', ['Tapa ciega artefacto'], 981, 611], ['Ench. Ind. 32A hembra', ['Ench. Ind. 32A hembra'], 981, 632],
  ['Ench. Ind. 32A macho', ['Ench. Ind. 32A macho'], 981, 653], ['Tablero emb. IP44', ['Tablero emb. IP44'], 981, 696], ['Tablero sobr. IP44', ['Tablero sobr. IP44'], 981, 718],
  ['Tablero IP65', ['Tablero IP65 18p', 'Tablero IP65 24p'], 981, 739], ['Tablero armado', ['Tablero armado'], 981, 760], ['Aut. monof. 10-16-20A', ['Aut. monof. 10-16-20A'], 981, 781],
  ['Aut. bifásico 2x10A', ['Aut. bifásico 2x10A'], 981, 803], ['Aut. bifásico 2x16A', ['Aut. bifásico 2x16A'], 981, 824], ['Aut. bifásico 2x20A', ['Aut. bifásico 2x20A'], 981, 846],
  ['Aut. bifásico 2x25A', ['Aut. bifásico 2x25A'], 981, 867],
  ['Diferencial 2x25A', ['Diferencial 2x25A'], 981, 888], ['Porta Fusible', ['Porta Fusible'], 981, 931], ['Luz Piloto', ['Luz Piloto'], 981, 952],
  ['Barra repartidora', ['Barra repartidora'], 981, 974], ['Falso polo', ['Falso polo'], 981, 1016],
]

function crearDetalle(materiales) {
  return Object.fromEntries(camposMateriales.map(([item, fuentes]) => {
    const total = fuentes.reduce((suma, clave) => {
      const valor = materiales?.[clave]
      return suma + (typeof valor === 'object' ? Number(valor?.nuevo || 0) + Number(valor?.reutilizado || 0) : Number(valor || 0))
    }, 0)
    return [item, { mantencion: total || '', modificacion: '' }]
  }))
}

function MarcaX({ activa, onClick, style, nombre }) {
  return <button type="button" className="pdf-marca-x" style={style} onClick={onClick} aria-label={nombre}>{activa ? 'X' : ''}</button>
}

export default function ProtocoloEntrega({ modulo, responsable, datosIniciales, materiales, onGuardar, onCerrar }) {
  const [datos, setDatos] = useState(() => ({
    fecha: new Date().toISOString().slice(0, 10), responsable: responsable || '', planosRevision: '', centroCosto: '', flexNaranjo: false, flexLibre: false, flexMetalico: false,
    eva: false, thhn: false, caleco: false, canalizado: '', aterrizado: '', te1: '', observCanalizado: '', observCableado: '', observaciones: '', firma: '',
    ...datosIniciales,
    detalleMateriales: { ...crearDetalle(materiales), ...(datosIniciales?.detalleMateriales || {}) },
  }))
  const [guardando, setGuardando] = useState(false)
  const cambiar = (campo, valor) => setDatos((actual) => ({ ...actual, [campo]: valor }))
  const alternar = (campo) => cambiar(campo, !datos[campo])
  const opcion = (campo, valor) => cambiar(campo, datos[campo] === valor ? '' : valor)
  const material = (item, tipo, valor) => setDatos((actual) => ({ ...actual, detalleMateriales: { ...actual.detalleMateriales, [item]: { ...(actual.detalleMateriales?.[item] || {}), [tipo]: valor } } }))
  const guardar = async () => { setGuardando(true); await onGuardar({ ...datos, materiales }); setGuardando(false) }
  const campo = (nombre, style, props = {}) => <input className="pdf-campo" style={style} value={datos[nombre] || ''} onChange={(e) => cambiar(nombre, e.target.value)} {...props} />

  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]')
    if (!viewport) return

    const configuracionAnterior = viewport.getAttribute('content')
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes'
    )

    return () => viewport.setAttribute('content', configuracionAnterior || 'width=device-width, initial-scale=1.0')
  }, [])

  return <div className="protocolo-overlay">
    <div className="protocolo-toolbar">
      <button className="protocolo-guardar" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar protocolo'}</button>
      <button className="protocolo-descargar" onClick={() => window.print()}>Descargar protocolo</button>
      <button onClick={onCerrar}>Cerrar</button>
    </div>
    <div className="protocolo-visor"><div className="pdf-protocolo-pagina" style={{ backgroundImage: `url(${plantillaProtocolo})` }}>
      {campo('fecha', { left: 280, top: 190, width: 405, height: 31 }, { type: 'date' })}<input className="pdf-campo" style={{ left: 959, top: 190, width: 304, height: 31 }} value={modulo.serie || ''} disabled />
      {campo('responsable', { left: 280, top: 221, width: 405, height: 37 })}<input className="pdf-campo" style={{ left: 959, top: 221, width: 304, height: 37 }} value={modulo.tipo || ''} disabled />
      <input className="pdf-campo" style={{ left: 280, top: 258, width: 405, height: 38 }} value={modulo.linea || ''} disabled /><input className="pdf-campo" style={{ left: 959, top: 258, width: 304, height: 38 }} value={modulo.proyecto || ''} disabled />
      {campo('planosRevision', { left: 280, top: 296, width: 405, height: 44 })}{campo('centroCosto', { left: 959, top: 296, width: 304, height: 44 })}
      <div className="pdf-linea-horizontal" style={{ left: 37, top: 258, width: 1226 }} />
      <div className="pdf-linea-horizontal" style={{ left: 37, top: 1277, width: 606 }} />
      <MarcaX activa={datos.flexNaranjo} onClick={() => alternar('flexNaranjo')} style={{ left: 183, top: 403, width: 102, height: 29 }} nombre="Flex Naranjo" />
      <MarcaX activa={datos.flexLibre} onClick={() => alternar('flexLibre')} style={{ left: 285, top: 403, width: 105, height: 29 }} nombre="Flex libre halógeno" />
      <MarcaX activa={datos.flexMetalico} onClick={() => alternar('flexMetalico')} style={{ left: 390, top: 403, width: 118, height: 29 }} nombre="Flex metálico" />
      {campo('observCanalizado', { left: 508, top: 403, width: 177, height: 29 })}
      <MarcaX activa={datos.eva} onClick={() => alternar('eva')} style={{ left: 818, top: 403, width: 73, height: 29 }} nombre="EVA" /><MarcaX activa={datos.thhn} onClick={() => alternar('thhn')} style={{ left: 891, top: 403, width: 91, height: 29 }} nombre="THHN" />
      <MarcaX activa={datos.caleco} onClick={() => alternar('caleco')} style={{ left: 982, top: 403, width: 118, height: 29 }} nombre="CALECO" />{campo('observCableado', { left: 1100, top: 403, width: 163, height: 29 })}
      <MarcaX activa={datos.canalizado === 'Cumple'} onClick={() => opcion('canalizado', 'Cumple')} style={{ left: 183, top: 475, width: 102, height: 28 }} nombre="Cumple" /><MarcaX activa={datos.canalizado === 'No cumple'} onClick={() => opcion('canalizado', 'No cumple')} style={{ left: 285, top: 475, width: 105, height: 28 }} nombre="No cumple" /><MarcaX activa={datos.canalizado === 'Autoriza'} onClick={() => opcion('canalizado', 'Autoriza')} style={{ left: 390, top: 475, width: 295, height: 28 }} nombre="Autoriza" />
      <MarcaX activa={datos.aterrizado === 'Sí'} onClick={() => opcion('aterrizado', 'Sí')} style={{ left: 818, top: 475, width: 73, height: 28 }} nombre="Aterrizado sí" /><MarcaX activa={datos.aterrizado === 'No'} onClick={() => opcion('aterrizado', 'No')} style={{ left: 891, top: 475, width: 91, height: 28 }} nombre="Aterrizado no" />
      <MarcaX activa={datos.te1 === 'Sí'} onClick={() => opcion('te1', 'Sí')} style={{ left: 1100, top: 475, width: 81, height: 28 }} nombre="TE-1 sí" /><MarcaX activa={datos.te1 === 'No'} onClick={() => opcion('te1', 'No')} style={{ left: 1181, top: 475, width: 82, height: 28 }} nombre="TE-1 no" />
      {camposMateriales.map(([item,, x, y]) => ['mantencion', 'modificacion'].map((tipo, col) => <input key={`${item}-${tipo}`} type="number" min="0" className="pdf-material" style={{ left: x + col * (x < 700 ? 133 : 134), top: y, width: x < 700 ? 133 : (col ? 148 : 134), height: 21 }} value={datos.detalleMateriales?.[item]?.[tipo] ?? ''} onChange={(e) => material(item, tipo, e.target.value)} />))}
      <textarea className="pdf-campo" style={{ left: 37, top: 1421, width: 855, height: 59 }} value={datos.observaciones} onChange={(e) => cambiar('observaciones', e.target.value)} /><textarea className="pdf-campo" style={{ left: 892, top: 1421, width: 371, height: 59 }} value={datos.firma} onChange={(e) => cambiar('firma', e.target.value)} />
    </div></div>
  </div>
}
