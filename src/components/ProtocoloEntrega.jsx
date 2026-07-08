import { useState } from 'react'
import plantillaProtocolo from '../assets/protocolo-entrega-base.png'
import './ProtocoloEntrega.css'

const izquierda = [
  '#CANALIZACIÓN', 'Conduit Rígido 20-25mm', 'Tigre Flex 20-25mm', 'Caja PVC 100x100x65', 'Caja 5/8" PVC', 'Tapa Ciega Plástica', 'Tapa Pasacables Plástica',
  '#CABLEADO', 'Cable RZ1 1,5mm', 'Cable RZ1 2,5mm', 'Cable RZ1 4-6mm', 'Cordón Flex. 3x 2.5 mm', 'Cordón Flex. 3x 4 mm', 'Cordón Flex. 3x 6 mm',
  '#CANALIZACIÓN METÁLICA', 'Caja Metálica 100x100', 'Caja Metálica 200x200', 'Caja 5/8 Metálica', 'Tapa Ciega Metálica 5/8', 'Tapa Pasacables Metálica', 'Tubería Metálica Flexible', 'Terminales Rectos', 'Tapa Ciega Meta. 100x100',
  '#BANDEJA PLÁSTICA PORTA CONDUCTORES', 'Bandeja plástica 100x45', 'Ángulo Plano 100x45', 'Ángulo Interior 100x45', 'Ángulo Exterior 100x45', 'Junta Cuerpo 100x45', 'Tapa Extremo 100x45',
  '#MOLDURA PLÁSTICA PORTA CONDUCTORES', 'Moldura 20x10', 'Ángulo Plano 20x10', 'Ángulo Interior 20x10', 'Ángulo Exterior 20x10', 'Junta Cuerpo 20x10', 'Tapa Extremo 20x10',
  '#ACCESORIOS', 'Enchufe Industrial 32A', 'Extractor', 'Prensa Estopa',
]

const derecha = [
  '#ILUMINACIÓN BÁSICA', 'Ampolleta B/Consumo', 'Plafón 18W', 'Tubo LED', 'Equipo Hermético', 'Equipo Pantalla LED', 'Foco Tortuga 60W', 'Foco Tortuga LED',
  '#ARTEFACTOS', 'Artefacto Simple', 'Artefacto Doble', 'Artefacto Triple', 'Soporte Plástico', 'Mod. Enchufe Hembra 10A', 'Mod. Enchufe Hembra 16A', 'Mod. Interruptor 9/12', 'Tapa 0 Puesto', 'Tapa 1 Puesto', 'Tapa 2 Puesto', 'Tapa 3 Puesto',
  '#TABLEROS', 'Tablero PVC Embutido', 'Tablero PVC Sobrepuesto', 'Tablero PVC IP65', 'Auto. Monofásico 1x10A', 'Auto. Bifásico 2x10A', 'Auto. Monofásico 1x16A', 'Auto. Bifásico 2x16A', 'Auto. Monofásico 1x20A', 'Auto. Bifásico 2x20A', 'Auto. Monofásico 1x25A', 'Auto. Bifásico 2x25A', 'Diferencial 2x25A', 'Diferencial 2x40A', 'Porta Fusibles', 'Fusibles', 'Luz Piloto', 'Barra Repartidora', 'Falso Polo 1 Mts',
]

