'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Marca } from '@/app/marca'
import { BotonBolsa } from './bolsa'
import { Megamenu } from './megamenu'
import { ESCENAS_BANNER } from '@/lib/campana'
import { EnlaceCuenta } from './enlace-cuenta'
import { Buscador } from './buscador'
import { BotonMenu, DURACION_CIERRE, MenuMovil, type EstadoMenu } from './menu-movil'

export interface DestinoMenu {
  nombre: string
  href: string
  /** Segundo nivel del menú móvil: los productos de la categoría. */
  productos?: { nombre: string; href: string; imagen: string | null; precio: number }[]
  categorias?: DestinoMenu[]
  enlaces?: { nombre: string; href: string }[]
}

/**
 * Cabecera de la tienda.
 *
 * Hamburguesa hasta 834 px y barra completa desde ahí, como Apple: una
 * tableta de 768 recibe el menú del teléfono porque las categorías no caben
 * con holgura. En el teléfono el menú tiene dos niveles sin cambiar de
 * página, con la misma jerarquía que el escritorio.
 */
export function Cabecera({ destinos, ayuda, sobreHeroe = false }: { destinos: DestinoMenu[]; ayuda: string | null; sobreHeroe?: boolean }) {
  // El menú del teléfono pasa por cuatro estados para poder animar la entrada
  // (nace cerrado y un cuadro después se abre) y la salida (queda montado
  // mientras se recoge).
  const [estadoMenu, setEstadoMenu] = useState<EstadoMenu>('cerrado')
  const abierto = estadoMenu === 'entrando' || estadoMenu === 'abierto'
  const menuVisible = estadoMenu !== 'cerrado'
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [nivel, setNivel] = useState<DestinoMenu | null>(null)
  const [mega, setMega] = useState<DestinoMenu | null>(null)
  const [servicio, setServicio] = useState<DestinoMenu | null>(null)
  const [disparador, setDisparador] = useState<string | null>(null)
  const [enHeroe, setEnHeroe] = useState(sobreHeroe)
  const [tono, setTono] = useState<string>(ESCENAS_BANNER[0]?.tono ?? 'oscuro')
  const cabecera = useRef<HTMLElement>(null)
  const origen = useRef<HTMLAnchorElement | null>(null)
  const devolviendoFoco = useRef(false)
  const demora = useRef<ReturnType<typeof setTimeout> | null>(null)
  const categorias = destinos.find((d) => d.categorias)?.categorias ?? destinos.filter((d) => d.productos)
  // Transparente solo en la parte alta del héroe: al bajar, el héroe se recoge en tarjeta
  // (v15) y los enlaces blancos de los costados quedaban sobre el fondo claro de la página.
  const [arriba, setArriba] = useState(true)
  useEffect(() => {
    if (!sobreHeroe) return
    let cuadro = 0
    const medir = () => { cuadro = 0; setArriba(window.scrollY < window.innerHeight * 0.06) }
    const alMover = () => { if (!cuadro) cuadro = requestAnimationFrame(medir) }
    medir()
    addEventListener('scroll', alMover, { passive: true })
    return () => { removeEventListener('scroll', alMover); cancelAnimationFrame(cuadro) }
  }, [sobreHeroe])
  const transparente = sobreHeroe && enHeroe && arriba && !mega && !servicio && !abierto
  function cancelarCierre() { if (demora.current) clearTimeout(demora.current) }
  function cerrarMega() { cancelarCierre(); setMega(null); setServicio(null); setDisparador(null) }
  function programarCierre() { cancelarCierre(); demora.current = setTimeout(cerrarMega, 120) }
  function abrirMega(d: DestinoMenu, el: HTMLAnchorElement) {
    cancelarCierre()
    origen.current = el
    setDisparador(d.nombre)
    setServicio(d.enlaces ? d : null)
    setMega(d.enlaces ? null : d.productos ? d : categorias[0] ?? d)
  }
  useEffect(() => () => cancelarCierre(), [])
  useEffect(() => {
    if (!sobreHeroe) return
    const heroe = document.querySelector<HTMLElement>('.heroe-escenario')
    if (!heroe) { setEnHeroe(false); return }
    const leerTono = () => setTono(heroe.dataset.tono ?? 'oscuro')
    leerTono()
    const mutaciones = new MutationObserver(leerTono)
    mutaciones.observe(heroe, { attributes: true, attributeFilter: ['data-tono'] })
    let interseccion: IntersectionObserver | undefined
    const observar = () => {
      interseccion?.disconnect()
      const alto = cabecera.current?.offsetHeight ?? 48
      interseccion = new IntersectionObserver(([entrada]) => setEnHeroe(entrada.isIntersecting), { rootMargin: `-${alto}px 0px 0px 0px` })
      interseccion.observe(heroe)
    }
    observar()
    const medidas = new ResizeObserver(observar)
    if (cabecera.current) medidas.observe(cabecera.current)
    return () => { mutaciones.disconnect(); medidas.disconnect(); interseccion?.disconnect() }
  }, [sobreHeroe])
  useEffect(() => {
    const ancho = matchMedia('(min-width: 834px)')
    const ajustar = () => { if (!ancho.matches) cerrarMega() }
    ancho.addEventListener('change', ajustar)
    return () => ancho.removeEventListener('change', ajustar)
  }, [])

  // Con el menú abierto la franja de despachos se va y la barra sube al borde,
  // como en Apple: el marcador en <html> lo lee `globals.css`.
  useEffect(() => {
    if (!menuVisible) return
    document.documentElement.dataset.menuMovil = estadoMenu
    return () => { delete document.documentElement.dataset.menuMovil }
  }, [menuVisible, estadoMenu])
  useEffect(() => () => { if (reloj.current) clearTimeout(reloj.current) }, [])

  useEffect(() => {
    if (!menuVisible) return
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const alTeclado = (e: KeyboardEvent) => e.key === 'Escape' && cerrar()
    // Si la ventana crece hasta la barra completa, el menú móvil sobra.
    const ancho = window.matchMedia('(min-width: 834px)')
    const alCrecer = () => ancho.matches && cerrar()
    document.addEventListener('keydown', alTeclado)
    ancho.addEventListener('change', alCrecer)
    return () => {
      document.body.style.overflow = previo
      document.removeEventListener('keydown', alTeclado)
      ancho.removeEventListener('change', alCrecer)
    }
  }, [menuVisible])

  function abrir() {
    if (reloj.current) clearTimeout(reloj.current)
    setNivel(null)
    setEstadoMenu('entrando')
    // Dos cuadros: el primero pinta la cortina recogida, el segundo la suelta.
    requestAnimationFrame(() => requestAnimationFrame(() => setEstadoMenu('abierto')))
  }

  function cerrar() {
    if (!abierto) return
    if (reloj.current) clearTimeout(reloj.current)
    setEstadoMenu('cerrando')
    reloj.current = setTimeout(() => { setEstadoMenu('cerrado'); setNivel(null) }, DURACION_CIERRE)
  }

  // El menú va fuera del header: el desenfoque de la cabecera crea un bloque
  // contenedor y un hijo fixed quedaría recortado a sus 48 px de alto.


  return (
    <>
    <header ref={cabecera} data-transparente={transparente} data-tono={tono} className={`cabecera-tienda sticky top-0 z-50 ${sobreHeroe ? '-mb-12 n:-mb-11' : ''}`}
      onPointerEnter={cancelarCierre} onPointerLeave={programarCierre}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) programarCierre() }}
      onKeyDown={(e) => { if (e.key === 'Escape' && (mega || servicio)) { e.preventDefault(); cerrarMega(); devolviendoFoco.current = true; origen.current?.focus(); devolviendoFoco.current = false; } }}>
      {/* En teléfono, una sola fila: menú y marca a la izquierda, íconos a la
          derecha. Con la marca centrada en una grilla de tres columnas, los tres
          íconos (132 px) no cabían en su tercio y la lupa quedaba sobre la marca. */}
      <nav aria-label="Principal" className="flex h-12 items-center gap-1 px-[12px] n:mx-auto n:h-11 n:w-full n:max-w-[1024px] n:gap-2 n:px-[22px]">
        <Link href="/" aria-label="Tryvex, inicio" onClick={cerrar} className="cabecera-se-oculta order-1 shrink-0 rounded-md p-1 text-[17px] font-semibold tracking-cuerpo n:mr-3">
          <Marca size={18} className="!text-inherit" />
        </Link>

        <ul className="hidden min-w-0 items-center text-[11px] leading-tight n:order-2 n:flex n:flex-1 n:justify-between d:text-[12px]">
          {/* La clave es el nombre: con una sola categoría, su ancla coincide
              con la de «Lo último» y el href se repite. */}
          {destinos.map((d) => (
            <li key={d.nombre} className="relative min-w-0">
              <a href={d.href} className="tienda-enlace flex h-11 items-center px-2 tracking-apoyo" aria-expanded={d.enlaces || d.href === '/tienda' ? disparador === d.nombre : undefined} aria-controls={d.enlaces ? 'menu-servicio' : d.href === '/tienda' ? 'megamenu-tienda' : undefined}
                onPointerEnter={(e) => { if (d.enlaces || d.href === '/tienda') abrirMega(d, e.currentTarget); else cerrarMega() }}
                onFocus={(e) => { if (devolviendoFoco.current) return; if (d.enlaces || d.href === '/tienda') abrirMega(d, e.currentTarget); else cerrarMega() }}
                onClick={cerrarMega}>{d.nombre}</a>
              
            </li>
          ))}
        </ul>

        <div className="cabecera-se-oculta order-3 ml-auto flex shrink-0 items-center gap-0.5 n:ml-auto n:gap-1">
        <Buscador categorias={categorias} alAbrir={() => { cerrar(); cerrarMega() }} />
        <EnlaceCuenta alCerrar={cerrar} />
        <BotonBolsa />
        </div>
        <BotonMenu abierto={abierto} alTocar={() => (abierto ? cerrar() : abrir())} />
      </nav>
      {mega && <Megamenu categorias={categorias} activa={mega} seleccionar={(c) => { cancelarCierre(); setMega(c) }} cerrar={cerrarMega} />}
      {/* Servicio al cliente usa el MISMO panel ancho que la tienda. Antes caía
          como un desplegable de 256 px dentro de su <li>: dos mecánicas
          distintas en la misma barra, y el ojo lo lee como un error. */}
      {servicio && (
        <div id="menu-servicio" role="region" aria-label={servicio.nombre} className="tienda-megamenu absolute inset-x-0 top-full hidden max-h-[calc(100dvh-48px)] overflow-y-auto bg-papel text-tinta n:block">
          <div className="mx-auto grid max-w-[1024px] grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-10 px-[22px] pt-8 pb-14">
            <div>
              <p className="mb-3 text-[12px] tracking-apoyo text-gris">{servicio.nombre}</p>
              <ul className="space-y-1.5">
                {servicio.enlaces?.map((enlace) => (
                  <li key={enlace.href}>
                    <Link href={enlace.href} onClick={cerrarMega} className="block text-[24px] leading-[1.25] font-semibold tracking-tarjeta hover:text-spark">{enlace.nombre}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </header>
    {/* El velo vive FUERA del header a propósito. Dentro, el backdrop-filter de
        la cabecera crea un contexto de apilamiento propio que lo atrapaba: el
        desenfoque terminaba pintando sobre el propio panel y lo partía en
        bandas. Aquí cubre la página con z-40, por debajo del header (z-50) y
        del panel que cuelga de él. */}
    {(mega || servicio) && <div aria-hidden className="velo-megamenu" />}

      <MenuMovil estado={estadoMenu} destinos={destinos} nivel={nivel} alElegirNivel={setNivel} alVolver={() => setNivel(null)} alCerrar={cerrar} />
    </>
  )
}
