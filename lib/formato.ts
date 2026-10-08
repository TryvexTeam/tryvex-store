/** Formato CLP consistente en todo el panel. */
export const clp = (n: number | string | null | undefined) => {
  const v = typeof n === 'string' ? Number(n) : n
  if (v == null || Number.isNaN(v)) return '—'
  return '$' + Math.round(v).toLocaleString('es-CL')
}

/**
 * Fecha legible en español de Chile.
 *
 * Una fecha de calendario («2026-10-01», como las columnas `date` de la base) NO tiene hora: se
 * interpreta como medianoche UTC, y mostrarla en hora de Santiago (UTC−3/−4) la corría un día
 * atrás («30 sept»). Esas se formatean tal cual; los instantes con hora sí se pasan a Santiago.
 */
export const fecha = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const soloDia = /^\d{4}-\d{2}-\d{2}$/.test(iso)
  return new Date(iso).toLocaleDateString('es-CL', { timeZone: soloDia ? 'UTC' : 'America/Santiago', day: '2-digit', month: 'short', year: 'numeric' })
}
