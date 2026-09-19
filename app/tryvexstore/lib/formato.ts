/** Formato CLP consistente en todo el panel. */
export const clp = (n: number | string | null | undefined) => {
  const v = typeof n === 'string' ? Number(n) : n
  if (v == null || Number.isNaN(v)) return '—'
  return '$' + Math.round(v).toLocaleString('es-CL')
}

export const fecha = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
