# T-002 — Auditoría de contraste y accesibilidad visual de Tryvex Store

Esta tarea se completa ÚNICAMENTE escribiendo el archivo de salida con tus
herramientas. No describas planes, no propongas: ejecuta y escribe el archivo.

**NO EDITES CÓDIGO FUENTE.** Este repositorio no tiene git: un cambio tuyo no se
puede revertir. Tu entregable es un informe. Cualquier edición a `.tsx` o `.css`
invalida la entrega.

## ENTREGABLE ÚNICO

`C:\Users\w10\Documents\GitHub\airpods-pro-3-apple-cl\workspace\out\T-002-contraste.md`

## Contexto

- App Next.js ya corriendo en **http://localhost:3100** (no la levantes).
- Rutas a auditar: `/`, `/tienda`, `/producto/<slug-real>` (sácalo de la grilla de
  `/tienda`), `/comprar`, `/ayuda`.
- Umbral: **WCAG AA** — 4.5:1 para texto normal, 3:1 para texto grande
  (≥24px, o ≥18.66px en negrita).

## Puntos (contrato auditable)

1. Para cada ruta, recorre los elementos con texto visible y calcula la razón de
   contraste real entre `color` y el fondo efectivo. Reporta **solo los que
   incumplen**, con: ruta, texto (máx. 40 caracteres), color, fondo, tamaño, peso,
   razón calculada y umbral que le corresponde.
2. **Caso crítico — texto sobre imagen.** El sitio tiene texto encima de fotos
   (escenario del héroe en `/`, escenas de scroll). Ahí el fondo efectivo NO es un
   color CSS: hay que muestrear los píxeles reales de la imagen bajo el texto.
   Identifica cada bloque de texto sobre imagen y evalúa el peor caso. Este es el
   punto más importante de la tarea.
3. Verifica el **foco de teclado**: recorre la página con Tab y reporta todo elemento
   interactivo cuyo indicador de foco sea invisible o tenga contraste menor a 3:1
   contra su fondo.
4. Verifica que ningún texto dependa **solo del color** para comunicar estado
   (por ejemplo precio en oferta, disponibilidad).
5. Revisa `prefers-reduced-motion`: con esa preferencia activa, confirma que las
   animaciones del héroe y de las escenas de scroll quedan efectivamente detenidas.
   Reporta qué sigue moviéndose, si algo lo hace.
6. Lista las imágenes sin texto alternativo apropiado: `<img>` sin `alt`, y `alt`
   no vacío en imágenes decorativas.

## Reglas

- Usa grep dirigido si necesitas leer código; no leas archivos enteros.
- **Si no lo verificaste, escribe NO VERIFICADO.** Un dato inventado invalida la entrega.
- No cambies el código para "arreglar" lo que encuentres. Solo reporta.

## Cierre

Termina con un resumen de máximo 10 líneas: cuántos incumplimientos AA encontraste,
cuántos son texto sobre imagen, y los 3 más graves ordenados por severidad.
