import fs from 'node:fs';
import * as cheerio from 'cheerio';

const BRAND = {
  marca: 'Tryvex',
  producto: 'Audífonos Pods Pro',
  precio: '$25.000',
  precioAncla: '$299.990',
  dominio: 'tryvexstore.cl',
};

/* A donde apunta el boton Comprar. En produccion la app y la landing van
   bajo el mismo dominio, asi que basta la ruta. En local hay dos puertos. */
const DESTINO_COMPRA = process.env.TRYVEX_CHECKOUT || 'http://localhost:3100/comprar';

const log = [];
const note = (m) => { log.push(m); console.log('  ' + m); };

const $ = cheerio.load(fs.readFileSync('site/index.html', 'utf8'));

/* ─── 1. Quitar el chrome de Apple ────────────────────────────── */
const chrome = [
  '#globalheader', '#__ACGH_DATA__', '#ac-localnav', '#ac-ln-curtain',
  '#ac-ln-menustate', '#ac-ln-sticky-placeholder', '#ac-globalfooter',
  '.ric-modal', '.modal',
];
let n = 0;
for (const sel of chrome) { n += $(sel).length; $(sel).remove(); }
note(`chrome Apple eliminado: ${n} bloques`);

/* ─── 2. Quitar secciones de tienda Apple ─────────────────────── */
const fuera = ['section-incentive', 'section-contrast', 'section-environment',
               'section-values', 'section-index'];
let kb = 0;
for (const c of fuera) {
  $(`.${c}`).each((_, el) => { kb += ($.html(el) || '').length; });
  $(`.${c}`).remove();
}
note(`secciones de tienda Apple eliminadas: ${fuera.length} (${(kb / 1024).toFixed(0)} KB)`);

/* ─── 3. Quitar scripts remotos y de analítica ────────────────── */
let sc = 0;
$('script').each((_, el) => {
  const src = $(el).attr('src') || '';
  const body = $(el).html() || '';
  const esJsonLd = ($(el).attr('type') || '').includes('ld+json');
  if (src || esJsonLd || /ac-analytics|data-relay|globalnav/.test(body)) { $(el).remove(); sc++; }
});
note(`scripts remotos/analítica eliminados: ${sc}`);

/* ─── 4. Limpiar <head> ───────────────────────────────────────── */
$('link[rel="alternate"], link[rel="canonical"], link[rel="preconnect"]').remove();
$('meta[property^="og:"], meta[name^="twitter:"], meta[name="description"]').remove();
$('head').find('link[href^="/"], script[src^="/"]').remove();
$('link[rel="stylesheet"]').remove();  // se re-inyecta abajo, evita duplicado
$('title').text(`${BRAND.producto} — ${BRAND.marca}`);
$('head').append(`\n<meta name="description" content="${BRAND.producto}. Audio premium sin el precio premium. ${BRAND.precio} en ${BRAND.dominio}.">\n`);
$('head').append('<link rel="stylesheet" href="assets/styles.css">\n');
$('html').attr('lang', 'es-CL');
note('head reescrito con metadatos Tryvex');

/* ─── 5. Rebranding de texto ──────────────────────────────────── */
// 5a. Normalizar espacios y guiones no separables (Apple los usa en todo el copy)
let norm = 0;
$('*').contents().each((_, node) => {
  if (node.type !== 'text') return;
  const t = node.data
    .replace(/\u00A0/g, ' ')   // &nbsp;
    .replace(/\u2011/g, '-')   // guion no separable
    .replace(/\u200B/g, '');   // zero-width
  if (t !== node.data) { node.data = t; norm++; }
});
note(`nodos normalizados (nbsp / guion no separable): ${norm}`);

