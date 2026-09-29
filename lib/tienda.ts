import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { urlPublica } from '@/lib/imagenes'
import { leerConfiguracion, type ConfiguracionTienda } from '@/lib/configuracion'
import { precioUnitarioPublicado } from '@/lib/cotizacion'

/**
 * Vitrina: lo que la tienda pública puede ver del catálogo.
 *
 * Es la única puerta entre la base y la tienda. Filtra por `estado =
 * 'publicado'` aquí, en el servidor, y devuelve solo columnas de vitrina:
 * el costo, las notas internas y el stock exacto nunca salen hacia el
 * navegador. Lo que el equipo publica en el panel aparece aquí sin pasos
 * manuales.
 */

/** Bajo este stock la card avisa «Últimas unidades» sola. */
const POCAS_UNIDADES = 5
const LARGO_FRASE = 90

export interface ColorTienda {
  /** Id de la variante: la card lo lleva a la ficha para abrirla con ese color. */
  id: string
  nombre: string
  /** Color plano del círculo. */
  hex: string | null
  /** Imagen del círculo (diseño de dos tonos, textura). Manda sobre `hex`. */
  muestra: string | null
  /** Foto de la variante: la card la muestra al elegir el círculo. */
  imagen: string | null
}

export interface ProductoTienda {
  id: string
  sku: string
  slug: string
  nombre: string
  frase: string | null
  precio: number
  precioAntes: number | null
  imagen: string | null
  etiqueta: string | null
  agotado: boolean
  categoriaId: string | null
  colores: ColorTienda[]
  href: string
  /** Cuándo se publicó: ordena «Más recientes» en /tienda. */
  publicado?: string | null
}

export interface CategoriaTienda {
  id: string
  nombre: string
  slug: string
  descripcion: string | null
  /** Foto elegida en el panel para la fila de familias. Nula: la del primer producto. */
  imagen: string | null
  productos: ProductoTienda[]
}

export interface Vitrina {
  /** En el orden que eligió el equipo en el panel (Productos → Orden). */
  productos: ProductoTienda[]
  /** «Todo lo nuevo» de la portada, en su propio orden. */
  loNuevo: ProductoTienda[]
  categorias: CategoriaTienda[]
  destacado: ProductoTienda | null
  configuracion: ConfiguracionTienda | null
}

/** Primera oración de la descripción: la card tiene lugar para una frase, no para un párrafo. */
function fraseDe(descripcion: string | null): string | null {
  const limpia = descripcion?.trim()
  if (!limpia) return null
  const primera = limpia.split(/(?<=[.!?])\s/)[0]
  return primera.length > LARGO_FRASE ? `${primera.slice(0, LARGO_FRASE - 1).trimEnd()}…` : primera
}

/**
 * La etiqueta la escribe el equipo; si no la hay, la vitrina avisa sola
 * cuando quedan pocas. Un producto agotado no lleva etiqueta de urgencia.
 */
function etiquetaDe(propia: string | null, stock: number): string | null {
  if (stock <= 0) return null
  if (propia) return propia
  return stock <= POCAS_UNIDADES ? 'Últimas unidades' : null
}