const alias = {
  'Conduit Rígido 20-25mm': ['Conduit 20mm', 'Conduit 25mm'], 'Tigre Flex 20-25mm': ['Conduit 32mm'], 'Caja 5/8" PVC': ['Caja tabique LH'],
  'Tapa Pasacables Plástica': ['Tapa ciega - Pasac.'], 'Cable RZ1 4-6mm': ['Cable RZ1 4mm', 'Cable RZ1 6mm'], 'Caja Metálica 100x100': ['Caja metálica 100x100x65'],
  'Ampolleta B/Consumo': ['Ampolleta LED'], 'Plafón 18W': ['Plafón'], 'Equipo Hermético': ['EQ. Herm. LED 40W (tubo/placa)'],
  'Artefacto Simple': ['Artefacto simple'], 'Artefacto Doble': ['Artefacto doble'], 'Artefacto Triple': ['Artefacto triple'],
  'Enchufe Industrial 32A': ['Ench. Ind. 32A macho', 'Ench. Ind. 32A hembra'], 'Tablero PVC Embutido': ['Tablero emb. IP44'],
  'Tablero PVC Sobrepuesto': ['Tablero sobr. IP44'], 'Tablero PVC IP65': ['Tablero IP65 18p', 'Tablero IP65 24p'], 'Porta Fusibles': ['Porta Fusible'],
}

function crearDetalle(materiales) {
  const detalle = {}
  for (const item of [...izquierda, ...derecha].filter((x) => !x.startsWith('#'))) {
    const total = (alias[item] || [item]).reduce((suma, clave) => {
      const valor = materiales?.[clave]
      return suma + (typeof valor === 'object' ? Number(valor?.nuevo || 0) + Number(valor?.reutilizado || 0) : Number(valor || 0))
    }, 0)
    detalle[item] = { mantencion: total || '', modificacion: '' }
  }
  return detalle
}

function MarcaX({ activa, onClick, style, nombre }) {
  return <button type="button" className="pdf-marca-x" style={style} onClick={onClick} aria-label={nombre}>{activa ? 'X' : ''}</button>
}

