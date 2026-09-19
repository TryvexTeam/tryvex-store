# Tryvex Store — estado del proyecto

> Última actualización: 2026-09-01 (sesión de paridad UI/UX)
> Documento de traspaso. Léelo completo antes de tocar nada.

---

## Qué es esto

Tienda para vender audífonos TWS importados, marca **Tryvex**, producto
**Audífonos Pods Pro** a $25.000 CLP. 30 unidades compradas a $10.000 c/u.

Se partió de un mirror completo de `apple.com/cl/airpods-pro/` (28 MB) que el
señor Ignacio bajó. La landing es ese HTML limpiado y rebrandeado; el panel es
una app Next.js nueva.

**Ellos revenden, no fabrican.** Ninguna frase puede atribuirles la tecnología.

---

## Cómo levantar todo

```bash
# Landing (estática)
node construir.mjs                       # build.mjs + WebP encadenados
cd dist && python -m http.server 4173    # → http://localhost:4173

# Panel + checkout (Next.js)
cd app/tryvexstore && npm run dev -- --port 3100
#   http://localhost:3100/comprar        checkout público
#   http://localhost:3100/panel          panel del equipo (pide login)
```

`construir.mjs` es el único comando de build de la landing. **No correr
`build.mjs` solo**: se salta el paso de WebP y la landing engorda 22 MB.

---

## Arquitectura

```
airpods-pro-3-apple-cl/
├── _original/            HTML y CSS de Apple sin tocar (respaldo)
├── _video_original/      videos antes del re-encode
├── _imagenes_original/   imágenes antes de WebP
├── build.mjs             limpieza, rebranding, resolución de assets
├── _tools_webp.mjs       conversión a WebP + reescritura de referencias
├── construir.mjs         encadena los dos anteriores
├── config/precios.json   espejo local de precio_tramos
├── src/
│   ├── tryvex-motion.js  videos, reveals, secuencia scrubbeada
│   └── tryvex-ui.js      explorador, pestañas, flechas, play/pausa
├── dist/                 la landing construida (13 MB)
└── app/tryvexstore/      Next.js 16 · panel + checkout
```

### Base de datos

Supabase **tryvex** (`wfsjzhshkaokjoansbhc`), el mismo que usa la plataforma
interna. Se reutilizan sus tablas y su modelo de permisos; no hay uno paralelo.

Tablas creadas para la tienda:

| Tabla | Para qué |
|---|---|
| `productos` | catálogo, precio base, **costo unitario** |
| `precio_tramos` | precio por volumen, editable desde el panel |
| `stock_movimientos` | 9 motivos; el stock es la **suma**, no un campo |
| `pedidos` / `pedido_items` | pedidos web y manuales |
| `secciones_landing` | visibilidad y orden de secciones (sin usar aún) |
| `v_stock_actual` | vista con `security_invoker = on` |

Permisos: RLS con los helpers que ya existían, `is_integrante()` y
`tengo_permiso('ver_finanzas' | 'gestionar_finanzas')`. Quien ve finanzas en
Tryvex las ve en la tienda.

Bucket `vouchers`: privado, 10 MB, JPG/PNG/WebP/HEIC/PDF.

---

## Lo que funciona y está verificado

Todo lo de abajo se midió en navegador o por SQL, no por inspección de código.

### Landing

- 28,2 MB → **230 KB** de HTML; `dist` completo **13 MB** (pico: 83 MB)
- Videos 58,5 → **4,6 MB**; imágenes 27,3 → **5,3 MB** en WebP
- **0 imágenes rotas, 0 borrosas** en 375 / 768 / 1440
- Sin scroll horizontal en ningún breakpoint
- **0 menciones** de AirPods / Apple / iPhone en el texto visible
- 12 videos que arrancan al entrar en viewport y se pausan al salir
- 64 reveals con `animation-timeline: view()` nativo
- **18/18 botones** producen un cambio de estado real (probado por clic)
- Explorador "Míralos en detalle": 6 píldoras, flechas y cerrar

