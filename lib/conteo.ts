/**
 * Conteo de stock: «tengo N en la mano».
 *
 * El stock no se edita: es la suma de los movimientos. Para poner el número que
 * el equipo contó, se registra un movimiento de ajuste por la DIFERENCIA entre
 * lo que dice el sistema y lo que hay de verdad. Así el historial queda
 * explicando por qué el stock es el que es.
 */
export interface PlanDeConteo {
  /** Unidades a sumar (positivo) o restar (negativo) para llegar al número real. */
  delta: number
  motivo: string
}

/** `null` si el sistema ya dice lo mismo que se contó: no hay nada que registrar. */
export function planificarConteo(actual: number, real: number): PlanDeConteo | null {
  const delta = real - actual
  if (delta === 0) return null
  return { delta, motivo: `Conteo real: ${real} (el sistema decía ${actual})` }
}
