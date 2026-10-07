/**
 * Orden de las reseñas: primero las que más ayudan a decidir.
 *
 * Criterio de Loox y Judge.me: foto de un cliente real > nota > un texto que se
 * pueda leer en una tarjeta. La fecha solo desempata (muchas reseñas comparten
 * fecha de carga, y ordenar solo por ella las mezclaba al azar).
 */
type Ordenable = { productoId: string; texto: string; calificacion: number; foto: string | null; creadaEn: string }

export function utilidad(r: Ordenable): number {
  const largo = r.texto.trim().length
  const foto = r.foto ? 4 : 0
  const nota = r.calificacion === 5 ? 2 : r.calificacion === 4 ? 1 : 0
  // Muy corto («bueno») dice poco; muy largo se corta en la tarjeta.
  const texto = largo >= 40 && largo <= 240 ? 2 : largo > 240 ? 1 : 0
  return foto + nota + texto
}

export function ordenarPorUtilidad<T extends Ordenable>(lista: readonly T[]): T[] {
  return [...lista].sort((a, b) => utilidad(b) - utilidad(a) || b.creadaEn.localeCompare(a.creadaEn))
}

/**
 * Para la portada: intercala productos (uno de cada uno por vuelta, en el orden
 * de utilidad) para que el carrusel no muestre cinco reseñas seguidas del mismo.
 */
export function intercalarPorProducto<T extends Ordenable>(lista: readonly T[], limite: number): T[] {
  const grupos = new Map<string, T[]>()
  for (const r of ordenarPorUtilidad(lista)) {
    const grupo = grupos.get(r.productoId)
    if (grupo) grupo.push(r)
    else grupos.set(r.productoId, [r])
  }
  const colas = [...grupos.values()]
  const salida: T[] = []
  for (let vuelta = 0; salida.length < limite && colas.some((c) => c.length > vuelta); vuelta++) {
    // En cada vuelta, el mejor siguiente de cada producto, ordenados entre sí por utilidad.
    const ronda = ordenarPorUtilidad(colas.map((c) => c[vuelta]).filter((r): r is T => r !== undefined))
    salida.push(...ronda.slice(0, limite - salida.length))
  }
  return salida
}