### Panel (`/panel`)

- Login con credenciales de Tryvex, rutas protegidas por middleware
- **Productos**: precio, costo y los 5 tramos editables. Bloquea vender bajo costo
- **Stock**: 9 motivos, precio sugerido por tramo pero **negociable**, margen en vivo
- **Pedidos**: máquina de estados; pagar **no** descuenta stock dos veces
- **Finanzas**: comprobantes en bucket privado, punto de equilibrio

### Checkout (`/comprar`)

- Selector de cantidad con tramo aplicado en vivo
- **El precio lo decide el servidor**, nunca el formulario
- Stock verificado contra `v_stock_actual` antes de insertar
- Crea pedido + reserva stock + arma mensaje de WhatsApp

---

## Lo que NO está bien — punch list

El señor Ignacio reportó, y hay que tratarlo como cierto hasta medirlo:

### 1. Paridad visual con el original

Resuelto en esta sesión. Cinco causas raíz, todas medidas en navegador contra
`apple.com/cl/airpods-pro` con las dos pestañas abiertas, ninguna supuesta:

| Qué estaba mal | Causa raíz | Cómo se ve ahora |
|---|---|---|
| Todo el sitio se renderizaba en su variante móvil | El mirror congeló `small-breakpoint` y `no-enhanced` en el `<html>`. `small-breakpoint` gobierna 11 reglas, casi todas del explorador; `no-enhanced` apaga 58 | `src/tryvex-breakpoints.js`, con los umbrales medidos por bisección sobre el original |
| "Míralos en detalle": píldoras en diagonal, la sexta fuera de pantalla | Cada `.control-item` traía un `transform:translate3d` en línea congelado a mitad de la animación de entrada | Las seis en x=90, como el original |
| Tarjetas de galería con el ancho equivocado en 4 secciones | La clase propia `tryvex-scroller` imponía 578px. El original usa 372px en las galerías de tres columnas y 1260px en las de tarjeta única | 372 y 1260 exactos |
| Nueve botones de play invisibles | Los contenedores conservaban `fallback` y `static-fallback-only`, que apagan la UI por CSS, y faltaba el ciclo `loading-empty → loaded → playing/paused/ended` | 48 controles visibles; el original tiene 47 |
| Dos puntos encendidos a la vez en el dotnav | La clase `current` no viajaba entre pestañas, y el mirror la dejó congelada en el segundo ítem de la galería de salud auditiva | Selección `001100`, idéntica al original |
| **Ocho secciones reproducían el video equivocado** | Los once videos se guardaron todos como `large_2x.mp4` con un sufijo `-N` que refleja el orden de descarga. La resolución iba por nombre de archivo, así que los ocho mp4 caían en el hero. El fondo del explorador mostraba una bailarina en vez del producto | `config/videos.json`, mapeado comparando el `Content-Length` de apple.com contra cada archivo de `_video_original/`. 12 videos, 12 archivos distintos |
| Sección de audio 907px más alta y dos frames en 0x0 | El barrido de rebranding renombraba `airpods` dentro de los **nombres de clase** del HTML, pero el CSS conservaba el nombre viejo: los selectores dejaban de encontrar su elemento | La sustitución se aplica a los dos lados. Altura 3018, exacta |
| Toda la grilla 15px más angosta | `--global-scrollbar-width` venía escrito como `15px` en el `style` del `<html>`; se resta en las variables de columna y de galería | Se calcula en runtime. 0px, cabecera de 1440 |
| Ocho componentes de media mostrando el póster para siempre | Conservaban la clase `fallback` del mirror, que por CSS deja el video en `display:none` | Se retira al tener el primer fotograma. Los del tour cargan al abrir su píldora |
| El detalle del explorador se abría en blanco, sin flechas ni X | `.control-item-content` en opacidad 0, y las flechas y el botón de cerrar en `visibility:hidden` con `scale(0)` esperando la clase `visible` | Tarjeta 423x156 con el párrafo entero, flechas 90x496, X de 44x44 que cierra |
| En móvil las píldoras se apilaban | El original no las apila: las pone en fila con 12px de hueco, y al abrir una las lleva a 295px centrando la abierta | Medido a 375px: mismas posiciones y anchos que el original |
| **Las pestañas de "Nuevos poderes mágicos" no hacían nada** | Tres mecanismos congelados a la vez: los paneles se apilan y el visible lo decide un `z-index` inline (el viejo se quedaba encima); la píldora oscura se posiciona con `--tabnav-indicator-width` y `--tabnav-indicator-start`; y el párrafo de cada panel se enciende con la clase `caption-show` | Las cuatro pestañas cambian imagen, indicador y texto |
| El explorador se abría sin comunicarlo | `aria-expanded` no cambiaba nunca y el foco no seguía al detalle | El atributo viaja con la clase; referencias `aria-controls` rotas: de 1 a 0 |