// 5b. Reemplazos, de mas especifico a menos
const reemplazos = [
  [/AirPods\s*Pro\s*3/gi, BRAND.producto],
  [/AirPods\s*Pro\s*2/gi, 'los audífonos de marca'],
  [/AirPods\s*4/gi, BRAND.producto],
  [/AirPods\s*Pro/gi, BRAND.producto],
  [/\bAirPods\b/gi, BRAND.producto],
  [/\$299\.990/g, BRAND.precio],
  [/\$219\.990/g, BRAND.precio],
  [/\$24\.999/g, '$2.083'],
  [/Apple Intelligence/g, BRAND.marca],
  [/Apple Watch/g, 'tu reloj'],
  [/\bApple TV\b/g, 'tu TV'],
  [/Apple Store/g, `${BRAND.marca} Store`],
  [/\bApple\b/g, BRAND.marca],
  [/\biPhone\b/g, 'tu teléfono'],
  [/\biPad\b/g, 'tu tablet'],
  [/\bSiri\b/g, 'tu asistente de voz'],
  [/\bFaceTime\b/g, 'videollamada'],
  [/\bMagSafe\b/g, 'carga inalámbrica'],
  // limpiar, en la MISMA pasada, las colisiones que generan los reemplazos de arriba
  [/\btu\s+tu\b/gi, 'tu'],
  [/\b(el|la|los|las|un|una|al|del)\s+(tu|tus)\b/gi, '$2'],
  [/\blos\s+los\b/gi, 'los'],
  // NO somos el fabricante: revendemos. Las frases de Apple que atribuyen
  // la tecnologia a la marca se eliminan, no se traspasan a Tryvex.
  [/\s*dise[ñn]ado por Tryvex/gi, ''],
  [/,?\s*posible gracias a (?:toda la potencia de\s+)?Tryvex\s*,?/gi, ''],
  [/\s*Y gracias a Tryvex,\s*/gi, ' '],
  [/\s*gracias a (?:toda la potencia de\s+)?Tryvex\s*,?/gi, ''],
  [/\bTryvex Fitness\+/gi, 'tu app de fitness'],
  [/\bcon toda la potencia del chip H2\b/gi, 'con chip H2'],
  // colapsar duplicados que deje el reemplazo
  [new RegExp(`(${BRAND.producto})\s+Pro\b`, 'g'), '$1'],
  [new RegExp(`(${BRAND.producto})\s+\d\b`, 'g'), '$1'],
];
let cambios = 0;
$('*').contents().each((_, node) => {
  if (node.type !== 'text') return;
  let t = node.data, orig = t;
  for (const [re, to] of reemplazos) t = t.replace(re, to);
  if (t !== orig) { node.data = t; cambios++; }
});
note(`nodos de texto rebrandeados: ${cambios}`);

// 5c. Neutralizar superlativos heredados que no podemos sustentar
const claims = [
  [/La mejor Cancelación Activa de Ruido del mundo/gi, 'Cancelación Activa de Ruido'],
  [/\bLa mejor\b/g, 'Nuestra'],
  [/\bdel mundo\b/g, ''],
  [/\blos los\b/g, 'los'],
  // colisiones articulo + posesivo que dejan los reemplazos (el tu TV, en tu tu telefono)
  [/\b(el|la|los|las|un|una|al|del)\s+(tu|tus)\b/gi, '$2'],
  [/\btu\s+tu\b/gi, 'tu'],
  [/\ba\s+tu\s+tu\b/gi, 'a tu'],
  [/\ben\s+el\s+tu\b/gi, 'en tu'],
  [/\s{2,}/g, ' '],
  [/la mejor Cancelación Activa de Ruido del mundo/gi, 'Cancelación Activa de Ruido'],
  [/Hasta \d+ veces más que (los |las )?.{0,45}?\.\s*/gi, ''],
  [/Hasta \d+ ?veces más Cancelación Activa de Ruido,?/gi, 'Cancelación Activa de Ruido'],
  [/\d+ horas más que .{0,40}?\.?/gi, ''],
  [/Los primeros con certificación/gi, 'Con certificación'],
];
let neutralizados = 0;
$('*').contents().each((_, node) => {
  if (node.type !== 'text') return;
  let t = node.data, orig = t;
  for (const [re, to] of claims) t = t.replace(re, to);
  if (t !== orig) { node.data = t; neutralizados++; }
});
note(`superlativos sin sustento neutralizados: ${neutralizados}`);

/* ─── 5d. Limpiar marcas en atributos ─────────────────────────── */
let attrs = 0;
const ATTR = ['data-analytics-title', 'aria-label', 'alt', 'title', 'href',
              'data-component-list', 'data-analytics-section-engagement'];
$('*').each((_, el) => {
  for (const a of ATTR) {
    const v = $(el).attr(a);
    if (!v) continue;
    let t = v;
    for (const [re, to] of reemplazos) t = t.replace(re, to);
    t = t.replace(/airpods[_-]?pro[_-]?\d?/gi, 'tryvex-pods-pro').replace(/\bairpods\b/gi, 'tryvex-pods');
    if (t !== v) { $(el).attr(a, t); attrs++; }
  }
});
note(`atributos limpiados de marcas ajenas: ${attrs}`);

/* ─── 5e. Neutralizar enlaces muertos al CDN/tienda de Apple ──── */
let muertos = 0, compras = 0;
$('a[href]').each((_, el) => {
  const h = $(el).attr('href') || '';
  // Cualquier ruta absoluta heredada del sitio de Apple da 404 bajo nuestro
  // dominio: `/cl/...`, `/shop/...`, `/105/...`. Se neutralizan todas, no
  // solo las que llevan el dominio escrito. Quedaban tres sueltas, una de
  // ellas con el rebranding incrustado en la ruta:
  // `/cl/Audífonos Pods Pro-pro/hearing-health/`.
  if (/^https?:\/\/(www\.)?apple\.com|^\/(105|cl|shop|mx|es|us)\/|\.m3u8/.test(h)) {
    // el CTA de compra apunta al flujo propio; el resto muere en #
    // El CTA lleva al checkout real de la app Next.js.
    if (/shop\/goto\/buy|buy_/.test(h)) { $(el).attr('href', DESTINO_COMPRA); compras++; }
    else { $(el).attr('href', '#'); $(el).attr('data-enlace-pendiente', '1'); }
    muertos++;
  }
});
note(`enlaces muertos neutralizados: ${muertos} (de ellos ${compras} CTA -> #comprar)`);

