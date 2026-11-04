import { obtenerCodigoBodega, obtenerNombreBodega } from '../utils/ubicaciones'

const BODEGAS_BASE = [
  { valor: 'bayona', etiqueta: 'Bodega Bayona', tipo: 'permanente' },
  { valor: 'rental', etiqueta: 'Bodega Rental', tipo: 'permanente' },
  { valor: 'montaña', etiqueta: 'Bodega Montaña', tipo: 'permanente' },
]

export async function cargarBodegasDisponibles({ supabase }) {
  const { data, error } = await supabase
    .from('bodegas_config')
    .select('codigo, nombre, tipo, activa, creado_en')
    .eq('activa', true)
    .order('tipo', { ascending: true })
    .order('nombre', { ascending: true })

  if (error) {
    const tablaNoInstalada = error.code === '42P01' || String(error.message || '').includes('bodegas_config')
    return { bodegas: BODEGAS_BASE, error: tablaNoInstalada ? null : error, requiereInstalacion: tablaNoInstalada }
  }

  const bodegas = (data || []).map((item) => ({
    valor: obtenerCodigoBodega(item.codigo),
    etiqueta: item.nombre || obtenerNombreBodega(item.codigo),
    tipo: item.tipo || 'obra',
    creadaEn: item.creado_en || '',
  }))
  return { bodegas: bodegas.length > 0 ? bodegas : BODEGAS_BASE, error: null, requiereInstalacion: false }
}

export async function crearBodegaObra({ supabase, nombre }) {
  const nombreLimpio = String(nombre || '').trim().replace(/\s+/g, ' ')
  const codigo = crearCodigoBodegaObra(nombreLimpio)
  if (nombreLimpio.length < 3 || !codigo) {
    return { bodega: null, error: new Error('Escribe un nombre de obra de al menos 3 caracteres.') }
  }

  const etiqueta = /^bodega\s+/i.test(nombreLimpio) ? nombreLimpio : `Bodega ${nombreLimpio}`
  const { data, error } = await supabase
    .from('bodegas_config')
    .insert({ codigo, nombre: etiqueta, tipo: 'obra', activa: true })
    .select('codigo, nombre, tipo, activa, creado_en')
    .single()

  return {
    bodega: data ? {
      valor: obtenerCodigoBodega(data.codigo),
      etiqueta: data.nombre,
      tipo: data.tipo,
      creadaEn: data.creado_en || '',
    } : null,
    error,
  }
}

function crearCodigoBodegaObra(nombre) {
  return String(nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^bodega\s+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