Comprobado además: los 26 controles visibles producen un cambio de estado real
al pulsarlos, 0 scroll horizontal en 375 / 768 / 1440, 0 imágenes rotas y 0
respuestas 404.

Queda abierto: tres videos ausentes respecto al original (uno en highlights,
uno en product-stories, uno en audio-performance) y la tarjeta de asistencia
auditiva, retirada porque su imagen no venía en el material.

### 2. Enlaces sueltos

- El botón "Comprar" **sí** apunta al checkout (`TRYVEX_CHECKOUT`, por defecto
  `http://localhost:3100/comprar`). El punto anterior de esta lista estaba
  desactualizado.
- Se neutralizaron tres rutas absolutas heredadas que daban 404 bajo nuestro
  dominio, una con el rebranding incrustado en la propia ruta. El filtro del
  build solo miraba el dominio escrito; ahora cubre toda ruta absoluta ajena.
- Sigue pendiente el rewrite para servir landing y app bajo un dominio único.

### 3. Sin construir

- `/panel/paginas` — editar secciones de la landing desde el panel
- Mercado Pago / Flow: el checkout los ofrece pero solo transferencia opera
- Deploy a `tryvexstore.cl`

### 4. Datos de marcador

En `app/tryvexstore/app/comprar/datos-pago.ts`:
número de cuenta, RUT y WhatsApp están como `—`. **La tienda no puede
recibir pagos hasta llenarlos.**

---

## Método que funcionó — y el que no

Esto es lo más importante de este documento.

**No funcionó** parchar lo que se veía roto. Llevó a inventar un carrusel que no
correspondía, a ocultar el `pin-center` creyéndolo duplicado, y a no ver que el
orden de secciones estaba roto.

**Funcionó** abrir `apple.com/cl/airpods-pro/` en una pestaña de Playwright y
**medir el original antes de tocar nada**. Cada bug apareció con su causa exacta:

- El CSS de Apple ya trae la animación. Su JS solo alterna clases y estilos en
  línea. Replicar el estado son 40 líneas; reimplementar el efecto, 400.
- Apple tiene **76 reglas `html.no-js`** con su propia degradación diseñada.
- Apple degrada por breakpoint: bajo 735px **no reproduce video**.
- Las flechas de galería **no hacen scroll**: mueven la clase `current`.
- No se ocultan en los extremos: **se deshabilitan** al 42% de opacidad.

**Contar `addEventListener` no es verificar.** Un botón con handler puede no
producir efecto. Hay que hacer clic y medir el cambio de estado.

**Y un clic sintético tampoco basta.** En esta sesión, cuatro controles dieron
"sin efecto" en la pasada automática y los cuatro eran falsos negativos del
propio test: el clic con `force` se despacha en unas coordenadas que otro
elemento puede estar tapando. Antes de declarar roto un control, invocarlo
directamente sobre el elemento.