/* ─── 5f. Precios por volumen (sin cuotas) ────────────────────── */
const PRECIOS = JSON.parse(fs.readFileSync('config/precios.json', 'utf8'));
const clp = (n) => '$' + n.toLocaleString('es-CL');

// 1) fuera las cuotas: se paga contado
let cuotas = 0;
$('*').contents().each((_, node) => {
  if (node.type !== 'text') return;
  if (!/cuotas/.test(node.data)) return;
  node.data = node.data.replace(/\s*o en \d+ cuotas sin interés desde \$[\d.]+/gi, '');
  cuotas++;
});
note(`menciones de cuotas eliminadas: ${cuotas}`);

// 2) bloque de precio por volumen, insertado tras los highlights
const filas = PRECIOS.tramos.map((t) => {
  const rango = t.max_unidades ? `${t.min_unidades}–${t.max_unidades}` : `${t.min_unidades} o más`;
  const ahorro = Math.round((1 - t.precio_unitario / PRECIOS.precio_base) * 100);
  return `<li class="tv-tramo${ahorro >= 20 ? ' tv-tramo-destacado' : ''}">
      <p class="tv-tramo-etiqueta">${t.etiqueta}</p>
      <p class="tv-tramo-rango">${rango} unidades</p>
      <p class="tv-tramo-precio">${clp(t.precio_unitario)}</p>
      <p class="tv-tramo-unidad">por unidad</p>
      ${ahorro > 0 ? `<p class="tv-tramo-ahorro">Ahorras ${ahorro}%</p>` : '<p class="tv-tramo-ahorro">&nbsp;</p>'}
    </li>`;
}).join(String.fromCharCode(10));

const bloque = `
<section class="section tv-volumen" id="por-mayor" aria-labelledby="tv-volumen-titulo">
  <div class="tv-volumen-inner">
    <h2 id="tv-volumen-titulo" class="tv-volumen-titulo tryvex-reveal">${PRECIOS.copy.titulo}</h2>
    <p class="tv-volumen-bajada tryvex-reveal">${PRECIOS.copy.bajada}</p>
    <ul class="tv-tramos tryvex-reveal">
${filas}
    </ul>
    <p class="tv-volumen-pie">${PRECIOS.copy.pie}</p>
  </div>
</section>`;

// Apple cuenta: te muestro -> lo ves en detalle -> te explico -> compras.
// Meter la tabla de precios antes del relato lo corta por la mitad.
const anclaVol = $('.section-product-stories').first().length
  ? $('.section-product-stories').first()
  : $('.section-highlights').first();
if (anclaVol.length) { anclaVol.after(bloque); note(`bloque de precio por volumen insertado al final del relato: ${PRECIOS.tramos.length} tramos`); }
else note('AVISO: no se encontro .section-highlights, bloque de volumen NO insertado');

/* ─── 6. Quitar notas al pie (apuntaban al footer borrado) ────── */
const fn = $('.footnote-number, sup.footnote-number, .footnote-supglyph').length;
$('.footnote-number, sup.footnote-number, .footnote-supglyph').remove();
note(`referencias a notas al pie eliminadas: ${fn}`);

/* ─── 7. Resolver rutas de media contra los archivos reales ───── */
const disponibles = fs.readdirSync('.').filter(f => /\.(jpg|jpeg|png|webp|mp4|webm|svg)$/i.test(f));
// indice: base (sin variante) -> [archivos], y rank de variante
const RANK = ['_large_2x', '_large', '_medium_2x', '_medium', '_small_2x', '_small'];
const baseDe = (f) => f.replace(/(_(large|medium|small)(_2x)?)?\.(jpg|jpeg|png|webp|mp4|webm|svg)$/i, '');
const porBase = {};
for (const f of disponibles) (porBase[baseDe(f)] ||= []).push(f);
const mejor = (lista) => {
  for (const r of RANK) { const hit = lista.find(f => f.includes(r)); if (hit) return hit; }
  return lista[0];
};

let srcsetLimpios = 0;
let resueltas = 0, nitidas = 0, sinResolver = new Set();
/* Los once videos del mirror se guardaron todos como `large_2x.mp4` o
   `large_2x.webm`, desambiguados con un sufijo -N que refleja el orden de
   descarga y no el contenido. Resolviendo por nombre de archivo, los ocho
   mp4 caian en el mismo: el hero. Ocho secciones reproducian el video
   equivocado. El mapa vive en config/videos.json y se establecio comparando
   el Content-Length que sirve apple.com para cada basepath contra el tamano
   de cada archivo en _video_original/. */
