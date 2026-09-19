# T-001 — Auditoría responsive de Tryvex Store

Esta tarea se completa ÚNICAMENTE escribiendo el archivo de salida con tus
herramientas. No describas planes, no propongas: ejecuta y escribe el archivo.

**NO EDITES CÓDIGO FUENTE.** Este repositorio no tiene git: un cambio tuyo no se
puede revertir. Tu entregable es un informe. Cualquier edición a `.tsx` o `.css`
invalida la entrega.

## ENTREGABLE ÚNICO

`C:\Users\w10\Documents\GitHub\airpods-pro-3-apple-cl\workspace\out\T-001-responsive.md`

## Contexto

- App Next.js en `app/tryvexstore`, ya corriendo en **http://localhost:3100** (no la levantes).
- Herramienta: Playwright. Debe controlar el **viewport real**, no el tamaño de ventana.
- Anchos obligatorios: **390**, **768**, **1440**.

## Puntos (contrato auditable)

1. Descubre las rutas reales del storefront. Parte por `/` y `/tienda`; obtén el slug
   real del producto desde el enlace de la grilla de `/tienda` (hay 1 solo producto).
   Incluye al menos: `/`, `/tienda`, `/producto/<slug-real>`, `/comprar`, `/ayuda`.
   Lista en el informe cada ruta que auditaste y su código HTTP.
2. Para cada ruta × cada ancho (390/768/1440), mide **desborde horizontal** con
   `document.documentElement.scrollWidth - window.innerWidth`. Reporta el valor exacto
   en píxeles. Cero es aprobado; cualquier valor > 0 es un hallazgo.
3. Cuando haya desborde, identifica **el elemento culpable**: recorre los elementos y
   reporta los que tengan `getBoundingClientRect().right > window.innerWidth`, con su
   tag, sus primeras clases y el valor de `right`. Sin el culpable, el hallazgo no sirve.
4. Detecta **texto cortado o superpuesto**: elementos cuyo `scrollHeight > clientHeight`
   teniendo `overflow: hidden`, y elementos de texto con `clientWidth < 40px`.
5. Verifica que los **objetivos táctiles** a 390px midan al menos 44×44 px:
   enlaces y botones. Reporta los que no lleguen, con su texto y su tamaño real.
6. Captura una imagen por ruta × ancho en
   `workspace/out/shots/<ruta-slug>-<ancho>.png` y nombra cada archivo en el informe.
7. Tabla resumen final: filas = rutas, columnas = 390/768/1440, celda = OK o el
   desborde en px.

## Reglas

- Usa grep dirigido si necesitas leer código; no leas archivos enteros.
- **Si no lo verificaste, escribe NO VERIFICADO.** Un dato inventado invalida la entrega.
- No cambies el código para "arreglar" lo que encuentres. Solo reporta.

## Cierre

Termina con un resumen de máximo 10 líneas: cuántas combinaciones ruta×ancho pasaron,
cuántas fallaron, y los 3 hallazgos más graves ordenados por severidad.
