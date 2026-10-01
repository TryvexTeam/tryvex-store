'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { Hoja } from '@/components/hoja'
import { Boton, CLASE_CAMPO, Pildora } from '@/components/panel/ui'
import { MantenerParaConfirmar } from '@/components/panel/mantener-para-confirmar'
import { notificar } from '@/lib/notificar'
import { clp, fecha as fmtFecha } from '@/lib/formato'
import { hoyChile } from '@/lib/periodo'
import type { Cuadre, Recuperacion } from '@/lib/cuadre'
import { registrarEfectivo, fijarEfectivo, borrarEfectivo, declararSaldoCuenta } from '@/app/panel/(protegido)/finanzas/acciones'

/**
 * Cuadre de caja: lo que debería haber contra lo que hay, y quién tiene el efectivo.
 *
 * «Debería haber» sale de aportes, ventas y compras. «Hay» es lo que el equipo
 * declara: el saldo de la cuenta y el efectivo que cada persona tiene en la mano
 * (asociado a un integrante del panel). La diferencia es plata por explicar:
 * gastos o retiros que todavía no están registrados. No se inventa nada: se
 * muestra el hueco.
 */
export interface PersonaEfectivo {
  id: string
  nombre: string
  saldo: number
}

export interface MovimientoEfectivoVista {
  id: string
  persona: string
  tipo: 'recibe' | 'deposita'
  monto: number
  fecha: string
  nota: string | null
}

type Accion = 'contar' | 'recibe' | 'deposita'
type Hoja_ = { modo: 'efectivo'; personaId?: string; accion?: Accion } | { modo: 'cuenta' } | null

const corto = (nombre: string) => nombre.trim().split(/\s+/)[0]

