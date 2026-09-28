import crypto from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { conciliarPendientes } from '@/lib/conciliar-pago'

/**
 * Pasada periódica de conciliación de pagos.
 *
 * La llama pg_cron desde la base cada pocos minutos (con pg_net), con el
 * secreto `CONCILIAR_SECRET` guardado en el Vault de Supabase. No depende del
 * plan de Vercel ni de que Mercado Pago avise: pregunta por cada pedido
 * pendiente si su order ya se acreditó.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function autorizado(cabecera: string | null, secreto: string): boolean {
  const recibido = Buffer.from(cabecera?.replace(/^Bearer\s+/i, '') ?? '', 'utf8')
  const esperado = Buffer.from(secreto, 'utf8')
  return recibido.length === esperado.length && crypto.timingSafeEqual(recibido, esperado)
}

export async function POST(peticion: Request) {
  const secreto = process.env.CONCILIAR_SECRET
  if (!secreto) {
    console.error('[conciliar] falta CONCILIAR_SECRET: la conciliación está apagada')
    return new Response(null, { status: 503 })
  }
  if (!autorizado(peticion.headers.get('authorization'), secreto)) return new Response(null, { status: 401 })

  const resultado = await conciliarPendientes()
  if (resultado.confirmados.length) {
    revalidatePath('/panel/pedidos')
    revalidatePath('/cuenta')
  }
  return Response.json(resultado)
}
