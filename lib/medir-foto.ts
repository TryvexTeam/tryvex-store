export type MedidasFoto = { ancho: number; alto: number }

/**
 * Mide una foto en el navegador, con la orientación EXIF ya aplicada: una foto
 * de celular tomada de pie se guarda «acostada» con una marca de giro, y su
 * tamaño real al verla es el girado. Devuelve null si el navegador no puede
 * leerla (p. ej. HEIC); en ese caso la foto se sube igual, sin medidas.
 */
export async function medirFoto(archivo: File): Promise<MedidasFoto | null> {
  try {
    const mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
    const medidas = { ancho: mapa.width, alto: mapa.height }
    mapa.close()
    return medidas.ancho > 0 && medidas.alto > 0 ? medidas : null
  } catch {
    return null
  }
}