const MAPA_VIDEO = JSON.parse(fs.readFileSync('config/videos.json', 'utf8'));
let videosMapeados = 0;
const porBasepath = (v) => {
  const m = v.match(/anim\/([a-z0-9-]+)\//i);
  if (!m) return null;
  const entrada = MAPA_VIDEO['anim/' + m[1]];
  if (!entrada || !disponibles.includes(entrada.archivo)) return null;
  videosMapeados++;
  return 'assets/media/' + entrada.archivo;
};

const resolver1 = (v) => {
  if (!v || v.startsWith('assets/inline/') || v.startsWith('data:')) return v;
  const porRuta = porBasepath(v);
  if (porRuta) { resueltas++; return porRuta; }
  const nombre = v.split('?')[0].split('/').pop();
  if (!nombre || !/\.(jpg|jpeg|png|webp|mp4|webm|svg)$/i.test(nombre)) return v;
  // Si el HTML pide la variante 1x pero existe la 2x, se usa la 2x: Apple
  // dimensiona los huecos para 2x, asi que servir la 1x la deja estirada
  // al doble y borrosa. Medido: 21 de 69 imagenes con estiramiento 2.0x.
  const m2x = nombre.match(/^(.*)_(large|medium|small)\.(jpg|jpeg|png|webp)$/i);
  if (m2x) {
    const dosX = `${m2x[1]}_${m2x[2]}_2x.${m2x[3]}`;
    if (disponibles.includes(dosX)) { resueltas++; nitidas++; return 'assets/media/' + dosX; }
  }
  if (disponibles.includes(nombre)) { resueltas++; return 'assets/media/' + nombre; }
  const cand = porBase[baseDe(nombre)];
  if (cand && cand.length) { resueltas++; return 'assets/media/' + mejor(cand); }
  sinResolver.add(nombre);
  return v;
};

/**
 * Reescribe un srcset resolviendo cada URL y, sobre todo, eliminando
 * descriptores de densidad mentirosos.
 *
 * Al no existir la variante _2x, el resolvedor devuelve el mismo archivo
 * para ambas entradas y queda "x.jpg, x.jpg 2x". El navegador elige la
 * entrada 2x y trata un archivo de 1800px como si midiera 900: usa la
 * mitad de su resolucion y la imagen se ve blanda.
 *
 * Si un archivo queda como unica fuente, va sin descriptor.
 */
const arreglarSrcset = (valor) => {
  const entradas = valor.split(',').map((parte) => {
    const [u, d] = parte.trim().split(/\s+/);
    return { url: resolver1(u), desc: d || null };
  }).filter((e) => e.url);

  // Agrupar por archivo real
  const porArchivo = new Map();
  for (const e of entradas) {
    if (!porArchivo.has(e.url)) porArchivo.set(e.url, []);
    porArchivo.get(e.url).push(e.desc);
  }

  const salida = [];
  for (const [url, descs] of porArchivo) {
    // Un solo archivo con varios descriptores: se sirve sin descriptor,
    // asi el navegador usa su resolucion real como 1x.
    const unico = porArchivo.size === 1 || descs.filter(Boolean).length !== descs.length;
    if (unico) { srcsetLimpios++; salida.push(url); }
    else salida.push(url + (descs[0] ? ' ' + descs[0] : ''));
  }
  return salida.join(', ');
};

$('[src], [srcset], [poster], [data-src]').each((_, el) => {
  for (const a of ['src', 'poster', 'data-src']) {
    const v = $(el).attr(a);
    if (v) $(el).attr(a, resolver1(v));
  }
  const ss = $(el).attr('srcset');
  if (ss) $(el).attr('srcset', arreglarSrcset(ss));
});
$('source[src], source[srcset]').each((_, el) => {
  const v = $(el).attr('src');
  if (v) $(el).attr('src', resolver1(v));
  const ss = $(el).attr('srcset');
  if (ss) $(el).attr('srcset', arreglarSrcset(ss));
});
note(`referencias de media resueltas a archivo local: ${resueltas}`);
note(`videos asignados por basepath (no por nombre de archivo): ${videosMapeados}`);
note(`  de ellas, elevadas de 1x a 2x: ${nitidas}`);
note(`  srcset con descriptor 2x falso corregidos: ${srcsetLimpios}`);
if (sinResolver.size) note(`SIN RESOLVER (${sinResolver.size}): ${[...sinResolver].slice(0,6).join(', ')}`);

/* copiar assets a dist */
fs.mkdirSync('dist/assets/media', { recursive: true });
for (const f of disponibles) fs.copyFileSync(f, 'dist/assets/media/' + f);
fs.cpSync('site/assets/inline', 'dist/assets/inline', { recursive: true });
note(`assets copiados: ${disponibles.length} media + inline`);

/* ─── 7c. Imagenes ausentes: sustituir o eliminar la tarjeta ──── */
// Apple sirve estas variantes por CDN y no vinieron en la carpeta.
const SUSTITUIR = {
  'highlights_noise_cancellation_hearing_aid__eni46zr12ogi': 'highlights_noise_cancellation__cxd50c0etw4m',
  'find_my__cvjw4c07da2q': 'highlights_battery_endframe__f5ljqvliqpym',
};
// Sin equivalente Y ademas anuncia una funcion que el producto no tiene.
const ELIMINAR_TARJETA = ['highlights_hearing_aid__dh5og4rjwcq6'];

let sust = 0;
const aplicar = (v) => {
  if (!v) return v;
  for (const [malo, bueno] of Object.entries(SUSTITUIR)) {
    if (v.includes(malo)) {
      sust++;
      const cand = disponibles.filter(f => f.startsWith(bueno));
      return 'assets/media/' + mejor(cand);
    }
  }
  return v;
};
$('img, source').each((_, el) => {
  for (const a of ['src', 'poster']) { const v = $(el).attr(a); if (v) $(el).attr(a, aplicar(v)); }
  const ss = $(el).attr('srcset');
  if (ss) $(el).attr('srcset', ss.split(',').map(p => {
    const [u, d] = p.trim().split(/\s+/);
    const n = aplicar(u);
    return n + (d && n === u ? ' ' + d : '');
  }).join(', '));
});
note(`imagenes ausentes sustituidas por equivalente local: ${sust}`);

let borradas = 0;
$('img, source').each((_, el) => {
  const v = ($(el).attr('src') || '') + ($(el).attr('srcset') || '');
  if (!ELIMINAR_TARJETA.some(b => v.includes(b))) return;
  let n = $(el);
  for (let i = 0; i < 8; i++) {
    const p = n.parent();
    if (!p.length) break;
    if (/card-container|gallery-item/.test(p.attr('class') || '')) { p.remove(); borradas++; return; }
    n = p;
  }
});
note(`tarjetas eliminadas (funcion inexistente, sin imagen): ${borradas}`);

/* ─── 7d. Contener las galerias horizontales ──────────────────── */
$('.card-set, .gallery-items, [class*="gallery"] > ul').each((_, el) => {
  $(el).addClass('tryvex-scroller');
});
note('galerias marcadas para contencion horizontal');

/* ─── 7b. CSS: quitar fuentes de Apple, sustituir por Inter ───── */
let css = fs.readFileSync('styles.css', 'utf8');
const antesFF = (css.match(/@font-face/g) || []).length;
// eliminar los @font-face que apuntan a apple.com (no son nuestros y dan 404)
css = css.replace(/@font-face\s*\{[^}]*apple\.com[^}]*\}/g, '');
const despuesFF = (css.match(/@font-face/g) || []).length;
note(`@font-face de apple.com eliminados: ${antesFF - despuesFF}`);

