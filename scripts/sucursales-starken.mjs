/**
 * Genera `lib/sucursales-starken.json`: los puntos donde se puede retirar un
 * envío Starken, con región y comuna escritas igual que en el checkout.
 *
 * Fuente: el directorio de sucursales de starken.cl (la misma API que usa su
 * buscador público). No se consulta en cada compra: no está documentada y
 * puede cambiar, así que se toma una copia y se revisa aquí.
 *
 *   node --use-system-ca scripts/sucursales-starken.mjs
 *
 * Correrlo de nuevo cada cierto tiempo actualiza la lista (Starken abre y
 * cierra puntos). El script falla, sin escribir nada, si la respuesta no se
 * parece a lo esperado.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const FUENTE = 'https://apiprod.starkenpro.cl/agency/agency'

const quitarTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
const clave = (s) =>
  quitarTildes(String(s))
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** «10 DE JULIO» → «10 de Julio». */
function nombrePropio(s) {
  const menores = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'el', 'en'])
  return String(s)
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => (i > 0 && menores.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
}

// Regiones y comunas del checkout, leídas del propio código para no duplicarlas.
const fuenteChile = readFileSync(new URL('../lib/chile.ts', import.meta.url), 'utf8')
const REGIONES = [...fuenteChile.matchAll(/^\s+['"](.+?)['"],$/gm)].map((m) => m[1].replace(/\\'/g, "'"))
const fuenteComunas = readFileSync(new URL('../lib/comunas.ts', import.meta.url), 'utf8')
const COMUNAS = {}
for (const m of fuenteComunas.matchAll(/"([^"]+)":\s*\[([^\]]*)\]/g)) {
  COMUNAS[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1])
}
if (REGIONES.length !== 16 || Object.keys(COMUNAS).length !== 16) {
  throw new Error(`No se pudieron leer regiones (${REGIONES.length}) o comunas (${Object.keys(COMUNAS).length})`)
}

/** Sin «región de», «y», «de la»: Starken y el CUT escriben distinto lo mismo. */
const claveRegion = (s) =>
  clave(s)
    .replace(/^region (de |del )?/, '')
    .split(' ')
    .filter((p) => !['de', 'del', 'la', 'y'].includes(p))
    .join(' ')

function regionPropia(nombreStarken) {
  const k = claveRegion(nombreStarken)
  return REGIONES.find((r) => {
    const kr = claveRegion(r)
    return k === kr || k.includes(kr) || kr.includes(k)
  })
}

/**
 * Starken nombra algunas localidades que no son comunas, o comunas con su
 * nombre largo. Aquí se traducen a la comuna del CUT a la que pertenecen.
 */
const EQUIVALENCIAS = {
  chicureo: 'Colina',
  labranza: 'Temuco',
  'lican ray': 'Villarrica',
  conaripe: 'Panguipulli',
  'el carmen chillan': 'El Carmen',
  'el salvador': 'Diego de Almagro',
  maitencillo: 'Puchuncaví',
  llaillay: 'Llay Llay',
  'llay llay': 'Llay Llay',
  'puerto aysen': 'Aysén',
  'puerto natales': 'Natales',
  'puerto saavedra': 'Saavedra',
  'san jose de la mariquina': 'Mariquina',
  'san vicente de taguatagua': 'San Vicente',
}

/** La comuna en la región que dice Starken; si no está ahí, en todo Chile. */
function comunaPropia(region, comunaStarken) {
  const k = clave(comunaStarken)
  const buscada = EQUIVALENCIAS[k] ? clave(EQUIVALENCIAS[k]) : k
  const enRegion = region && COMUNAS[region]?.find((c) => clave(c) === buscada)
  if (enRegion) return { region, comuna: enRegion }
  for (const [r, lista] of Object.entries(COMUNAS)) {
    const c = lista.find((x) => clave(x) === buscada)
    if (c) return { region: r, comuna: c }
  }
  return null
}

const TIPOS = {
  SUCURSAL: 'Sucursal Starken',
  PUDO: 'Punto de retiro',
  'AUTOATENCION 24-7': 'Autoatención 24/7',
  ALIANZAS: 'Punto de retiro',
}

function tipoDe(a) {
  const sub = a.subtipo?.descripcion ?? ''
  if (/OXXO/i.test(sub)) return 'Punto de retiro OXXO'
  if (/AUTOPLANET/i.test(sub)) return 'Punto de retiro Autoplanet'
  if (/LOCKER/i.test(sub)) return 'Locker Starken'
  return TIPOS[a.subtipo?.tipo?.descripcion] ?? 'Punto de retiro'
}

function horario(a) {
  const tramo = (abre, cierra, cierraMedio, abreMedio) => {
    if (!abre || !cierra) return null
    return cierraMedio && abreMedio ? `${abre}–${cierraMedio} y ${abreMedio}–${cierra}` : `${abre}–${cierra}`
  }
  const semana = tramo(a.open_week, a.close_week, a.close_midday_week, a.open_midday_week)
  const sabado = tramo(a.open_saturday, a.close_saturday, a.close_midday_saturday, a.open_midday_saturday)
  const domingo = tramo(a.open_sunday, a.close_sunday, a.close_midday_sunday, a.open_midday_sunday)
  return [semana && `L a V ${semana}`, sabado && `Sáb ${sabado}`, domingo && `Dom ${domingo}`].filter(Boolean).join(' · ') || null
}

const respuesta = await fetch(FUENTE, {
  headers: { 'User-Agent': 'Mozilla/5.0', Origin: 'https://www.starken.cl', Referer: 'https://www.starken.cl/' },
})
if (!respuesta.ok) throw new Error(`Starken respondió ${respuesta.status}`)
const agencias = await respuesta.json()
if (!Array.isArray(agencias) || agencias.length < 300) throw new Error('La respuesta no parece el directorio de sucursales')

const sinCalzar = []
const puntos = []
for (const a of agencias) {
  // `delivery`: el punto entrega envíos al destinatario (se puede retirar ahí).
  if (a.status !== 'ACTIVE' || a.delivery !== true) continue
  const comunaStarken = a.comuna?.name ?? ''
  const ubicacion = comunaPropia(regionPropia(a.comuna?.city?.region?.name ?? ''), comunaStarken)
  if (!ubicacion) {
    sinCalzar.push(`${a.name} · ${comunaStarken} · ${a.comuna?.city?.region?.name}`)
    continue
  }
  const lat = Number(a.latitude)
  const lng = Number(a.longitude)
  puntos.push({
    id: a.id,
    // «P-» marca los puntos de retiro en comercios: ya lo dice el tipo.
    nombre: nombrePropio(String(a.name).replace(/^P\s*-\s*/i, '')),
    tipo: tipoDe(a),
    // Starken guarda el «N°» mal codificado («Nø»).
    direccion: nombrePropio(String(a.address ?? '').trim()).replace(/\bN[øº°]\s*/gi, 'N° ').replace(/\s+/g, ' '),
    region: ubicacion.region,
    comuna: ubicacion.comuna,
    horario: horario(a),
    ...(Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 ? { lat, lng } : {}),
  })
}

puntos.sort((x, y) => x.region.localeCompare(y.region) || x.comuna.localeCompare(y.comuna, 'es') || x.nombre.localeCompare(y.nombre, 'es'))
writeFileSync(
  new URL('../lib/sucursales-starken.json', import.meta.url),
  JSON.stringify({ actualizado: new Date().toISOString().slice(0, 10), puntos }, null, 0) + '\n'
)
console.log(`${puntos.length} puntos de retiro guardados · ${sinCalzar.length} sin comuna reconocible`)
if (sinCalzar.length) console.log(sinCalzar.slice(0, 40).join('\n'))