export function CuadreDeCaja({
  cuadre,
  recuperacion,
  cuenta,
  personas,
  historial,
  puedeGestionar,
}: {
  cuadre: Cuadre
  recuperacion: Recuperacion
  cuenta: { monto: number; fecha: string; nota: string | null } | null
  personas: PersonaEfectivo[]
  historial: MovimientoEfectivoVista[]
  puedeGestionar: boolean
}) {
  const [hoja, setHoja] = useState<Hoja_>(null)
  const [borrando, iniciarBorrado] = useTransition()
  const conEfectivo = personas.filter((p) => p.saldo > 0).sort((a, b) => b.saldo - a.saldo)

  const titular =
    cuadre.estado === 'falta'
      ? { rotulo: 'Faltan por explicar', tono: 'text-ambar', monto: cuadre.diferencia }
      : cuadre.estado === 'sobra'
        ? { rotulo: 'Hay de más', tono: 'text-verde', monto: Math.abs(cuadre.diferencia) }
        : { rotulo: 'La caja cuadra', tono: 'text-verde', monto: 0 }

  function borrar(id: string) {
    iniciarBorrado(async () => {
      const r = await borrarEfectivo(id)
      if (r.ok) notificar.ok('Movimiento borrado')
      else notificar.error('No se pudo borrar', r.error)
    })
  }

  return (
    <section id="cuadre" aria-label="Cuadre de caja" className="mb-8 scroll-mt-20 rounded-[var(--radius-widget)] bg-papel p-5 ring-1 ring-borde/60">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Cuadre de caja</h2>
        <p className="text-[12.5px] text-gris">Lo que debería haber contra lo que hay</p>
      </div>

      <div className="mt-4">
        <p className="text-[13px] font-medium text-gris">{titular.rotulo}</p>
        {cuadre.estado !== 'cuadra' && (
          <p className={`cifra mt-1 text-[clamp(2rem,7vw,2.75rem)] leading-none font-semibold tracking-[-0.03em] ${titular.tono}`}>{clp(titular.monto)}</p>
        )}
      </div>

      <dl className="mt-5 space-y-2.5 border-t border-borde/60 pt-4 text-[14.5px]">
        <Fila rotulo="Debería haber" nota="aportes + ventas − compras de stock" valor={clp(cuadre.esperado)} />
        <Fila
          rotulo="En la cuenta"
          nota={cuenta ? `declarado el ${fmtFecha(cuenta.fecha)}` : 'sin declarar'}
          valor={clp(cuadre.enCuenta)}
          accion={puedeGestionar ? <button type="button" onClick={() => setHoja({ modo: 'cuenta' })} className="text-[13px] font-semibold text-spark hover:underline">Actualizar</button> : undefined}
        />
        <Fila rotulo="En efectivo" nota={conEfectivo.length ? conEfectivo.map((p) => `${corto(p.nombre)} ${clp(p.saldo)}`).join(' · ') : 'nadie declaró efectivo'} valor={clp(cuadre.enEfectivo)} />
        <div className="flex justify-between gap-3 border-t border-borde/50 pt-2.5 font-semibold">
          <dt>Hay en total</dt>
          <dd className="cifra">{clp(cuadre.hay)}</dd>
        </div>
      </dl>

      {cuadre.estado === 'falta' && (
        <p className="mt-4 rounded-[var(--radius-anidado)] bg-papel-alt px-3.5 py-3 text-[13px] leading-snug text-tinta-suave">
          Los gastos (hosting, suscripciones, retiros) todavía no están registrados. Cuando se carguen, esta cifra baja; lo que quede sin explicar es lo que hay que buscar.
        </p>
      )}

      {/* ── Efectivo por depositar ─────────────────────────────── */}
      <div id="efectivo" className="mt-6 scroll-mt-20 border-t border-borde/60 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold">Efectivo por depositar</h3>
          {puedeGestionar && <Boton variante="secundario" tamano="sm" onClick={() => setHoja({ modo: 'efectivo' })}>Registrar efectivo</Boton>}
        </div>
        {conEfectivo.length === 0 ? (
          <p className="mt-3 text-[14px] text-gris">Nadie tiene efectivo por depositar. {puedeGestionar ? 'Use «Registrar efectivo» para anotar quién lo tiene.' : ''}</p>
        ) : (
          <ul className="mt-3 divide-y divide-borde/50">
            {conEfectivo.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-tinta text-[13px] font-semibold text-white">{p.nombre.trim().slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium">{corto(p.nombre)}</span>
                  <span className="block text-[12px] text-gris">tiene en la mano</span>
                </span>
                <span className="cifra text-[16px] font-semibold">{clp(p.saldo)}</span>
                {puedeGestionar && (
                  <Boton variante="suave" tamano="sm" onClick={() => setHoja({ modo: 'efectivo', personaId: p.id, accion: 'deposita' })}>Depositó</Boton>
                )}
              </li>
            ))}
          </ul>
        )}

        {historial.length > 0 && (
          <details className="group mt-3 rounded-[var(--radius-anidado)] bg-papel-alt px-3.5 py-2.5">
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-[13px] font-medium text-tinta-suave">
              Movimientos de efectivo <span className="cifra text-gris">{historial.length}</span>
            </summary>
            <ul className="mt-2 divide-y divide-borde/50">
              {historial.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-[13px]">
                  <Pildora tono={m.tipo === 'recibe' ? 'ambar' : 'verde'}>{m.tipo === 'recibe' ? 'Recibió' : 'Depositó'}</Pildora>
                  <span className="min-w-0 flex-1 truncate">{corto(m.persona)} · {fmtFecha(m.fecha)}{m.nota ? ` · ${m.nota}` : ''}</span>
                  <span className="cifra font-semibold">{m.tipo === 'recibe' ? '+' : '−'}{clp(m.monto)}</span>
                  {puedeGestionar && (
                    <MantenerParaConfirmar etiqueta="Borrar" ayuda="Se elimina el movimiento." onConfirmar={() => borrar(m.id)} disabled={borrando} className="inline-flex min-h-9 items-center rounded-full px-3 text-[12px] font-medium text-gris ring-1 ring-borde hover:text-rojo" />
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* ── Recuperación de lo aportado ────────────────────────── */}
      <div className="mt-6 border-t border-borde/60 pt-5">
        <h3 className="text-[15px] font-semibold">Para recuperar lo aportado</h3>
        <dl className="mt-3 space-y-2 text-[14px]">
          <Fila rotulo="Aportado por los socios" valor={clp(recuperacion.aportado)} />
          <Fila rotulo="Plata que hay" nota="cuenta + efectivo" valor={clp(recuperacion.hay)} />
          <Fila rotulo="Stock a costo" nota="sin lo que Joseph ya tenía antes" valor={clp(recuperacion.stockPropioACosto)} />
          <Fila rotulo="Nos deben" nota="pedidos por pagar" valor={clp(recuperacion.porCobrar)} />
          <div className="flex justify-between gap-3 border-t border-borde/50 pt-2 font-semibold">
            <dt>Valor hoy</dt>
            <dd className="cifra">{clp(recuperacion.valorActual)}</dd>
          </div>
        </dl>
        <p className={`mt-3 text-[14.5px] font-semibold ${recuperacion.recuperado ? 'text-verde' : 'text-ambar'}`}>
          {recuperacion.recuperado ? 'Ya se recuperó lo aportado.' : <>Faltan <span className="cifra">{clp(recuperacion.falta)}</span> para recuperar lo aportado.</>}
        </p>
      </div>

      <Hoja
        abierta={hoja !== null}
        onCerrar={() => setHoja(null)}
        titulo={hoja?.modo === 'cuenta' ? 'Saldo de la cuenta' : 'Efectivo por depositar'}
        bajada={hoja?.modo === 'cuenta' ? 'Cuánta plata hay hoy en la cuenta. Reemplaza el saldo anterior; el historial se conserva.' : 'Quién tiene efectivo en la mano. Queda asociado a esa persona del panel.'}
      >
        {hoja?.modo === 'cuenta' && <FormCuenta actual={cuenta?.monto} alTerminar={() => setHoja(null)} />}
        {hoja?.modo === 'efectivo' && <FormEfectivo personas={personas} personaId={hoja.personaId} accion={hoja.accion} alTerminar={() => setHoja(null)} />}
      </Hoja>
    </section>
  )
}

function Fila({ rotulo, nota, valor, accion }: { rotulo: string; nota?: string; valor: string; accion?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="min-w-0">
        <span className="block text-tinta">{rotulo}</span>
        {nota && <span className="block text-[12px] leading-snug text-gris">{nota}</span>}
      </dt>
      <dd className="flex shrink-0 items-center gap-3">
        {accion}
        <span className="cifra font-medium">{valor}</span>
      </dd>
    </div>
  )
}

function FormCuenta({ actual, alTerminar }: { actual?: number; alTerminar: () => void }) {
  const [monto, setMonto] = useState(actual !== undefined ? String(actual) : '')
  const [fecha, setFecha] = useState(hoyChile())
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, iniciar] = useTransition()

  function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const datos = new FormData()
    datos.set('monto_clp', monto)
    datos.set('fecha', fecha)
    datos.set('nota', nota)
    iniciar(async () => {
      const r = await declararSaldoCuenta(datos)
      if (r.ok) {
        notificar.ok('Saldo de la cuenta actualizado', clp(Number(monto.replace(/\D/g, ''))))
        alTerminar()
      } else setError(r.error)
    })
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div>
        <label htmlFor="saldo-monto" className="mb-1.5 block text-[13px] font-medium text-tinta-suave">Saldo en la cuenta</label>
        <input id="saldo-monto" inputMode="numeric" autoFocus value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="$ 0" className={`${CLASE_CAMPO} cifra text-[20px] font-semibold`} />
      </div>
      <div>
        <label htmlFor="saldo-fecha" className="mb-1.5 block text-[13px] font-medium text-tinta-suave">Fecha</label>
        <input id="saldo-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={CLASE_CAMPO} />
      </div>
      <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={240} placeholder="Nota (opcional)" aria-label="Nota, opcional" className={CLASE_CAMPO} />
      {error && <p role="alert" className="rounded-[var(--radius-anidado)] bg-rojo/10 px-3.5 py-2.5 text-[13px] text-rojo">{error}</p>}
      <Boton type="submit" tamano="lg" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar saldo'}</Boton>
    </form>
  )
}