// SF Pro -> Inter (Apple ya deja fallbacks despues en cada declaracion)
let subs = 0;
for (const fam of ['SF Pro Display', 'SF Pro Text', 'SF Pro Icons', 'SF Pro JP',
                  'SF Pro AR Text', 'SF Pro AR', 'SF Pro Gulf', 'SF Pro', 'Apple Icons']) {
  // Apple las escribe con y sin comillas; hay que cubrir ambas formas
  for (const re of [new RegExp('"' + fam + '"', 'g'),
                    new RegExp('(?<=[:,]\s*)' + fam + '(?=\s*[,;}])', 'g')]) {
    subs += (css.match(re) || []).length;
    css = css.replace(re, '"Inter"');
  }
}
note(`referencias a SF Pro sustituidas por Inter: ${subs}`);

// Los iconos de Apple eran una fuente propia; sin ella los codepoints salen tofu.
const ICONOS = {
  'f301': '"\\203A"',  // chevron derecha  ›
  'f300': '"\\2039"',  // chevron izquierda ‹
  'f302': '"\\203A"',
  'f303': '"\\2039"',
  'f304': '"\\25B8"',  // triangulo (play)
  'f305': '"\\25C2"',
};
let iconosMapeados = 0, iconosOcultos = 0;
css = css.replace(/content:\s*"\\([0-9a-fA-F]{4})"/g, (m, code) => {
  const k = code.toLowerCase();
  if (ICONOS[k]) { iconosMapeados++; return 'content:' + ICONOS[k]; }
  iconosOcultos++;
  return 'content:""';           // incluye \f8ff = logo de Apple
});
note(`iconos Apple mapeados a unicode: ${iconosMapeados} | ocultados: ${iconosOcultos}`);
// Apple tambien incrusta el glifo PUA literal (no solo el escape \fXXX)
const LITERAL = {
  '\uF300': '\u2039', '\uF301': '\u203A',   // chevrones
  '\uF302': '\u2039', '\uF303': '\u203A',
  '\uF304': '\u25B8', '\uF305': '\u25C2',   // triangulos
  '\uF31E': '\u25B6',                        // play circle
};
let litMap = 0, litBorra = 0;
css = css.replace(/[\uE000-\uF8FF]/g, (ch) => {
  if (LITERAL[ch]) { litMap++; return LITERAL[ch]; }
  litBorra++; return '';                     // incluye U+F8FF, el logo de Apple
});
note(`glifos PUA literales mapeados: ${litMap} | eliminados: ${litBorra}`);

