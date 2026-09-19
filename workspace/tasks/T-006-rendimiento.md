# T-006 — Auditoría de rendimiento y peso de Tryvex

Esta tarea se completa ÚNICAMENTE escribiendo el archivo de salida con tus herramientas.

**NO EDITES CÓDIGO FUENTE.** El repositorio no tiene git: un cambio tuyo no se puede
revertir. Tu entregable es un informe. Editar `.tsx` o `.css` invalida la entrega.

## ENTREGABLE ÚNICO
`C:\Users\w10\Documents\GitHub\airpods-pro-3-apple-cl\workspace\out\T-006-rendimiento.md`

## Contexto
Next.js en `app/tryvexstore`, dev server en http://localhost:3100 (no lo levantes). La home
mide ~8.000 px y tiene varios tramos de scroll con `animation-timeline` y `view-timeline`.
Objetivos de la casa: LCP < 2.5s, INP < 200ms, CLS < 0.1, JS < 150kb gzip en landing.

## Puntos (contrato auditable)
1. Mide en `/` y en `/tienda`: LCP, CLS y TBT con la API de rendimiento del navegador.
   Reporta el elemento exacto que produce el LCP en cada ruta.
2. Inventaría cada imagen de `/`: peso en bytes, formato servido, dimensiones naturales,
   dimensiones mostradas y si tiene `loading="lazy"` o `priority`. Señala las que pesan más de
   200 KB y las que se sirven a más del doble del tamaño que ocupan.
3. Reporta el peso total transferido de `/` separado por tipo: documento, JS, CSS, imágenes,
   fuentes. Indica cuánto de eso ocurre antes del primer render.
4. Lista las fuentes cargadas: familia, pesos, formato, si van con `font-display: swap` y si
   alguna se carga sin usarse.
5. Busca desplazamientos de layout: reporta cada elemento que provoca CLS, con su valor y el
   momento en que ocurre.
6. Evalúa el costo de los tramos de scroll (`.foco-tramo`, `.galeria-tramo`, `.eco-seccion`):
   mide cuadros por segundo mientras se recorre la home de arriba a abajo y reporta dónde baja
   de 50 fps, si ocurre.
7. Revisa `npm run build` y reporta el tamaño de First Load JS por ruta, señalando las rutas
   por encima de 150 KB.
8. Verifica que las imágenes usan el componente de imagen de Next con `sizes` correcto;
   reporta las que no.

## Reglas
- Grep dirigido, no leas archivos enteros.
- **Si no lo verificaste, escribe NO VERIFICADO.** Un dato inventado invalida la entrega.
- No propongas cambiar la identidad visual. El objetivo es peso y fluidez.

## Cierre
Máximo 10 líneas: métricas obtenidas, las 3 mayores fuentes de peso, y los 3 arreglos de mayor
impacto ordenados por relación beneficio/esfuerzo.
