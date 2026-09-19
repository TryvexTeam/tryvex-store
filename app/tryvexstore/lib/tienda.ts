import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { urlPublica } from '@/lib/imagenes'
import { leerConfiguracion, type ConfiguracionTienda } from '@/lib/configuracion'

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
  nombre: string
  hex: string
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
}

export interface CategoriaTienda {
  id: string
  nombre: string
  slug: string
  descripcion: string | null
  productos: ProductoTienda[]
}

export interface Vitrina {
  productos: ProductoTienda[]
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
        .select('id,sku,slug,nombre,descripcion,precio_base,precio_antes,imagen_url,etiqueta,categoria_id,publicado_at')
        .eq('estado', 'publicado')
        .order('publicado_at', { ascending: false, nullsFirst: false }),
      db.from('categorias').select('id,nombre,slug,descripcion').eq('activo', true).order('orden'),
      db.from('producto_variantes').select('producto_id,nombre,color_hex').eq('activo', true).order('orden'),
      db.from('v_stock_actual').select('producto_id,stock'),
      leerConfiguracion(),
      db.from('precio_tramos').select('producto_id,min_unidades,max_unidades,precio_unitario').eq('activo', true),
    ])

  const stockPor = new Map((stock ?? []).map((s) => [s.producto_id as string, Number(s.stock ?? 0)]))

  /**
   * Precio de UNA unidad, que es el que ve quien mira la vitrina.
   *
   * No sirve `precio_base`: en el catálogo real está cargado con el valor
   * mayorista (30+ unidades), así que la grilla anunciaba $19.990 mientras el
   * checkout cobraba $25.000, el precio del tramo 1-4. Anunciar un precio y
   * cobrar otro rompe la confianza y, en Chile, infringe la Ley 19.496.
   * La vitrina cotiza igual que el checkout: manda el tramo que cubre 1 unidad.
   */
  const precioUnitarioPor = new Map<string, number>()
  for (const t of tramos ?? []) {
    const min = Number(t.min_unidades)
    const max = t.max_unidades === null ? Infinity : Number(t.max_unidades)
    if (min <= 1 && 1 <= max) precioUnitarioPor.set(t.producto_id as string, Number(t.precio_unitario))
  }

  const vitrina: ProductoTienda[] = (productos ?? []).map((p) => {
    const unidades = stockPor.get(p.id) ?? 0
    const antes = p.precio_antes === null ? null : Number(p.precio_antes)
    const precio = precioUnitarioPor.get(p.id) ?? Number(p.precio_base)
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
      colores: (variantes ?? [])
        .filter((v) => v.producto_id === p.id && v.color_hex)
        .map((v) => ({ nombre: v.nombre, hex: v.color_hex as string })),
      href: `/producto/${encodeURIComponent(p.slug)}`,
    }
  })

  // Solo categorías con algo que mostrar: una franja vacía es una promesa rota.
  const conProductos: CategoriaTienda[] = (categorias ?? [])
    .map((c) => ({ ...c, productos: vitrina.filter((p) => p.categoriaId === c.id) }))
    .filter((c) => c.productos.length > 0)

  // El héroe muestra lo que está a la venta: primero lo disponible y con foto.
  const destacado =
    vitrina.find((p) => !p.agotado && p.imagen) ?? vitrina.find((p) => !p.agotado) ?? vitrina[0] ?? null

  return { productos: vitrina, categorias: conProductos, destacado, configuracion }
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