/* El barrido final del HTML renombra `airpods` en todas partes, incluidos
   los nombres de clase. El CSS conservaba el nombre viejo, asi que
   selectores como `.overview-audio-performance-audio-airpods-pro-pair`
   dejaban de encontrar a su elemento: medido, la seccion de audio crecia
   907px y dos frames de la secuencia quedaban en 0x0. La sustitucion tiene
   que ser la misma a los dos lados. Las URL del CSS se protegen igual que
   en el HTML: ahi los nombres deben calzar con el disco. */
let urlsCss = [];
css = css.replace(/url\(([^)]*)\)/g, (m) => { urlsCss.push(m); return `TRYVEXU${urlsCss.length - 1}X`; });
const claseAntes = (css.match(/airpods/gi) || []).length;
css = css.replace(/airpods[_-]pro[_-]?\d?/gi, 'tryvex-pods-pro').replace(/airpods/gi, 'tryvex-pods');
css = css.replace(/TRYVEXU(\d+)X/g, (_, i) => urlsCss[+i]);
note(`identificadores de marca renombrados en el CSS: ${claseAntes} (deben calzar con los del HTML)`);

fs.writeFileSync('dist/assets/styles.css', css);

// tokens Tryvex encima del CSS de Apple
const tokens = `
/* ── Tryvex design tokens ───────────────────────────── */
:root{
  --tryvex-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --tryvex-tinta: #1d1d1f;
  --tryvex-papel: #fff;
  --tryvex-papel-alt: #f5f5f7;
  --tryvex-gris: #86868b;
  --tryvex-spark: #0071e3;
}
html, body { font-family: var(--tryvex-sans); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
img, video { max-width: 100%; }
html, body { overflow-x: clip; }   /* clip NO crea contexto de scroll: sticky sigue vivo */
*, *::before, *::after { box-sizing: border-box; }

/* Galerias horizontales: Apple las manejaba por JS que ya no tenemos */
.card-set.tryvex-scroller,
ul.tryvex-scroller,
/* Contencion del scroll horizontal SIN tocar el ancho de las tarjetas.
   La version anterior imponia max-width:min(88vw,34rem) (544px) a todo
   hijo de una galeria. Medido contra el original a 1440px: Apple usa
   372px en las galerias de tres columnas (product-stories, noise-control,
   hearing-health) y 1260px en las de tarjeta unica (highlights, magical).
   Nosotros dabamos 578px en las cuatro: ni una ni otra. El ancho y el
   margen ya vienen resueltos en el CSS de Apple, incluida su degradacion
   por breakpoint; aca solo se garantiza que la fila desplace en vez de
   desbordar la pagina. */
.tryvex-scroller{
  overflow-x:auto; overflow-y:hidden;
  -webkit-overflow-scrolling:touch; scrollbar-width:thin;
}
.tryvex-scroller > *{ scroll-snap-align:center; }
.tryvex-scroller::-webkit-scrollbar{ height:6px; }
.tryvex-scroller::-webkit-scrollbar-thumb{ background:rgba(0,0,0,.22); border-radius:3px; }
/* ── Explorador de producto ─────────────────────────────
   El CSS de Apple ya trae toda la animacion del componente. Solo se
   asegura que las pildoras sean clicables: su regla base las deja en
   pointer-events:none esperando al bundle que no tenemos. */
/* El contenedor del medio es un grid. Su <video> y su <picture> caian en
   filas distintas: sumaban 1284px dentro de 640 y el primero se salia por
   arriba. Compartiendo celda se superponen y se centran, que es lo que
   hace Apple con su bundle. */
/* .video-wrapper es un grid con 7 hijos: el <video> y tres <picture>
   (fotograma inicial, final y fallback). Apple los superpone en la misma
   celda desde su bundle; sin el, caen en filas distintas y suman mas alto
   que el contenedor: el primero se sale por arriba y la imagen sale
   cortada. Medido en movil: 1284px de contenido dentro de 640. */
.video-wrapper > *{ grid-area:1 / 1; }
.video-wrapper{ place-items:center; overflow:hidden; }
.video-wrapper video,
.video-wrapper picture,
.video-wrapper img{
  max-width:100%; max-height:100%; width:auto; height:auto;
  object-fit:contain;
}
.product-viewer-media{ overflow:hidden; }
.product-viewer-media > *{ grid-area:1 / 1; }

.control-item{ pointer-events:auto!important; }
/* Apple hace aparecer la etiqueta con una animacion de intro que corre en su
   bundle. Sin ese bundle el texto existe pero queda en opacity:0. */
.control-item-label{ opacity:1!important; }
.control-item .plus-icon{ opacity:1!important; }
/* El parrafo del detalle abierto tambien depende de la animacion. */
.control-item.expanded .control-item-content-inner{ opacity:1!important; }
/* El envoltorio tambien entra en opacity:0 y su animacion la corria el
   bundle: la pildora se expandia a 156px y quedaba en blanco. Medido en el
   original: .control-item-content en opacidad 1 con el detalle abierto. */
.control-item.expanded .control-item-content{ opacity:1!important; }
.control-item-open{ cursor:pointer; }
.paddlenav-button{ cursor:pointer; }
.paddlenav-button:disabled{ opacity:.25; cursor:default; }
/* Apple deja las flechas de galeria visibles y al 42% cuando no hay a
   donde ir, en vez de ocultarlas. Comunica que la galeria existe. */
.paddlenav-arrow:disabled{ opacity:.42; cursor:default; pointer-events:none; }
.paddlenav-arrow{ cursor:pointer; transition:opacity .2s ease; }

[data-tryvex-oculto]{ display:none!important; }

/* ── Precio por volumen ─────────────────────────────── */
.tv-volumen{ background:var(--tryvex-papel); padding:clamp(4rem,3rem+5vw,8rem) 1.5rem; }
.tv-volumen-inner{ max-width:1120px; margin-inline:auto; text-align:center; }
.tv-volumen-titulo{
  font-size:clamp(2rem,1.2rem+3.2vw,3.5rem); line-height:1.07; letter-spacing:-.022em;
  font-weight:600; color:var(--tryvex-tinta); margin:0 0 .75rem;
}
.tv-volumen-bajada{
  font-size:clamp(1.05rem,.98rem+.35vw,1.3rem); line-height:1.45; color:var(--tryvex-gris);
  max-width:36rem; margin:0 auto clamp(2.5rem,2rem+2vw,4rem);
}
.tv-tramos{
  list-style:none; margin:0; padding:0;
  display:grid; gap:1rem;
  grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
}
.tv-tramo{
  background:var(--tryvex-papel-alt); border-radius:18px;
  padding:1.75rem 1.25rem; position:relative;
  transition:transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s ease;
}
.tv-tramo:hover{ transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,0,0,.09); }
.tv-tramo-destacado{ background:var(--tryvex-tinta); }
.tv-tramo-destacado :is(.tv-tramo-etiqueta,.tv-tramo-precio){ color:var(--tryvex-papel); }
.tv-tramo-destacado :is(.tv-tramo-rango,.tv-tramo-unidad){ color:rgba(255,255,255,.62); }
.tv-tramo-etiqueta{
  font-size:.82rem; font-weight:600; letter-spacing:.04em; text-transform:uppercase;
  color:var(--tryvex-gris); margin:0 0 .5rem;
}
.tv-tramo-rango{ font-size:.9rem; color:var(--tryvex-gris); margin:0 0 1rem; }
.tv-tramo-precio{
  font-size:clamp(1.6rem,1.3rem+1.1vw,2.1rem); font-weight:600; letter-spacing:-.02em;
  color:var(--tryvex-tinta); margin:0; font-variant-numeric:tabular-nums;
}
.tv-tramo-unidad{ font-size:.82rem; color:var(--tryvex-gris); margin:.15rem 0 .75rem; }
.tv-tramo-ahorro{
  font-size:.85rem; font-weight:600; color:var(--tryvex-spark); margin:0; min-height:1.2em;
}
.tv-tramo-destacado .tv-tramo-ahorro{ color:#5ac8fa; }
.tv-volumen-pie{
  font-size:.8rem; color:var(--tryvex-gris);
  margin:clamp(1.75rem,1.5rem+1vw,2.75rem) auto 0; max-width:34rem;
}
@media (max-width:520px){
  .tv-tramos{ grid-template-columns:repeat(2,1fr); }
  .tv-tramo{ padding:1.35rem .9rem; }
}

/* ── Motion ─────────────────────────────────────────── */
.start-frame,.end-frame{ transition:opacity .4s ease; }

@keyframes tryvexReveal{ from{opacity:0; transform:translateY(1.75rem);} to{opacity:1; transform:none;} }
.tryvex-reveal{
  animation: tryvexReveal linear both;
  animation-timeline: view();
  animation-range: entry 8% cover 32%;
}
@supports not (animation-timeline: view()){
  .tryvex-reveal{ animation:none; opacity:0; transform:translateY(1.75rem);
                  transition:opacity .6s cubic-bezier(.16,1,.3,1), transform .6s cubic-bezier(.16,1,.3,1); }
  .tryvex-reveal.visible{ opacity:1; transform:none; }
}

/* Secuencia scrubbeada */
.tryvex-scrub{ height:280vh; position:relative; }
.tryvex-scrub .scrub-sticky{ position:sticky; top:0; height:100dvh; display:grid; place-items:center;
                             background:var(--tryvex-papel-alt); }
.tryvex-scrub .scrub-canvas{ width:min(100%,1100px); height:auto; opacity:0; transition:opacity .3s ease; }
.tryvex-scrub .scrub-fallback{ display:none; width:min(100%,1100px); height:auto; }

@media (prefers-reduced-motion: reduce){
  .tryvex-scrub{ height:100vh; }                 /* colapsar el rango, no dejar hueco */
  .tryvex-scrub .scrub-canvas{ display:none; }
  .tryvex-scrub .scrub-fallback{ display:block; }
  .tryvex-reveal{ animation:none!important; opacity:1!important; transform:none!important; }
}

@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{ animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; scroll-behavior:auto!important; }
}
`;
fs.writeFileSync('dist/assets/tryvex.css', tokens);
$('head').append('<link rel="preconnect" href="https://fonts.googleapis.com">\n');
$('head').append('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n');
$('head').append('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">\n');
$('head').append('<link rel="stylesheet" href="assets/tryvex.css">\n');
note('tokens Tryvex + Inter inyectados');

