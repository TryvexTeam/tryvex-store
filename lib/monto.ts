/**
 * Lectura de montos escritos por una persona.
 *
 * `Number('25.990')` devuelve **25,99**: en el formato de número del navegador
 * el punto es decimal, pero en Chile es separador de miles. Escribir el precio
 * como uno lo escribe siempre —25.990— terminaba guardando veinticinco pesos
 * con noventa y nueve, o rechazando el campo si venía con `$` o espacios.
 *
 * El peso chileno no usa decimales, así que aquí se toman solo los dígitos: da
 * igual si escriben `25990`, `25.990`, `$25.990` o `25 990`.
 */

/** `null` si no hay ningún dígito que leer. */
export function montoDesdeTexto(valor: FormDataEntryValue | string | null | undefined): number | null {
  const crudo = typeof valor === 'string' ? valor : valor instanceof File ? '' : String(valor ?? '')
  const digitos = crudo.replace(/\D/g, '')
  if (digitos === '') return null
  const n = Number(digitos)
  return Number.isSafeInteger(n) ? n : null
}

/** Lo mismo, pero devolviendo `0` cuando el campo viene vacío. */
export function montoDesdeTextoODefecto(valor: FormDataEntryValue | string | null | undefined, defecto = 0): number {
  return montoDesdeTexto(valor) ?? defecto
}
