import Link from 'next/link'
import { crearClienteAdministrador } from '@/lib/supabase/administrador'

export const dynamic = 'force-dynamic'

/**
 * Vuelta desde Mercado Pago.
 *
 * Lo que trae la URL es una pista, no un hecho: esos parámetros los escribe el
 * navegador del comprador y se pueden editar a mano. Quien manda es el estado
 * del pedido en nuestra base, que solo cambia el webhook después de confirmar
 * el cobro contra la API.
 *
 * Por eso la página tolera el caso intermedio —pago hecho, aviso todavía no
 * procesado— en vez de negarlo o de darlo por bueno.
 */

interface PedidoResumen {
  numero: number
  estado: string
  total_clp: number
}

const TITULOS: Record<string, string> = {
  pagado: 'Listo, tu pago se confirmó',
  pendiente: 'Tu pago quedó en proceso',
  cancelado: 'El pedido quedó cancelado',
}

export default async function ResultadoPago({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; external_reference?: string }>
}) {
  const params = await searchParams
  const sugerido = params.estado ?? ''
  const numero = Number(params.external_reference)

  let pedido: PedidoResumen | null = null
  if (Number.isSafeInteger(numero) && numero > 0) {
    const { data } = await crearClienteAdministrador()
      .from('pedidos')
      .select('numero,estado,total_clp')
      .eq('numero', numero)
      .maybeSingle()
    pedido = (data as unknown as PedidoResumen | null) ?? null
  }

  const estadoReal = pedido?.estado ?? null
  const confirmado = estadoReal === 'pagado'
  const enEspera = !confirmado && (sugerido === 'exito' || sugerido === 'pendiente')

  const titulo = confirmado
    ? TITULOS.pagado
    : estadoReal && TITULOS[estadoReal]
      ? TITULOS[estadoReal]
      : enEspera
        ? 'Estamos confirmando tu pago'
        : sugerido === 'error'
          ? 'No se pudo completar el pago'
          : 'Estado de tu pedido'

  return (
    <main className="mx-auto max-w-[620px] px-6 py-24 text-center">
      <h1 className="text-[32px] font-semibold tracking-seccion">{titulo}</h1>

      {pedido && (
        <p className="mt-4 text-[17px] text-gris-texto">
          Pedido <strong>#{pedido.numero}</strong> · ${Number(pedido.total_clp).toLocaleString('es-CL')}
        </p>
      )}

      {confirmado && (
        <p className="mt-6 text-[17px] leading-relaxed text-gris-texto">
          Recibimos tu pago y ya estamos preparando el envío. Te escribimos apenas salga.
        </p>
      )}

      {enEspera && (
        <p className="mt-6 text-[17px] leading-relaxed text-gris-texto">
          Mercado Pago nos está enviando la confirmación. Suele tardar unos segundos. Si pagaste
          con tarjeta y todo salió bien, tu pedido va a aparecer como pagado en tu cuenta — no
          hace falta que vuelvas a pagar.
        </p>
      )}

      {sugerido === 'error' && !confirmado && (
        <p className="mt-6 text-[17px] leading-relaxed text-gris-texto">
          No se completó el cobro, así que no se te descontó nada. Tu pedido quedó guardado: puedes
          intentar de nuevo o pagar por transferencia.
        </p>
      )}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/cuenta" className="tienda-boton bg-spark text-white hover:bg-spark-hover">
          Ver mis pedidos
        </Link>
        <Link href="/tienda" className="tienda-boton border border-black/15 hover:bg-black/5">
          Volver a la tienda
        </Link>
      </div>
    </main>
  )
}