/* ─── 7e. Motion: marcar reveals e inyectar el modulo ─────────── */
let rev = 0;
$('.section h2, .section h3, .section .card-container, .section figure, .section .media-block')
  .each((_, el) => { $(el).addClass('tryvex-reveal'); rev++; });
note(`elementos marcados para reveal: ${rev}`);

// Las clases de entorno del <html> quedaron congeladas en el mirror. Este
// modulo va SINCRONO en el head: si llegara tarde, la pagina pintaria un
// primer cuadro con el explorador en su variante movil.
/* Las pildoras del explorador venian con un `style` en linea congelado a
   mitad de la animacion de entrada de Apple: cada una con su propio
   translate3d acumulativo (30px, 247px, 446px, 781px...) que las dejaba en
   diagonal y empujaba la sexta fuera de pantalla. Medido en el original en
   reposo: las seis en x=90, sin transform y sin atributo style.
   Se conserva `pointer-events` y se descarta el resto. */
let pildorasLimpiadas = 0;
$('.control-item').each((_, el) => {
  if (!$(el).attr('style')) return;
  $(el).attr('style', 'pointer-events:auto;');
  pildorasLimpiadas++;
});
$('.control-item-media, .control-item-content, .control-item-bg').each((_, el) => {
  const st = $(el).attr('style');
  if (st && /translate3d|--scale|--alpha/.test(st)) { $(el).removeAttr('style'); pildorasLimpiadas++; }
});
note(`estilos de intro congelados retirados: ${pildorasLimpiadas}`);

