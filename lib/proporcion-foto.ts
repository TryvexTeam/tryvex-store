/**
 * Proporción del marco de la foto de una reseña.
 *
 * El marco sigue la forma real de la foto, pero acotada: una foto muy alta haría
 * una tarjeta enorme y una muy panorámica, una franja ilegible. Dentro del rango
 * el marco calza exacto y nada se recorta; fuera de él la foto se muestra entera
 * dentro del marco (`contener`), con fondo a los lados, en vez de cortarla.
 *
 * Sin medidas (reseña antigua, o foto que el navegador no supo medir) se usa
 * 16:9 recortando, que era el marco de siempre.
 *
 * Lo comparten la tienda, el panel y la vista previa del formulario: así lo que
 * se ve al subir es lo que verá el cliente.
 */
export const PROPORCION_MINIMA = 4 / 5
export const PROPORCION_MAXIMA = 1.91
export const PROPORCION_SIN_MEDIDAS = 16 / 9

export type MarcoFoto = { proporcion: number; contener: boolean }

export function marcoFoto(ancho?: number | null, alto?: number | null): MarcoFoto {
  if (!ancho || !alto || ancho < 1 || alto < 1) return { proporcion: PROPORCION_SIN_MEDIDAS, contener: false }
  const real = ancho / alto
  return {
    proporcion: Math.min(Math.max(real, PROPORCION_MINIMA), PROPORCION_MAXIMA),
    contener: real < PROPORCION_MINIMA || real > PROPORCION_MAXIMA,
  }
}