const ACCIONES: { id: Accion; etiqueta: string }[] = [
  { id: 'contar', etiqueta: 'Tiene ahora' },
  { id: 'recibe', etiqueta: 'Recibió' },
  { id: 'deposita', etiqueta: 'Depositó' },
]

function FormEfectivo({ personas, personaId, accion: accionInicial, alTerminar }: { personas: PersonaEfectivo[]; personaId?: string; accion?: Accion; alTerminar: () => void }) {
  const [persona, setPersona] = useState(personaId ?? '')
  const [accion, setAccion] = useState<Accion>(accionInicial ?? 'contar')
  const saldoInicial = personas.find((p) => p.id === personaId)?.saldo ?? 0
  const [monto, setMonto] = useState(accionInicial === 'deposita' && saldoInicial > 0 ? String(saldoInicial) : '')
  const [fecha, setFecha] = useState(hoyChile())
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, iniciar] = useTransition()

  const actual = personas.find((p) => p.id === persona)
  const ayuda =
    accion === 'contar'
      ? `El efectivo que ${actual ? corto(actual.nombre) : 'la persona'} tiene ahora en la mano.${actual ? ` Hoy figura con ${clp(actual.saldo)}.` : ''}`
      : accion === 'recibe'
        ? 'Efectivo que cobró en mano y se suma a lo que tiene.'
        : `Efectivo que depositó en la cuenta.${actual ? ` Tiene ${clp(actual.saldo)}.` : ''}`

  function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const datos = new FormData()
    datos.set('integrante_id', persona)
    datos.set('fecha', fecha)
    datos.set('nota', nota)
    if (accion === 'contar') datos.set('real', monto)
    else {
      datos.set('tipo', accion)
      datos.set('monto_clp', monto)
    }
    iniciar(async () => {
      if (accion === 'contar') {
        const r = await fijarEfectivo(datos)
        if (r.ok) {
          notificar.ok('Efectivo registrado', r.resumen)
          alTerminar()
        } else setError(r.error)
      } else {
        const r = await registrarEfectivo(datos)
        if (r.ok) {
          notificar.ok(accion === 'recibe' ? 'Efectivo recibido registrado' : 'Depósito registrado', actual ? corto(actual.nombre) : undefined)
          alTerminar()
        } else setError(r.error)
      }
    })
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-tinta-suave">¿De quién?</legend>
        <div className="flex flex-wrap gap-2">
          {personas.map((p) => (
            <button key={p.id} type="button" aria-pressed={persona === p.id} onClick={() => setPersona(p.id)} className={`min-h-10 rounded-full px-4 text-[13.5px] font-medium transition-colors ${persona === p.id ? 'bg-tinta text-white' : 'bg-papel-alt text-tinta hover:bg-borde/40'}`}>
              {corto(p.nombre)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-tinta-suave">Movimiento</legend>
        <div className="flex flex-wrap gap-2">
          {ACCIONES.map((a) => (
            <button key={a.id} type="button" aria-pressed={accion === a.id} onClick={() => setAccion(a.id)} className={`min-h-10 rounded-full px-4 text-[13.5px] font-medium transition-colors ${accion === a.id ? 'bg-tinta text-white' : 'bg-papel-alt text-tinta hover:bg-borde/40'}`}>
              {a.etiqueta}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="ef-monto" className="mb-1.5 block text-[13px] font-medium text-tinta-suave">Monto</label>
        <input id="ef-monto" inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="$ 0" className={`${CLASE_CAMPO} cifra text-[20px] font-semibold`} />
        <p className="mt-1.5 text-[12.5px] leading-snug text-gris">{ayuda}</p>
      </div>
      <div>
        <label htmlFor="ef-fecha" className="mb-1.5 block text-[13px] font-medium text-tinta-suave">Fecha</label>
        <input id="ef-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={CLASE_CAMPO} />
      </div>
      <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={240} placeholder="Nota (opcional)" aria-label="Nota, opcional" className={CLASE_CAMPO} />
      {error && <p role="alert" className="rounded-[var(--radius-anidado)] bg-rojo/10 px-3.5 py-2.5 text-[13px] text-rojo">{error}</p>}
      <Boton type="submit" tamano="lg" disabled={enviando || !persona}>{enviando ? 'Guardando…' : 'Guardar'}</Boton>
    </form>
  )
}