fs.copyFileSync('src/tryvex-breakpoints.js', 'dist/assets/tryvex-breakpoints.js');
$('head').append('<script src="assets/tryvex-breakpoints.js"></script>' + String.fromCharCode(10));

fs.copyFileSync('src/tryvex-motion.js', 'dist/assets/tryvex-motion.js');
$('body').append('\n<script src="assets/tryvex-motion.js" defer></script>\n');
fs.copyFileSync('src/tryvex-ui.js', 'dist/assets/tryvex-ui.js');
$('body').append('<script src="assets/tryvex-ui.js" defer></script>' + String.fromCharCode(10));
note('modulos de motion y UI inyectados');

/* ─── 8. Emitir ───────────────────────────────────────────────── */
fs.mkdirSync('dist/assets', { recursive: true });
let out = $.html();
// barrido final: identificadores tecnicos con marca ajena
const antes = (out.match(/airpods/gi) || []).length;
// proteger rutas assets/: ahi los nombres deben calzar con el disco
const protegidas = [];
out = out.replace(/assets\/(media|inline)\/[^"'\s,)]+/g, (m) => {
  protegidas.push(m);
  return `TRYVEXP${protegidas.length - 1}`;
});
out = out.replace(/airpods[_-]pro[_-]?\d?/gi, 'tryvex-pods-pro').replace(/airpods/gi, 'tryvex-pods');
out = out.replace(/TRYVEXP(\d+)/g, (_, i) => protegidas[+i]);

// Colisiones de concordancia que dejan los reemplazos de marca.
// Se hace aqui, sobre el HTML ya serializado, porque en el bucle por
// nodos los regex reutilizados no se comportaban de forma fiable.
const CONCORDANCIA = [
  [/\btu\s+tu\b/gi, 'tu'],
  [/\b(el|la|los|las|un|una|al|del)\s+(tu|tus)\b/gi, '$2'],
  [/\blos\s+los\b/gi, 'los'],
  [/\bde\s+de\b/gi, 'de'],
  [/\ben\s+en\b/gi, 'en'],
];
let conc = 0;
for (const [re, to] of CONCORDANCIA) {
  const n = (out.match(re) || []).length;
  if (n) { out = out.replace(re, to); conc += n; }
}
note(`colisiones de concordancia corregidas: ${conc}`);
note(`rutas de assets protegidas del renombrado: ${protegidas.length}`);
note(`identificadores tecnicos renombrados: ${antes}`);
fs.writeFileSync('dist/index.html', out);
note(`dist/index.html emitido: ${(out.length / 1024).toFixed(0)} KB`);
fs.writeFileSync('dist/_build-log.txt', log.join('\n'));
