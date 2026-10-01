import type { Metadata } from 'next'
import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { EditorPieza, type PiezaEditable } from './editor'
import { EditorFoco } from './editor-foco'
import { ListaEscenas } from './lista-escenas'
import { CLAVE_FOCO, escenaFocoDe } from '@/lib/foco'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Portada' }

/**
 * Portada editable.
 *
 * Las imágenes y textos del héroe y de las franjas editoriales vivían escritos
 * en el código: cambiar un banner obligaba a tocar archivos y volver a
 * desplegar. Desde aquí el equipo edita cada ranura y la portada se actualiza
 * sola. Las ranuras no se crean ni se borran a mano: cada una corresponde a un
 * lugar real de la página, y una clave inventada sería contenido que nadie ve.
 */
export default async function PortadaPanel() {
  const db = crearClienteAdministrador()
  const [{ data }, { data: listaProductos }, { data: listaCategorias }] = await Promise.all([
    db.from('secciones_landing').select('clave,titulo,visible,orden,contenido').order('orden'),
    db.from('productos').select('slug,nombre,precio_base').eq('activo', true).order('nombre'),
    db.from('categorias').select('slug,nombre').eq('activo', true).order('orden'),
  ])

  const piezas: PiezaEditable[] = (data ?? []).map((f) => ({
    clave: f.clave as string,
    titulo: (f.titulo as string) ?? null,
    visible: Boolean(f.visible),
    orden: Number(f.orden ?? 0),
    contenido: (f.contenido ?? {}) as Record<string, unknown>,
  }))

  const heroe = piezas.filter((p) => p.clave.startsWith('heroe-'))
  const editoriales = piezas.filter((p) => p.clave.startsWith('editorial-'))
  const foco = piezas.find((p) => p.clave === CLAVE_FOCO)
  const productos = (listaProductos ?? [])
    .filter((p): p is { slug: string; nombre: string; precio_base: number } => Boolean(p.slug && p.nombre))
  // El precio real de cada producto, para que la vista previa de una cápsula muestre «Desde $…» como la tienda.
  const precios = Object.fromEntries(productos.map((p) => [p.slug, Number(p.precio_base)]))
  const conNombre = (f: { slug: string | null; nombre: string | null }): f is { slug: string; nombre: string } => Boolean(f.slug && f.nombre)
  const opciones = {
    categorias: (listaCategorias ?? []).filter(conNombre).map((f) => ({ valor: f.slug, etiqueta: f.nombre })),
    productos: productos.map((f) => ({ valor: f.slug, etiqueta: f.nombre })),
  }

  return (
    <main className="mx-auto w-full max-w-[1204px] px-[22px] py-8">
      <header>
        <h1 className="text-[28px] leading-[1.1] font-semibold tracking-seccion text-tinta">Portada.</h1>
        <p className="mt-2 text-[15px] text-tinta-suave">
          Cambia las imágenes, los textos y a dónde lleva cada pieza de la portada.
          Los cambios se ven de inmediato en la tienda.
        </p>
      </header>

      {piezas.length === 0 ? (
        <p className="mt-8 rounded-[var(--radius-widget)] bg-papel p-6 text-[15px] text-tinta-suave ring-1 ring-borde">
          Todavía no hay piezas cargadas. Mientras tanto, la portada muestra su contenido por defecto.
        </p>
      ) : (
        <>
          <section aria-labelledby="heroe-titulo" className="mt-8">
            <h2 id="heroe-titulo" className="text-[19px] font-semibold tracking-cuerpo text-tinta">
              Carrusel principal
            </h2>
            <p className="mt-1 text-[14px] text-gris">
              Las escenas que se turnan arriba de todo. Toca una para editarla con vista previa; nada cambia en la tienda hasta que publiques.
            </p>
            <div className="mt-4">
              <ListaEscenas piezas={heroe} opciones={opciones} precios={precios} />
            </div>
          </section>

          {foco && (
            <section aria-labelledby="foco-titulo" className="mt-10">
              <h2 id="foco-titulo" className="text-[19px] font-semibold tracking-cuerpo text-tinta">
                Escena en foco
              </h2>
              <p className="mt-1 text-[14px] text-gris">
                La escena grande de «Diseñados para acompañarte»: video, producto y frases.
              </p>
              <div className="mt-4">
                <EditorFoco escena={escenaFocoDe(foco.contenido)} visible={foco.visible} productos={productos} />
              </div>
            </section>
          )}

          <section aria-labelledby="editorial-titulo" className="mt-10">
            <h2 id="editorial-titulo" className="text-[19px] font-semibold tracking-cuerpo text-tinta">
              Franjas de la portada
            </h2>
            <p className="mt-1 text-[14px] text-gris">
              Los bloques con foto que aparecen al bajar. {editoriales.length} en total.
            </p>
            <div className="mt-4 grid gap-4">
              {editoriales.map((p) => <EditorPieza key={p.clave} pieza={p} opciones={opciones} />)}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
