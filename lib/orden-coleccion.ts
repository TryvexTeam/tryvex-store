/**
 * Órdenes de /tienda. Viven fuera de `filtros-coleccion.tsx` porque ese
 * archivo es de cliente: la página (servidor) no puede leer valores
 * exportados desde un módulo 'use client', solo componentes.
 */
export const ORDENES = {
  destacados: 'Destacados',
  recientes: 'Más recientes',
  'menor-precio': 'Menor precio',
  'mayor-precio': 'Mayor precio',
} as const
export type Orden = keyof typeof ORDENES
/** Sin parámetro en la URL: el orden que eligió el equipo en el panel. */
export const ORDEN_POR_DEFECTO: Orden = 'destacados'

/** Tope de «Todo lo nuevo» en la portada: más allá, nadie desliza el carrusel. */
export const MAX_LO_NUEVO = 16
