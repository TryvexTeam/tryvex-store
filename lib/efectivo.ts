/**
 * Efectivo por depositar.
 *
 * Cada movimiento es un hecho: un integrante RECIBIÓ efectivo (cobró ventas en
 * mano) o lo DEPOSITÓ en la cuenta. Lo que cada uno todavía tiene en la mano es
 * lo recibido menos lo depositado.
 *
 * Mover efectivo a la cuenta no cambia cuánta plata tiene el negocio, solo dónde
 * está; por eso esto vive aparte de los movimientos de Finanzas.
 */
export interface MovimientoEfectivo {
  integrante_id: string
  tipo: string
  monto_clp: string | number
}

export interface SaldoEfectivo {
  integranteId: string
  recibido: number
  depositado: number
  /** Lo que tiene en la mano: recibido − depositado. Negativo = depositó más de lo que figura recibido. */
  saldo: number
}

const n = (v: string | number) => Number(v) || 0

/** Un saldo por persona, de mayor a menor. */
export function saldosDeEfectivo(movs: MovimientoEfectivo[]): SaldoEfectivo[] {
  const porPersona = new Map<string, SaldoEfectivo>()
  for (const m of movs) {
    const s = porPersona.get(m.integrante_id) ?? { integranteId: m.integrante_id, recibido: 0, depositado: 0, saldo: 0 }
    if (m.tipo === 'recibe') s.recibido += n(m.monto_clp)
    else if (m.tipo === 'deposita') s.depositado += n(m.monto_clp)
    s.saldo = s.recibido - s.depositado
    porPersona.set(m.integrante_id, s)
  }
  return [...porPersona.values()].sort((a, b) => b.saldo - a.saldo)
}

/** Total que falta depositar: solo suma a quienes tienen efectivo en la mano. */
export function totalPorDepositar(saldos: SaldoEfectivo[]): number {
  return saldos.reduce((a, s) => a + Math.max(0, s.saldo), 0)
}

/** ¿Puede esta persona depositar `monto`? Solo si lo tiene en la mano. */
export function puedeDepositar(saldos: SaldoEfectivo[], integranteId: string, monto: number): { ok: true } | { ok: false; tiene: number } {
  const tiene = Math.max(0, saldos.find((s) => s.integranteId === integranteId)?.saldo ?? 0)
  return monto <= tiene ? { ok: true } : { ok: false, tiene }
}

/** ¿Borrar este movimiento dejaría a su persona con saldo negativo? */
export function borrarDejaNegativo(movs: (MovimientoEfectivo & { id: string })[], id: string): boolean {
  const objetivo = movs.find((m) => m.id === id)
  if (!objetivo) return false
  const sin = movs.filter((m) => m.id !== id && m.integrante_id === objetivo.integrante_id)
  return (saldosDeEfectivo(sin)[0]?.saldo ?? 0) < 0
}