**Lo que el mirror congela es la primera sospecha.** Las cinco causas raíz de
esta sesión son la misma: el bundle de Apple mantenía vivo un valor (una clase
del `<html>`, un `transform` en línea, una clase de estado del reproductor) y
la captura lo dejó clavado en el instante de la foto. Ante cualquier
diferencia visual, mirar primero qué atributo quedó fijo, no qué CSS falta.

---

## Bugs propios que costaron caro (para no repetirlos)

1. **`\b` en ediciones con Python** se convierte en carácter backspace (0x08).
   30 regex del pipeline quedaron rotos en silencio. Usar cadenas crudas.
2. **`opacity: 0` no saca del flujo.** El fallback seguía ocupando su celda del
   grid y partía la imagen en móvil.
3. **`overflow-x: hidden` mata `position: sticky`.** Usar `clip`.
4. **srcset con descriptor 2x falso**: emitir `x.jpg, x.jpg 2x` hace que el
   navegador use la mitad de la resolución. 21 imágenes borrosas por esto.
5. **El re-encode en `dist` se pierde** en cada build. Encodear las fuentes.
6. **`'use server'` solo exporta funciones async.** Exportar un objeto da 500.
7. **IntersectionObserver no dispara con área cero.** Observar un ancestro con
   tamaño real.

---

## Verificación

`.verify/verdict.json` guarda el último veredicto con evidencia por check.
La regla: **nada se reporta como hecho sin medirlo**. Screenshot, SQL o
`node --check`, no "debería andar".

---

## Siguiente sesión: orden sugerido

1. **Auditoría sección por sección** contra el original, con las dos pestañas
   abiertas. Producir una tabla de diferencias antes de tocar código.
2. Arreglar por orden de impacto visual.
3. Enlazar "Comprar" → `/comprar` y montar el rewrite de dominio único.
4. Datos bancarios reales.
5. `/panel/paginas`.
6. Deploy.

Pendiente del señor Ignacio: **datos bancarios y número de WhatsApp**.

## 2026-09-11 — Ecosistema interno del panel (fase 1 completa)

- **Catálogo multiproducto:** estado borrador / publicado / archivado (publicar exige foto, categoría y precio), categorías con gestor propio, marca, condición, etiqueta, precio anterior honesto, peso y medidas, GTIN.
- **Variantes** con SKU y stock propio; Stock y Pedidos obligan a elegirla cuando existen. Reserva, liberación y venta ya llevan `variante_id`.
- **Pedidos:** ficha con hitos (pagado, enviado, entregado), despacho (región, comuna, courier, seguimiento), referencia de pago y boleta. Los enlaces solo aceptan https.
- **Ajustes** (`/panel/ajustes`): cuenta bancaria, envío y textos legales en `configuracion_tienda`; `/comprar` ya los lee. Solo lo edita administración o finanzas (lo impone el RLS).
- **Bitácora del equipo** en Resumen, escrita por triggers.
- **Feed de servicio** `/api/feed/productos` para Google y Meta: solo publica lo publicado y agrupa las variantes con `item_group_id`. `FEED_TOKEN` es opcional.
- **Verificado:** tsc, next build, e2e Playwright 12/12 (datos de prueba eliminados), advisors sin hallazgos nuevos.
- **Pendiente:** fase 2 (tienda web conectada al catálogo; `/comprar` todavía usa un SKU fijo); `app/comprar/datos-pago.ts` quedó sin uso y se puede borrar; faltan los datos bancarios reales, que se cargan en Ajustes.

## 2026-09-11 — Portada de la tienda (fase 2, primera pieza)

