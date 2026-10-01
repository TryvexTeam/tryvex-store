'use client'

import type { CSSProperties } from 'react'
import { DIVISIONES } from '@/lib/destinos-pieza'
import type { EscenaHeroe } from '@/lib/campana'
import type { BorradorEscena } from '@/lib/escena-borrador'
import { colorDeAcento, tonoDeTema } from '@/lib/temas-escena'
import { clp } from '@/lib/formato'

export type Pantalla = 'movil' | 'escritorio'

/**
 * Maqueta fiel de la escena, en pequeño: mismas proporciones, mismos
 * márgenes y mismas posiciones que el banner real. Todo se mide en `cqw`
 * (un centésimo del ancho de la maqueta), así el texto escala igual que en
 * la tienda y lo que aquí queda «abajo a la derecha» queda ahí allá.
 */
export function VistaPreviaEscena({ borrador: b, codigo, pantalla, precios }: {
  borrador: BorradorEscena
  codigo: EscenaHeroe | undefined
  pantalla: Pantalla
  precios: Record<string, number>
}) {
  const movil = pantalla === 'movil'
  const tono = tonoDeTema(b.tema_texto) ?? codigo?.tono ?? 'oscuro'
  const oscuro = tono === 'oscuro'
  const foto = movil ? b.foto_movil || b.foto_escritorio : b.foto_escritorio || b.foto_movil
  const esTarjeta = codigo?.estilo === 'tarjeta' && !foto && !b.video
  const acento = colorDeAcento(b.acento, b.acento_libre)
  const colorAcento = acento && acento !== 'degradado' ? acento : oscuro ? '#ff5a4f' : undefined
  const degradado = acento === 'degradado'
  const hayTitulo = Boolean(b.titulo_1 || b.titulo_2)
  const hayTexto = Boolean(b.antetitulo || hayTitulo || b.bajada || b.boton || (b.mostrar_cifra && codigo?.promo))
  const mostrarTexto = !b.sin_texto && hayTexto
  const arriba = codigo?.texto === 'arriba' && !esTarjeta
  // Unidades por pantalla: lo que en la tienda son 44 px sobre 390 de ancho, aquí son 11,3 cqw.
  const u = movil ? { ante: 3.8, titulo: 11.3, bajada: 4.4, boton: 4, cap: 3.9 } : { ante: 1.2, titulo: 5.5, bajada: 1.5, boton: 1.15, cap: 1.15 }
  const margen = movil ? { x: 4.1, arriba: 5.1, abajo: 21.5 } : { x: 2.2, arriba: 2.2, abajo: 6.7 }
  const tinta = oscuro ? '#fff' : '#1d1d1f'

  const texto = (
    <div className="text-center" style={{ color: tinta }}>
      {b.antetitulo && <p style={{ fontSize: `${u.ante}cqw`, fontWeight: 600, color: esTarjeta ? '#6e6e73' : colorAcento ?? (oscuro ? '#ff6b61' : '#6e6e73') }}>{b.antetitulo}</p>}
      {hayTitulo && (
        <p style={{ fontSize: `${u.titulo}cqw`, lineHeight: 1.03, fontWeight: 600, letterSpacing: '-0.02em', marginTop: '0.6cqw', maxWidth: '13ch', marginInline: 'auto', textWrap: 'balance' }}>
          {b.titulo_1}{' '}
          <span style={degradado ? { background: 'linear-gradient(110deg,#5ac8fa,#af52de 38%,#ff2d55 68%,#ff9500)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : colorAcento ? { color: colorAcento } : undefined}>{b.titulo_2}</span>
        </p>
      )}
      {b.mostrar_cifra && codigo?.promo && (
        <p style={{ fontSize: `${u.titulo * 0.8}cqw`, fontWeight: 700, lineHeight: 1, marginTop: '1.2cqw' }}>{codigo.promo === 'volumen' ? 'Hasta 38%' : '$6.500'}</p>
      )}
      {b.bajada && <p style={{ fontSize: `${u.bajada}cqw`, lineHeight: 1.25, marginTop: '1.2cqw', opacity: 0.85, maxWidth: '34ch', marginInline: 'auto' }}>{b.bajada}</p>}
      {b.boton && (
        <span style={{ fontSize: `${u.boton}cqw`, marginTop: '2cqw', padding: `${u.boton * 0.6}cqw ${u.boton * 1.5}cqw`, borderRadius: 999, display: 'inline-block', fontWeight: 600, ...(esTarjeta ? { background: '#1d1d1f', color: '#fff' } : { boxShadow: `inset 0 0 0 1px ${oscuro ? 'rgb(255 255 255 / 40%)' : 'rgb(0 0 0 / 35%)'}` }) }}>
          {b.boton}
        </span>
      )}
    </div>
  )

  return (
    <div data-tema="claro" className={`mx-auto w-full ${movil ? 'max-w-[200px]' : 'max-w-[520px]'}`}>
      <div
        className="relative w-full overflow-hidden rounded-[14px] ring-1 ring-borde"
        style={{ containerType: 'inline-size', aspectRatio: movil ? '390 / 640' : '1440 / 760', background: oscuro ? '#000' : '#e9f1f8' } as CSSProperties}
      >
        {b.video ? (
          <video key={b.video} src={`${b.video}#t=0.1`} preload="metadata" muted playsInline className="absolute inset-0 size-full object-cover" />
        ) : foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" className={`absolute inset-0 size-full object-cover ${movil ? 'object-bottom' : 'object-center'}`} />
        ) : null}

        {mostrarTexto && (
          esTarjeta ? (
            <div className="absolute inset-0 grid place-items-center" style={{ padding: `${margen.x * 2}cqw` }}>
              <div className="w-full rounded-[2.4cqw] bg-white" style={{ padding: '4cqw 3cqw', boxShadow: '0 0 0 0.6cqw #af52de55' }}>{texto}</div>
            </div>
          ) : (
            <div className={`absolute inset-x-0 flex ${arriba ? 'top-0 items-start' : 'inset-y-0 items-center'}`} style={{ padding: `${arriba ? margen.arriba * 2 : 0}cqw ${margen.x * 2}cqw 0` }}>
              <div className="w-full">{texto}</div>
            </div>
          )
        )}
        {!mostrarTexto && !foto && !b.video && (
          <span className="absolute inset-0 grid place-items-center px-4 text-center text-[12px]" style={{ color: tinta, opacity: 0.6 }}>Escena vacía</span>
        )}

        {/* Zonas: las mismas que dibuja la tienda, numeradas. */}
        {b.division !== 'completa' && DIVISIONES[b.division].map((a, i) => (
          <span key={i} className="absolute grid place-items-center border border-dashed border-white/90 bg-spark/15 font-semibold text-white [text-shadow:0_1px_3px_rgb(0_0_0/60%)]" style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.ancho}%`, height: `${a.alto}%`, fontSize: `${u.titulo * 0.7}cqw` }}>{i + 1}</span>
        ))}

        {/* Cápsulas: misma fórmula que `.heroe-capsula-libre` de la tienda. */}
        {b.capsulas.map((c, i) => {
          const p = movil ? c.movil : c.escritorio
          const precio = c.destino.tipo === 'producto' ? precios[c.destino.valor] : undefined
          const t = c.texto || (precio !== undefined ? `Desde ${clp(precio)}` : '')
          if (!t) return null
          return (
            <span
              key={c.id ?? i}
              className="absolute inline-flex items-center whitespace-nowrap rounded-full font-semibold backdrop-blur-md"
              style={{
                left: `calc(${margen.x}cqw + (100% - ${margen.x * 2}cqw) * ${p.x / 100})`,
                top: `calc(${margen.arriba}cqw + (100% - ${margen.arriba + margen.abajo}cqw) * ${p.y / 100})`,
                translate: `-${p.x}% -${p.y}%`,
                fontSize: `${u.cap}cqw`,
                gap: `${u.cap * 0.8}cqw`,
                padding: `${u.cap * 0.5}cqw ${c.boton ? u.cap * 0.5 : u.cap * 1.3}cqw ${u.cap * 0.5}cqw ${u.cap * 1.3}cqw`,
                background: oscuro ? 'rgb(255 255 255 / 16%)' : 'rgb(255 255 255 / 72%)',
                color: tinta,
                boxShadow: `inset 0 0 0 1px ${oscuro ? 'rgb(255 255 255 / 18%)' : 'rgb(0 0 0 / 8%)'}`,
              }}
            >
              {t}
              {c.boton && <span className="rounded-full bg-[#1d1d1f] text-white" style={{ padding: `${u.cap * 0.45}cqw ${u.cap * 1.1}cqw` }}>{c.boton}</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}
