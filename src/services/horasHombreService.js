export async function corregirHorasHombreModulo({
  supabase,
  origen,
  id,
  horas,
  motivo,
}) {
  if (!id) return { data: null, error: new Error('No se pudo identificar el módulo') }

  const horasNormalizadas = horas === null || horas === '' ? null : Number(horas)
  if (horasNormalizadas !== null && (!Number.isFinite(horasNormalizadas) || horasNormalizadas < 0)) {
    return { data: null, error: new Error('Las horas corregidas deben ser un número igual o mayor que cero') }
  }

  return supabase.rpc('corregir_horas_hombre_modulo', {
    p_origen: origen,
    p_id: id,
    p_horas: horasNormalizadas,
    p_motivo: String(motivo || '').trim(),
  })
}