- `/` dejó de ser la plantilla de Next: es la portada de la tienda y lee la base (`lib/tienda.ts`, solo lo publicado y solo columnas de vitrina). Publicar un producto con foto en el panel genera su card sola; archivarlo la saca. Las acciones del panel llaman `revalidatePath('/')`.
- Regla de oro aplicada: quiebres 735 / 834 / 1069 (`t:` `n:` `d:`), cards 309×450 y 400×500 que nunca se estiran, 20 px de separación, encaje al soltar con la siguiente asomándose, flechas solo desde 735 que avanzan una card (420 px), hover de 1% con sombra de .08 a .16 en 300 ms, una sola curva.
- Estructura: cabecera (hamburguesa con menú de dos niveles hasta 834 px), héroe con plantilla fija (producto más reciente con foto y stock), «Tienda.» por categoría, «Lo último.», una franja por categoría (si hay dos o más), beneficios tomados de Ajustes que abren una hoja, enlaces rápidos y pie legal.
- `/comprar?sku=` abre cualquier producto publicado (el SKU se valida con una regex antes de consultar la base).
- Los Pods Pro ya tienen foto en Storage (`<id>/pods-pro.webp`).
- Lección: un `sr-only` absoluto dentro de un carrusel escapa del recorte si la card no es `relative`, y ensancha la página en el teléfono (704 px en un viewport de 390).
- Pendiente de la fase 2: ficha propia por producto (hoy la card lleva a `/comprar`), selector de variantes en `/comprar`, carrito.
- **v2 de la portada (misma fecha):** estructura de la Tienda de Apple.
  - La portada abre con una banda «Tryvex Store», con su promesa y una fila de categorías con foto.
  - Hay tres tipos de card en `components/tienda/card-producto.tsx`:
    - destacada de 400×500, en claro u oscuro, que se alternan en «Lo último»;
    - editorial de 400×500, que abre cada categoría y aparece solo cuando esa categoría tiene dos o más productos;
    - producto de 313×500, con foto arriba y precio al pie.
  - Las franjas por categoría aparecen solo cuando hay dos o más categorías.
  - Se verificó con un catálogo de muestra (se crearon 14 cards y se borraron después): 0 de desborde y consola limpia.

## 2026-09-11 (noche) — Recorrido de compra completo: portada, colección, ficha y checkout

- **Portada de marca.** El héroe dice «Tecnología que se siente premium», con el producto destacado tomado del catálogo. La campaña (titulares y fotos) vive como datos en `lib/campana.ts`, y hay un bento de escenas con fotografía y un cierre que lleva a `/tienda`.
- **Colección `/tienda`.** Pestañas por categoría, búsqueda sin tildes, filtros «Disponibles» y «Ofertas», orden por fecha o precio y conteo de artículos. Todo el estado vive en la URL y se filtra en el servidor. La grilla es de 2, 3 y 4 columnas; lo agotado va al final.
- **Ficha `/producto/[slug]`.**
  - Galería deslizable con miniaturas, y la foto cambia con el color elegido.
  - Variantes, precio por volumen y una barra fija en el teléfono que aparece cuando el botón principal queda atrás.
  - Envío, garantía y retracto en acordeones, y productos relacionados.
  - Si el producto está archivado responde 404. El stock se muestra con tope 10 y nunca con el número real.
- **Checkout `/comprar`.**
  - Cuatro pasos (pedido, datos, entrega y pago) y un resumen fijo al costado.
  - Envío gratis desde el monto que se configure y retiro en persona.
  - Región de Chile, comuna y dirección, y un campo trampa contra bots.
  - El servidor valida la variante, el stock por variante, el precio por tramo y el costo de envío.
- **Verificado.**
  - Prueba del recorrido completo con Playwright: 18 de 19 checks pasan de una.
  - La barra fija fallaba: la prueba destapó que `IntersectionObserver` no avisa cuando la página salta de golpe. Se cambió por un listener de scroll y ahora pasa.
  - No hay desborde horizontal entre 320 y 1440 px; typecheck y build pasan.
