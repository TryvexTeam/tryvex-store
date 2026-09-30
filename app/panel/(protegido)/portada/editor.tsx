'use client'

import { useState, useTransition } from 'react'
import { Casilla } from '@/components/casilla'
import { guardarPieza, subirImagenPieza } from './acciones'
import { CampoVideo } from './campo-video'
import { CampoDestino, type OpcionesDestino } from './campo-destino'
import { CampoZonas } from './campo-zonas'
import { CampoColores } from './campo-colores'
import { CampoCapsulas } from './campo-capsulas'
import { ESCENAS_BANNER } from '@/lib/campana'

export interface PiezaEditable {
  clave: string
  titulo: string | null
  visible: boolean
  orden: number
  contenido: Record<string, unknown>
}

const rotulo = 'mb-1 block text-[12px] font-medium text-gris'
const campo =
  'w-full min-h-[44px] rounded-[10px] bg-papel px-3 py-2 text-[15px] text-tinta ring-1 ring-borde focus:ring-2 focus:ring-spark focus:outline-none'

const txt = (c: Record<string, unknown>, k: string): string => (typeof c[k] === 'string' ? (c[k] as string) : '')

/**
 * Campo de imagen con vista previa.
 *
 * Editar una ruta de imagen a ciegas es la forma más fácil de reemplazar la
 * pieza equivocada: las rutas se parecen entre sí y el error solo se descubre
 * mirando la tienda publicada. La miniatura se actualiza mientras se escribe,
 * así queda claro qué se está cambiando antes de guardar.
 *
 * Es un `img` normal y no el componente optimizado a propósito: la ruta es
 * arbitraria y puede apuntar a cualquier origen mientras se edita, incluso a
 * uno que todavía no esté permitido en la configuración.
 */