export async function leerVitrina(): Promise<Vitrina> {
  const db = crearClienteAdministrador()

  const [{ data: productos }, { data: categorias }, { data: variantes }, { data: stock }, configuracion, { data: tramos }] =
    await Promise.all([
      db
        .from('productos')
        .select('id,sku,slug,nombre,descripcion,precio_base,precio_antes,imagen_url,etiqueta,categoria_id,publicado_at,orden,nuevo_orden')
        .eq('estado', 'publicado')
        // El orden lo elige el equipo arrastrando en el panel; lo que aún no
        // tiene lugar (recién creado) va al final, lo más nuevo primero.
        .order('orden', { ascending: true, nullsFirst: false })
        .order('publicado_at', { ascending: false, nullsFirst: false }),
      db.from('categorias').select('id,nombre,slug,descripcion,imagen_url').eq('activo', true).order('orden'),
      db.from('producto_variantes').select('id,producto_id,nombre,color_hex,muestra_url,imagen_url').eq('activo', true).order('orden'),
      db.from('v_stock_actual').select('producto_id,stock'),
      leerConfiguracion(),
      db.from('precio_tramos').select('producto_id,min_unidades,max_unidades,precio_unitario').eq('activo', true),
    ])

  const stockPor = new Map((stock ?? []).map((s) => [s.producto_id as string, Number(s.stock ?? 0)]))

  /**
   * Precio de UNA unidad, que es el que ve quien mira la vitrina.
   *
   * Se calcula con `precioUnitarioPublicado`, la misma función que usa el
   * checkout, para que la grilla no pueda anunciar un número distinto del que
   * se cobra. Antes cada pantalla hacía su propia cuenta y llegamos a mostrar
   * un precio mientras se cobraba otro — además de romper la confianza, en
   * Chile el precio exhibido obliga (Ley 19.496).
   */
  type TramoVitrina = { min_unidades: number; max_unidades: number | null; precio_unitario: number | string }
  const tramosPor = new Map<string, TramoVitrina[]>()
  for (const t of tramos ?? []) {
    const lista = tramosPor.get(t.producto_id as string) ?? []
    lista.push(t as TramoVitrina)
    tramosPor.set(t.producto_id as string, lista)
  }

  const vitrina: ProductoTienda[] = (productos ?? []).map((p) => {
    const unidades = stockPor.get(p.id) ?? 0
    const antes = p.precio_antes === null ? null : Number(p.precio_antes)
    const precio = precioUnitarioPublicado(Number(p.precio_base), tramosPor.get(p.id) ?? [])
    return {
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      nombre: p.nombre,
      frase: fraseDe(p.descripcion),
      precio,
      precioAntes: antes !== null && antes > precio ? antes : null,
      imagen: p.imagen_url ? urlPublica(p.imagen_url) : null,
      etiqueta: etiquetaDe(p.etiqueta, unidades),
      agotado: unidades <= 0,
      categoriaId: p.categoria_id,
      // Solo variantes con algo que pintar: un color o una muestra.
      colores: (variantes ?? [])
        .filter((v) => v.producto_id === p.id && (v.color_hex || v.muestra_url))
        .map((v) => ({
          id: v.id as string,
          nombre: v.nombre as string,
          hex: (v.color_hex as string | null) ?? null,
          muestra: v.muestra_url ? urlPublica(v.muestra_url as string) : null,
          imagen: v.imagen_url ? urlPublica(v.imagen_url as string) : null,
        })),
      href: `/producto/${encodeURIComponent(p.slug)}`,
      publicado: p.publicado_at,
    }
  })

  // «Todo lo nuevo»: los que el equipo eligió, en su orden. Si todavía no
  // eligió ninguno, los ocho publicados más recientes.
  const posicionNueva = new Map(
    (productos ?? []).filter((p) => p.nuevo_orden !== null).map((p) => [p.id as string, Number(p.nuevo_orden)])
  )
  const loNuevo =
    posicionNueva.size > 0
      ? vitrina.filter((p) => posicionNueva.has(p.id)).sort((a, b) => posicionNueva.get(a.id)! - posicionNueva.get(b.id)!)
      : [...vitrina].sort((a, b) => (b.publicado ?? '').localeCompare(a.publicado ?? '')).slice(0, 8)

  // Solo categorías con algo que mostrar: una franja vacía es una promesa rota.
  const conProductos: CategoriaTienda[] = (categorias ?? [])
    .map(({ imagen_url, ...c }) => ({
      ...c,
      imagen: imagen_url ? urlPublica(imagen_url) : null,
      productos: vitrina.filter((p) => p.categoriaId === c.id),
    }))
    .filter((c) => c.productos.length > 0)

  // El héroe muestra lo que está a la venta: primero lo disponible y con foto.
  const destacado =
    vitrina.find((p) => !p.agotado && p.imagen) ?? vitrina.find((p) => !p.agotado) ?? vitrina[0] ?? null

  return { productos: vitrina, loNuevo, categorias: conProductos, destacado, configuracion }
}

/** Cifras de las escenas de promoción del héroe, siempre derivadas de la base. */
export interface PromoHeroe {
  /** Precio unitario más bajo de un tramo activo y desde cuántas unidades aplica. */
  mayorista: { precio: number; desde: number } | null
  /** Mayor ahorro porcentual de un tramo frente al precio base del mismo producto. */
  ahorroMaximo: number | null
}

/**
 * Lee los tramos por volumen de los productos publicados. Solo expone dos
 * cifras agregadas: ningún costo ni dato interno llega al navegador.
 */
export async function leerPromosHeroe(): Promise<PromoHeroe> {
  const db = crearClienteAdministrador()
  const { data: productos } = await db.from('productos').select('id,precio_base').eq('estado', 'publicado')
  const base = new Map((productos ?? []).map((p) => [p.id as string, Number(p.precio_base)]))
  if (base.size === 0) return { mayorista: null, ahorroMaximo: null }

  const { data: tramos } = await db
    .from('precio_tramos')
    .select('producto_id,min_unidades,precio_unitario')
    .eq('activo', true)
    .in('producto_id', [...base.keys()])

  let mayorista: PromoHeroe['mayorista'] = null
  let ahorroMaximo: number | null = null
  for (const t of tramos ?? []) {
    const precio = Number(t.precio_unitario)
    const referencia = base.get(t.producto_id as string)
    if (!Number.isFinite(precio) || precio <= 0 || !referencia) continue
    if (t.min_unidades > 1 && (!mayorista || precio < mayorista.precio)) mayorista = { precio, desde: t.min_unidades }
    const ahorro = Math.floor(((referencia - precio) / referencia) * 100)
    if (ahorro > 0 && (ahorroMaximo === null || ahorro > ahorroMaximo)) ahorroMaximo = ahorro
  }
  return { mayorista, ahorroMaximo }
}
