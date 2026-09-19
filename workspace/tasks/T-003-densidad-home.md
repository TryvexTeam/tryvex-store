# T-003 — Plan de recorte y densidad de la home de Tryvex

Esta tarea se completa ÚNICAMENTE escribiendo el archivo de salida con tus
herramientas. No describas planes en el chat: escribe el archivo.

**NO EDITES CÓDIGO FUENTE.** Este repositorio no tiene git: un cambio tuyo no se
puede revertir. Tu entregable es un informe. Cualquier edición a `.tsx` o `.css`
invalida la entrega.

## ENTREGABLE ÚNICO

`C:\Users\w10\Documents\GitHub\airpods-pro-3-apple-cl\workspace\out\T-003-densidad-home.md`

## Hecho medido que motiva la tarea (no re-discutir, es el punto de partida)

Medido el 2026-09-17 en vivo:

| Sitio | Alto de home | Contenido |
|---|---|---|
| apple.com/cl/store | 5.946 px | 321 tarjetas |
| dunedragon.cl | 6.107 px | 249 tarjetas |
| Tryvex (localhost:3100) | **12.626 px** | **2 enlaces a producto** |

La home de Tryvex es el doble de larga que ambas referencias con una fracción del
contenido. El objetivo es **densidad**: menos alto, más producto por pantalla.

## Contexto

- Código en `app/tryvexstore`. Home en `app/page.tsx`.
- Secciones en `components/tienda/` (héroe, editorial, escenas-scroll, confianza,
  lista-productos, campana).
- Dev server ya corriendo en http://localhost:3100. No lo levantes.
- La sección `foco-tramo` (en `components/tienda/escenas-scroll.tsx`) mide 3.276 px,
  un 26% de la página, y contiene 1 producto.

## Puntos (contrato auditable)

1. Mide cada sección de la home: alto en px, cuántas imágenes contiene, cuántos
   enlaces a `/producto/` y cuántas palabras de texto. Tabla ordenada por alto
   descendente.
2. Calcula para cada sección su **densidad**: píxeles de alto por cada elemento de
   contenido real (producto o dato accionable). Señala las tres peores.
3. Para cada una de las 13 secciones, emite un veredicto entre: **CONSERVAR**,
   **COMPRIMIR** (con el alto objetivo en px y qué recortar exactamente:
   padding, min-height, número de escenas, altura de viewport), o **FUSIONAR con X**.
   Justifica cada veredicto con el número de la medición, no con opinión estética.
4. Propón un **orden nuevo de secciones** para la home, con el criterio explícito de
   por qué cada una va donde va. Debe resolver: qué ve el visitante en la primera
   pantalla, cuándo aparece el primer producto comprable, y dónde va la prueba de
   confianza (garantía, envío, retracto).
5. Calcula el **alto total proyectado** con tus recortes aplicados. Objetivo: entre
   6.000 y 7.500 px. Si tu plan no llega, dilo y explica qué falta.
6. Identifica qué secciones **dependen de que haya catálogo** para funcionar (hoy hay
   1 producto publicado) y cuáles funcionan igual con catálogo vacío. Esto define qué
   se puede arreglar ahora y qué espera a que se carguen productos.
7. Lista los cambios concretos archivo por archivo: ruta, qué clase o valor cambiar,
   valor actual y valor propuesto. Debe ser aplicable sin interpretar.

## Reglas

- Usa grep dirigido; no leas archivos enteros.
- **Si no lo verificaste, escribe NO VERIFICADO.** Un dato inventado invalida la entrega.
- No propongas cambiar la identidad visual (colores, tipografía, acento rojo Tryvex):
  eso ya está decidido. El objetivo es densidad y orden, no rediseño de marca.
- No propongas usar imágenes ni textos de Apple ni de Dune Dragon. Las fotos son
  nuestras; lo que se toma de las referencias es la proporción y el ritmo.

## Cierre

Resumen de máximo 10 líneas: alto actual, alto proyectado, las 3 secciones que más
recortan, y el orden nuevo propuesto en una línea.
