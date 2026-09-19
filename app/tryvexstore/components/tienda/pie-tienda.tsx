import Link from 'next/link'
import { GRUPOS_PIE } from '@/lib/ayuda'

export function PieTienda({
  nombre,
  email,
  whatsapp,
  garantia,
  retracto,
}: {
  nombre: string
  email: string | null
  whatsapp: string | null
  garantia: string | null
  retracto: string | null
}) {
  const canalWhatsapp = whatsapp?.replace(/\D/g, '') ?? ''
  const grupos = GRUPOS_PIE.map((grupo) =>
    grupo.titulo === 'Contacto'
      ? {
          ...grupo,
          enlaces: [
            ...grupo.enlaces,
            ...(email ? [{ texto: email, href: `mailto:${email}` }] : []),
            ...(canalWhatsapp ? [{ texto: 'WhatsApp', href: `https://wa.me/${canalWhatsapp}`, externo: true }] : []),
          ],
        }
      : grupo
  )

  return (
    <footer className="border-t border-borde/70 bg-papel-alt">
      <div className="mx-auto max-w-[1204px] px-[22px] py-8 d:py-10">
        <div className="d:hidden">
          {grupos.map((grupo) => (
            <details key={grupo.titulo} className="group border-b border-borde/70 py-3 first:pt-0">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-semibold text-tinta">
                {grupo.titulo}
                <span aria-hidden className="text-gris group-open:rotate-45">+</span>
              </summary>
              <ul className="mt-1 text-[15px] text-tinta-suave">
                {grupo.enlaces.map((enlace) => (
                  <li key={`${grupo.titulo}-${enlace.texto}`}>
                    {'externo' in enlace && enlace.externo ? (
                      <a href={enlace.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center hover:text-spark hover:underline">
                        {enlace.texto}
                      </a>
                    ) : enlace.href.startsWith('mailto:') ? (
                      <a href={enlace.href} className="break-words hover:text-spark hover:underline">{enlace.texto}</a>
                    ) : (
                      <Link href={enlace.href} className="inline-flex min-h-11 items-center hover:text-spark hover:underline">{enlace.texto}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
        <div className="hidden d:grid d:grid-cols-4 d:gap-8">
          {grupos.map((grupo) => (
            <section key={grupo.titulo}>
              <h2 className="text-[15px] font-semibold text-tinta">{grupo.titulo}</h2>
              <ul className="mt-1 text-[15px] text-tinta-suave">
                {grupo.enlaces.map((enlace) => (
                  <li key={`${grupo.titulo}-${enlace.texto}`}>
                    {'externo' in enlace && enlace.externo ? (
                      <a href={enlace.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center hover:text-spark hover:underline">
                        {enlace.texto}
                      </a>
                    ) : enlace.href.startsWith('mailto:') ? (
                      <a href={enlace.href} className="break-words hover:text-spark hover:underline">{enlace.texto}</a>
                    ) : (
                      <Link href={enlace.href} className="inline-flex min-h-11 items-center hover:text-spark hover:underline">{enlace.texto}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-8 border-t border-borde/70 pt-5 text-[12px] leading-relaxed text-gris">
          <p>Precios en pesos chilenos con IVA incluido. Stock sujeto a disponibilidad al confirmar el pedido.</p>
          {garantia?.trim() && <p className="mt-1.5">{garantia}</p>}
          {retracto?.trim() && <p className="mt-1.5">{retracto}</p>}
          <p className="mt-4">© {new Date().getFullYear()} {nombre}. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