- **Lecciones.**
  - Un componente de cliente que importaba `lib/ficha.ts` arrastraba el cliente de Supabase con clave de servicio al navegador. Lo puro se separó en `lib/ficha-precio.ts`.
  - `os error 1450` («recursos insuficientes») tumbó los workers de Next y el build. Se resolvió reiniciando el servidor de desarrollo y sin correr navegadores de prueba en paralelo.
- **Pendiente.**
  - Carrito para varios productos, con checkout multiproducto.
  - Número de cuenta y RUT reales en Ajustes.
  - Reseñas reales. No se inventan.

## 2026-09-12 — Bolsa de compra y checkout multiproducto

- **Bolsa** (`lib/carrito.ts` + `components/tienda/bolsa.tsx`):
  - Vive en localStorage, se valida al leerla y se sincroniza entre pestañas.
  - La cabecera muestra el ícono con el contador de unidades.
  - La bolsa abre como hoja: cambiar cantidades, quitar productos y pagar.
  - Al agregar aparece «Agregado a tu bolsa» con el subtotal y dos salidas: seguir comprando o pagar.
- **Ficha:**
  - El botón principal es «Agregar a la bolsa»; «Comprar ahora» queda como segundo, para una sola línea que no toca la bolsa.
  - La barra fija del teléfono también agrega a la bolsa.
- **Checkout multiproducto:**
  - `lib/cotizacion.ts` es la única fuente del precio: tramo por línea, variante y stock; la vista previa y el cobro usan la misma función.
  - Un solo pedido con varias líneas y una reserva de stock por línea. Si falla una línea, se deshace el pedido completo.
  - La bolsa se vacía al confirmar.
- **Otras mejoras de UI/UX:**
  - La ficha ya no ofrece el tramo de 1 unidad como si fuera un descuento.
  - El orden de la colección se aplica al elegirlo.
  - La cabecera tiene lupa de búsqueda: lleva a `/tienda?buscar=1` con el cursor en el buscador.
- **Verificado:**
  - Playwright del recorrido de la bolsa: 18 de 18 checks.
  - Pedido real con 2 líneas y 2 reservas, borrado después; el stock de los Pods Pro volvió a 7.
  - Sin desborde entre 320 y 1440 px; typecheck y build pasan.

## 2026-09-12 (tarde) — Conexión panel → tienda verificada, héroe nuevo y pantallas anchas

- **Conexión confirmada con sesión real del panel (15/15):**
  - Crear un producto lo deja en borrador, invisible para la tienda.
  - La foto se guarda en Storage.
  - Al publicarlo aparece en la portada, en `/tienda`, en su ficha y en el feed.
  - Un cambio de precio se ve al instante en la ficha y en la colección.
  - Al archivarlo sale de todo y su ficha responde 404.
  - La bitácora registra cada paso.
  - Los datos de prueba se borraron.
- **Héroe rediseñado:**
  - La foto va a sangre, de fondo, con un velo negro del lado del texto.
  - El título se acomoda solo, sin saltos forzados, y el acento cae solo en «premium.».
  - Botones «Comprar» y «Ver la tienda».
  - En escritorio hay una tarjeta de vidrio con el producto destacado.
  - En teléfono el recorte muestra la cara completa y todo cabe en la primera pantalla.
- **Pantallas anchas:**
  - `--canal` (un porcentaje del padre) se usaba como relleno dentro de cajas con `max-w`. A 1920 px el margen se aplicaba dos veces: la ficha quedaba en 188 px y el checkout en 340.
  - Regla nueva, anotada en `globals.css`: dentro de una caja con ancho máximo va `px-[22px]` con `max-w-[1204px]`.
  - Corregido en el héroe, la franja de confianza, la ficha, el checkout y los títulos de franja.
- **Verificado:** capturas a 390, 768, 1069, 1440 y 1920 px sin desborde; typecheck y build en verde.