export default function ProtocoloEntrega({ modulo, responsable, datosIniciales, materiales, onGuardar, onCerrar }) {
  const [datos, setDatos] = useState(() => ({
    fecha: new Date().toISOString().slice(0, 10), responsable: responsable || '', flexNaranjo: false, flexLibre: false, flexMetalico: false,
    eva: false, thhn: false, caleco: false, tableroNorma: '', aterrizado: '', observCanalizado: '', observCableado: '', observTablero: '', observAterrizado: '',
    observaciones: '', firma: '', detalleMateriales: crearDetalle(materiales), ...datosIniciales,
  }))
  const [guardando, setGuardando] = useState(false)
  const cambiar = (campo, valor) => setDatos((actual) => ({ ...actual, [campo]: valor }))
  const alternar = (campo) => cambiar(campo, !datos[campo])
  const opcion = (campo, valor) => cambiar(campo, datos[campo] === valor ? '' : valor)
  const material = (item, tipo, valor) => setDatos((actual) => ({ ...actual, detalleMateriales: { ...actual.detalleMateriales, [item]: { ...(actual.detalleMateriales?.[item] || {}), [tipo]: valor } } }))

  const guardar = async () => { setGuardando(true); await onGuardar({ ...datos, materiales }); setGuardando(false) }
  const campo = (campoNombre, style, props = {}) => <input className="pdf-campo" style={style} value={datos[campoNombre] || ''} onChange={(e) => cambiar(campoNombre, e.target.value)} {...props} />

  return (
    <div className="protocolo-overlay">
      <div className="protocolo-toolbar"><button className="protocolo-guardar" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar protocolo'}</button><button onClick={onCerrar}>Cerrar</button></div>
      <div className="protocolo-visor">
        <div className="pdf-protocolo-pagina" style={{ backgroundImage: `url(${plantillaProtocolo})` }}>
          {campo('fecha', { left: 347, top: 214, width: 346, height: 31 }, { type: 'date' })}
          <input className="pdf-campo" style={{ left: 893, top: 214, width: 303, height: 31 }} value={modulo.serie || ''} disabled />
          {campo('responsable', { left: 347, top: 247, width: 346, height: 40 })}
          <input className="pdf-campo" style={{ left: 893, top: 247, width: 303, height: 40 }} value={modulo.tipo || ''} disabled />
          <input className="pdf-campo" style={{ left: 347, top: 290, width: 346, height: 30 }} value={modulo.linea || ''} disabled />
          <input className="pdf-campo" style={{ left: 893, top: 290, width: 303, height: 30 }} value={modulo.proyecto || ''} disabled />

          <MarcaX activa={datos.flexNaranjo} onClick={() => alternar('flexNaranjo')} style={{ left: 251, top: 383, width: 131, height: 29 }} nombre="Flex Naranjo" />
          <MarcaX activa={datos.flexLibre} onClick={() => alternar('flexLibre')} style={{ left: 383, top: 383, width: 119, height: 29 }} nombre="Flex libre halógeno" />
          <MarcaX activa={datos.flexMetalico} onClick={() => alternar('flexMetalico')} style={{ left: 503, top: 383, width: 101, height: 29 }} nombre="Flex metálico" />
          {campo('observCanalizado', { left: 604, top: 383, width: 89, height: 29 })}
          <MarcaX activa={datos.eva} onClick={() => alternar('eva')} style={{ left: 812, top: 383, width: 58, height: 29 }} nombre="EVA" />
          <MarcaX activa={datos.thhn} onClick={() => alternar('thhn')} style={{ left: 871, top: 383, width: 77, height: 29 }} nombre="THHN" />
          <MarcaX activa={datos.caleco} onClick={() => alternar('caleco')} style={{ left: 949, top: 383, width: 109, height: 29 }} nombre="CALECO" />
          {campo('observCableado', { left: 1059, top: 383, width: 137, height: 29 })}
          <MarcaX activa={datos.tableroNorma === 'Bajo norma'} onClick={() => opcion('tableroNorma', 'Bajo norma')} style={{ left: 251, top: 455, width: 131, height: 29 }} nombre="Tablero bajo norma" />
          <MarcaX activa={datos.tableroNorma === 'Fuera norma'} onClick={() => opcion('tableroNorma', 'Fuera norma')} style={{ left: 383, top: 455, width: 119, height: 29 }} nombre="Tablero fuera norma" />
          {campo('observTablero', { left: 503, top: 455, width: 190, height: 29 })}
          <MarcaX activa={datos.aterrizado === 'Sí'} onClick={() => opcion('aterrizado', 'Sí')} style={{ left: 812, top: 455, width: 58, height: 29 }} nombre="Aterrizado sí" />
          <MarcaX activa={datos.aterrizado === 'No'} onClick={() => opcion('aterrizado', 'No')} style={{ left: 871, top: 455, width: 77, height: 29 }} nombre="Aterrizado no" />
          {campo('observAterrizado', { left: 949, top: 455, width: 247, height: 29 })}

          {izquierda.map((item, index) => !item.startsWith('#') && ['mantencion', 'modificacion'].map((tipo, col) => <input key={`${item}-${tipo}`} type="number" min="0" className="pdf-material" style={{ left: col ? 502 : 368, top: 506 + index * 21.4, width: col ? 132 : 133, height: 21 }} value={datos.detalleMateriales?.[item]?.[tipo] ?? ''} onChange={(e) => material(item, tipo, e.target.value)} />))}
          {derecha.map((item, index) => !item.startsWith('#') && ['mantencion', 'modificacion'].map((tipo, col) => <input key={`${item}-${tipo}`} type="number" min="0" className="pdf-material" style={{ left: col ? 1033 : 871, top: 506 + index * 21.4, width: col ? 163 : 161, height: 21 }} value={datos.detalleMateriales?.[item]?.[tipo] ?? ''} onChange={(e) => material(item, tipo, e.target.value)} />))}
          <textarea className="pdf-campo" style={{ left: 102, top: 1412, width: 768, height: 59 }} value={datos.observaciones} onChange={(e) => cambiar('observaciones', e.target.value)} />
          <textarea className="pdf-campo" style={{ left: 871, top: 1412, width: 325, height: 59 }} value={datos.firma} onChange={(e) => cambiar('firma', e.target.value)} />
        </div>
      </div>
    </div>
  )
}
