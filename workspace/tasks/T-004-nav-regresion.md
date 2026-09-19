# T-004 — Regresión del nav y el megamenú de Tryvex

Esta tarea se completa ÚNICAMENTE escribiendo el archivo de salida con tus herramientas.

**NO EDITES CÓDIGO FUENTE.** El repositorio no tiene git: un cambio tuyo no se puede
revertir. Tu entregable es un informe. Editar `.tsx` o `.css` invalida la entrega.

## ENTREGABLE ÚNICO
`C:\Users\w10\Documents\GitHub\airpods-pro-3-apple-cl\workspace\out\T-004-nav.md`

## Contexto
La cabecera (`components/tienda/cabecera.tsx`) y el megamenú (`components/tienda/megamenu.tsx`)
se acaban de reestructurar hoy: la marca pasó al extremo izquierdo, los ítems se distribuyen
con `space-between` desde el breakpoint `n:`, cada ítem tomó `padding 0 8px`, y los enlaces
primarios del megamenú subieron a 24px. Hay que verificar que no se rompió nada.
Dev server corriendo en http://localhost:3100. No lo levantes. Usa Playwright con viewport real.

## Puntos (contrato auditable)
1. A 390, 768 y 1440 px: captura la cabecera y reporta si la marca, los ítems y los tres
   controles de la derecha (buscar, cuenta, bolsa) se solapan, se cortan o desbordan.
   Reporta el ancho ocupado por cada grupo y el espacio libre entre ellos.
2. A 390 px, verifica que el botón de menú (hamburguesa) abre y cierra el panel móvil, y que
   la marca sigue centrada. Reporta el alto de la cabecera en cada ancho.
3. Abre el megamenú de "Tienda" por hover Y por teclado (Tab hasta el ítem, luego Enter o
   flecha abajo). Reporta qué método funciona y cuál no.
4. Con el megamenú abierto: verifica que Escape lo cierra y que el foco vuelve al ítem que lo
   abrió. Reporta el elemento que recibe el foco tras cerrar.
5. Verifica la trampa de foco: recorre con Tab dentro del megamenú abierto y reporta si el foco
   escapa a elementos de la página de atrás mientras está abierto.
6. Reporta los tamaños de fuente presentes dentro del megamenú y si la jerarquía se lee:
   ¿el enlace primario domina sobre el secundario?
7. Verifica el menú "Servicio al cliente": abre, cierra, y no queda abierto al mover el cursor.

## Reglas
- Grep dirigido, no leas archivos enteros.
- **Si no lo verificaste, escribe NO VERIFICADO.** Un dato inventado invalida la entrega.

## Cierre
Máximo 10 líneas: qué funciona, qué se rompió, y los 3 problemas más graves por severidad.