function CampoImagen({ id, clave, nombre, etiqueta, valor, alCambiar, proporcion, pista }: {
  id: string
  clave: string
  nombre: string
  etiqueta: string
  valor: string
  alCambiar: (v: string) => void
  proporcion: string
  pista: string
}) {
  const [falla, setFalla] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [encima, setEncima] = useState(false)

  async function subir(archivo: File | undefined) {
    if (!archivo) return
    setError(null)
    setSubiendo(true)
    const datos = new FormData()
    datos.set('clave', clave)
    datos.set('campo', nombre)
    datos.set('archivo', archivo)
    const r = await subirImagenPieza(datos)
    setSubiendo(false)
    if (r.ok) {
      setFalla(false)
      alCambiar(r.url)
    } else {
      setError(r.error)
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={rotulo}>{etiqueta}</label>
        <span className="text-[11px] text-gris">{pista}</span>
      </div>

      {/* La imagen actual es la zona de arrastre: se ve qué se va a reemplazar
          y se suelta el archivo nuevo justo encima. */}
      <div
        onDragOver={(e) => { e.preventDefault(); setEncima(true) }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => { e.preventDefault(); setEncima(false); void subir(e.dataTransfer.files?.[0]) }}
        className={`relative ${proporcion} w-full overflow-hidden rounded-[12px] bg-papel-alt ring-1 transition-colors ${
          encima ? 'ring-2 ring-spark' : 'ring-borde'
        }`}
      >
        {valor && !falla ? (
          // Imagen sin optimizar a propósito: la ruta es arbitraria mientras se
          // edita y puede apuntar a un origen aún no permitido.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={valor} alt="" onError={() => setFalla(true)} onLoad={() => setFalla(false)} className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center px-3 text-center text-[12px] text-gris">
            {valor ? 'No pudimos cargar esta imagen' : 'Sin imagen'}
          </span>
        )}

        {subiendo && (
          <span className="absolute inset-0 grid place-items-center bg-papel/80 text-[13px] font-medium text-tinta">
            Subiendo…
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="presionable inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-papel-alt px-4 text-[14px] font-medium text-tinta ring-1 ring-borde hover:bg-papel">
          {valor ? 'Cambiar imagen' : 'Subir imagen'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
            onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = '' }}
            disabled={subiendo}
            className="sr-only"
          />
        </label>
        <span className="text-[12px] text-gris">o arrastra una aquí · máx. 5 MB</span>
      </div>

      {error && <p role="alert" className="mt-1.5 text-[12px] text-rojo">{error}</p>}

      {/* La ruta queda a la vista y editable: sirve para reutilizar una imagen
          ya subida sin volver a cargarla. */}
      <input
        id={id}
        name={nombre}
        value={valor}
        onChange={(e) => { setFalla(false); alCambiar(e.target.value) }}
        placeholder="/tienda/campana/banners/nombre-movil.webp"
        className={`${campo} mt-2 text-[12px]`}
      />
    </div>
  )
}

/** Un campo de texto de la pieza. Vacío = el texto que trae el código, que se muestra de ejemplo. */
function CampoTexto({ id, nombre, etiqueta, valor, porDefecto, ayuda, max = 240 }: {
  id: string
  nombre: string
  etiqueta: string
  valor: string
  porDefecto?: string
  ayuda?: string
  max?: number
}) {
  return (
    <div>
      <label htmlFor={id} className={rotulo}>{etiqueta}</label>
      <input id={id} name={nombre} defaultValue={valor} placeholder={porDefecto} maxLength={max} className={campo} />
      {ayuda && <p className="mt-1 text-[12px] text-gris">{ayuda}</p>}
    </div>
  )
}

export function EditorPieza({ pieza, opciones }: { pieza: PiezaEditable; opciones: OpcionesDestino }) {
  const c = pieza.contenido
  const k = pieza.clave
  const [fotoMovil, setFotoMovil] = useState(txt(c, 'foto_movil'))
  const [fotoEscritorio, setFotoEscritorio] = useState(txt(c, 'foto_escritorio'))
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
  const [guardando, empezar] = useTransition()

  // Las escenas del banner tienen su propio juego de textos (antetítulo,
  // titular en dos líneas, botón). Antes este editor guardaba «título» y
  // «bajada» genéricos que el banner no leía: se editaba y nada cambiaba.
  const esEscena = k.startsWith('heroe-')
  const escenaCodigo = esEscena ? ESCENAS_BANNER.find((e) => `heroe-${e.id}` === k) : undefined
  const esTarjeta = escenaCodigo?.estilo === 'tarjeta'

  return (
    <form
      action={(datos) =>
        empezar(async () => {
          const r = await guardarPieza(datos)
          setAviso(r.ok ? { ok: true, texto: 'Guardado. Ya se ve en la portada.' } : { ok: false, texto: r.error })
        })
      }
      className="rounded-[18px] bg-papel p-4 ring-1 ring-borde md:p-5"
    >
      <input type="hidden" name="clave" value={k} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-cuerpo text-tinta">{pieza.titulo ?? k}</h2>
          <p className="mt-0.5 text-[12px] text-gris">{k}</p>
        </div>
        <Casilla name="visible" defaultChecked={pieza.visible} className="!text-[14px] text-tinta-suave">
          Mostrar en la portada
        </Casilla>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {esEscena ? (
          <>
            <CampoTexto id={`an-${k}`} nombre="antetitulo" etiqueta="Texto chico de arriba" valor={txt(c, 'antetitulo')} porDefecto={escenaCodigo?.antetitulo} />
            <CampoTexto id={`et-${k}`} nombre="etiqueta" etiqueta="Nombre de la escena" valor={txt(c, 'etiqueta')} porDefecto={escenaCodigo?.etiqueta} max={40} ayuda="Se anuncia en los puntos de abajo del banner." />
            <CampoTexto id={`t1-${k}`} nombre="titulo_1" etiqueta="Titular, primera línea" valor={txt(c, 'titulo_1')} porDefecto={escenaCodigo?.titulo[0]} max={80} />
            <CampoTexto id={`t2-${k}`} nombre="titulo_2" etiqueta="Titular, segunda línea" valor={txt(c, 'titulo_2')} porDefecto={escenaCodigo?.titulo[1]} max={80} ayuda="Va resaltada en color." />
            <CampoTexto id={`b-${k}`} nombre="bajada" etiqueta="Bajada" valor={txt(c, 'bajada')} porDefecto={escenaCodigo?.bajada} />
            <CampoTexto id={`bt-${k}`} nombre="boton" etiqueta="Texto del botón" valor={txt(c, 'boton')} porDefecto={escenaCodigo?.promo === 'volumen' ? 'Ver ofertas' : 'Ver la tienda'} max={40} />
          </>
        ) : (
          <>
            <CampoTexto id={`t-${k}`} nombre="titulo" etiqueta="Título" valor={txt(c, 'titulo')} />
            <CampoTexto id={`b-${k}`} nombre="bajada" etiqueta="Bajada" valor={txt(c, 'bajada')} />
          </>
        )}

        <CampoImagen
          id={`fm-${k}`}
          clave={k}
          nombre="foto_movil"
          etiqueta="Imagen para teléfono"
          pista="vertical"
          valor={fotoMovil}
          alCambiar={setFotoMovil}
          proporcion="aspect-[4/5] max-w-[168px]"
        />
        <CampoImagen
          id={`fe-${k}`}
          clave={k}
          nombre="foto_escritorio"
          etiqueta="Imagen para escritorio"
          pista="panorámica"
          valor={fotoEscritorio}
          alCambiar={setFotoEscritorio}
          proporcion="aspect-[21/9] max-w-[320px]"
        />
        {esTarjeta && (
          <p className="md:col-span-2 -mt-2 text-[12px] text-gris">
            Esta escena hoy es una tarjeta de color. Si le subes una imagen o un video, la tarjeta se reemplaza por lo que subas. Con una sola imagen, se usa para teléfono y escritorio.
          </p>
        )}
        <div className="md:col-span-2">
          <label htmlFor={`a-${k}`} className={rotulo}>Descripción de la imagen</label>
          <input id={`a-${k}`} name="alt" defaultValue={txt(c, 'alt')} maxLength={240} className={campo} />
          {/* Quien no ve la imagen depende de este texto, y Google también lo lee. */}
          <p className="mt-1 text-[12px] text-gris">Describe qué se ve. Si la imagen es solo decorativa, déjalo vacío.</p>
        </div>

        {/* Solo las escenas del banner llevan video; las franjas usan fotos. */}
        {esEscena && <CampoVideo clave={k} valor={txt(c, 'video') || null} />}

        {esEscena && <CampoColores clave={k} tema={c.tema_texto} acento={c.acento} libre={c.acento_libre} />}

        {esEscena && (
          <div className="md:col-span-2">
            <Casilla name="sin_texto" defaultChecked={c.sin_texto === true} className="!text-[14px] text-tinta-suave">
              La imagen ya trae su propio texto: no mostrar titular ni botón encima
            </Casilla>
            <p className="mt-1 text-[12px] text-gris">Para afiches diseñados. La imagen ocupa la escena completa; usa las zonas de abajo para que se pueda tocar.</p>
          </div>
        )}

        <div className="md:col-span-2">
          <CampoDestino prefijo="destino" etiqueta={esEscena ? 'El botón (y la imagen) lleva a' : 'Al tocarla, lleva a'} inicial={(c.destino ?? {}) as { tipo?: string; valor?: string }} opciones={opciones} />
        </div>

        {esEscena && (
          <CampoZonas clave={k} divisionInicial={c.division} zonasIniciales={c.zonas} foto={fotoEscritorio || fotoMovil} opciones={opciones} />
        )}

        {esEscena && <CampoCapsulas iniciales={c.capsulas} opciones={opciones} />}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={guardando}
          className="presionable inline-flex min-h-[44px] items-center rounded-full bg-tinta px-6 text-[15px] font-medium text-papel hover:bg-tinta/90 disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        {aviso && (
          <p role="alert" className={`text-[14px] ${aviso.ok ? 'text-verde' : 'text-rojo'}`}>
            {aviso.texto}
          </p>
        )}
      </div>
    </form>
  )
}
