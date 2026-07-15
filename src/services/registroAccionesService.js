import { supabase } from './supabase'

function formatearFechaLocal(fecha) {
  const ano = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function obtenerRangoDiaActual() {
  const hoy = formatearFechaLocal(new Date())
  const manana = new Date(`${hoy}T00:00:00`)
  manana.setDate(manana.getDate() + 1)
  return {
    inicio: `${hoy}T00:00:00`,
    fin: `${formatearFechaLocal(manana)}T00:00:00`,
  }
}

export async function cargarRegistroAccionesDia() {
  const { inicio, fin } = obtenerRangoDiaActual()
  return supabase
    .from('registro_acciones_modulos')
    .select('*')
    .gte('created_at', inicio)
    .lt('created_at', fin)
    .order('created_at', { ascending: false })
}

export async function registrarRegistroAccionModulo({
  tipo,
  modulo = {},
  datosAntes = null,
  datosDespues = null,
  descripcion = '',
  usuarioId = null,
  usuarioNombre = '',
}) {
  const payload = {
    tipo,
    modulo_id: String(modulo?.id || datosDespues?.id || datosAntes?.id || ''),
    serie: modulo?.serie || datosDespues?.serie || datosAntes?.serie || '',
    linea: modulo?.linea || datosDespues?.linea || datosAntes?.linea || null,
    descripcion,
    usuario_id: usuarioId,
    usuario_nombre: usuarioNombre,
    datos_antes: datosAntes,
    datos_despues: datosDespues,
    deshecho: false,
  }

  return supabase
    .from('registro_acciones_modulos')
    .insert([payload])
}

export async function marcarRegistroAccionDeshecha(accionId, deshechoPor) {
  return supabase
    .from('registro_acciones_modulos')
    .update({
      deshecho: true,
      fecha_deshacer: new Date().toISOString(),
      deshecho_por: deshechoPor,
    })
    .eq('id', accionId)
}
