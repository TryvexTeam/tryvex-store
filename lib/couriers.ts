/**
 * Empresas de envío y cómo se sigue un paquete en cada una.
 *
 * Cada courier expone su seguimiento de forma distinta, y no todos aceptan el
 * código en la URL. Por eso aquí se distingue entre:
 *
 * - `enlaceDirecto`: abre el seguimiento de ESE envío, ya cargado.
 * - `pagina`: el buscador del courier, donde hay que pegar el código a mano.
 *
 * Donde no hay enlace directo no se inventa uno: se manda a la página y se le
 * da el código al comprador para copiar. Un botón que promete llevar al envío
 * y cae en un formulario vacío es peor que no ofrecerlo.
 */

export interface Courier {
  id: string
  nombre: string
  /** Buscador de seguimiento del courier. */
  pagina: string
  /** Enlace al envío concreto. `null` si el courier no lo permite. */
  enlaceDirecto: ((codigo: string) => string) | null
  /** Forma del código, para reconocerlo y para avisar si no calza. */
  formato: RegExp
  ayudaFormato: string
}

export const COURIERS: Courier[] = [
  {
    id: 'starken',
    nombre: 'Starken',
    pagina: 'https://www.starken.cl/seguimiento',
    // Verificado: `?codigo=` deja el número puesto en el buscador.
    enlaceDirecto: (codigo) => `https://www.starken.cl/seguimiento?codigo=${encodeURIComponent(codigo)}`,
    formato: /^\d{9}$/,
    ayudaFormato: '9 dígitos',
  },
  {
    id: 'correos',
    nombre: 'Correos de Chile',
    pagina: 'https://www.correos.cl/seguimiento-en-linea',
    // Su buscador es un portlet cuyos nombres de campo cambian entre versiones:
    // cualquier enlace armado a mano se rompería sin aviso.
    enlaceDirecto: null,
    formato: /^\d{12,13}$/,
    ayudaFormato: '13 dígitos (si el tuyo tiene 12, Correos calcula el verificador)',
  },
  {
    id: 'chilexpress',
    nombre: 'Chilexpress',
    pagina: 'https://www.chilexpress.cl/Views/ServicioAlCliente/EstadoEnvios.aspx',
    // Formato histórico de su buscador. No se pudo confirmar con un envío real,
    // así que si algún comprador reporta que no carga, se pasa a `null` y listo.
    enlaceDirecto: (codigo) =>
      `https://www.chilexpress.cl/Views/ChilexpressCL/Resultado-busqueda.aspx?DATA=${encodeURIComponent(codigo)}`,
    formato: /^\d{10,12}$/,
    ayudaFormato: '10 a 12 dígitos, sin letras',
  },
  {
    id: 'bluexpress',
    nombre: 'Blue Express',
    pagina: 'https://www.blue.cl/seguimiento/',
    enlaceDirecto: null,
    formato: /^\d{10}$/,
    ayudaFormato: '10 dígitos',
  },
]

export function courierPorId(id: string | null): Courier | null {
  if (!id) return null
  const buscado = id.trim().toLowerCase()
  return (
    COURIERS.find((c) => c.id === buscado) ??
    // El panel guarda el nombre escrito a mano («Correos de Chile»), no el id.
    COURIERS.find((c) => c.nombre.toLowerCase() === buscado) ??
    COURIERS.find((c) => buscado.includes(c.id)) ??
    null
  )
}

/**
 * Adivina el courier por la forma del código, para cuando no quedó anotado.
 *
 * Solo responde si un único courier calza: entre varios candidatos es preferible
 * no decir nada a mandar al comprador al courier equivocado.
 */
export function courierProbable(codigo: string): Courier | null {
  const limpio = codigo.replace(/\s|-/g, '')
  const calzan = COURIERS.filter((c) => c.formato.test(limpio))
  return calzan.length === 1 ? calzan[0] : null
}

/**
 * Resultado listo para la vista: solo datos planos.
 *
 * No se devuelve el `Courier` entero a propósito. Lleva una función y una
 * expresión regular, y React no deja pasar eso del servidor a un componente de
 * cliente.
 */
export interface EnlaceSeguimiento {
  /** Nombre del courier, para el texto del botón. */
  nombre: string
  url: string
  /** `true` si abre el envío; `false` si solo abre el buscador del courier. */
  directo: boolean
  codigo: string
}

/**
 * Arma a dónde mandar al comprador para ver su envío en el courier.
 *
 * `urlGuardada` gana sobre todo lo demás: si el equipo pegó a mano un enlace
 * que funciona, ese es el bueno.
 */
export function enlaceDeSeguimiento(params: {
  courier: string | null
  codigo: string | null
  urlGuardada?: string | null
}): EnlaceSeguimiento | null {
  const codigo = params.codigo?.trim().replace(/\s|-/g, '') ?? ''
  if (!codigo) return null

  const courier = courierPorId(params.courier) ?? courierProbable(codigo)
  if (!courier) return null

  if (params.urlGuardada?.startsWith('https://')) {
    return { nombre: courier.nombre, url: params.urlGuardada, directo: true, codigo }
  }

  const directo = courier.enlaceDirecto?.(codigo) ?? null
  return {
    nombre: courier.nombre,
    url: directo ?? courier.pagina,
    directo: Boolean(directo),
    codigo,
  }
}
