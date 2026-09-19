# T-005 — Auditoría del flujo de compra de Tryvex

Esta tarea se completa ÚNICAMENTE escribiendo el archivo de salida con tus herramientas.

**NO EDITES CÓDIGO FUENTE.** El repositorio no tiene git: un cambio tuyo no se puede
revertir. Tu entregable es un informe. Editar `.tsx` o `.css` invalida la entrega.

**NO COMPLETES NINGUNA COMPRA REAL NI ENVÍES FORMULARIOS DE PEDIDO.** Puedes recorrer el
flujo y llenar campos, pero NO pulses el botón que confirma el pedido: crearía un pedido y
reservaría stock en la base real. Si llegas a ese punto, detente y repórtalo.

## ENTREGABLE ÚNICO
`C:\Users\w10\Documents\GitHub\airpods-pro-3-apple-cl\workspace\out\T-005-flujo-compra.md`

## Contexto
Dev server en http://localhost:3100. No lo levantes. Hay 1 producto publicado; obtén su slug
desde la grilla de `/tienda`. El checkout `/comprar` tiene 4 pasos. La bolsa vive en
localStorage. Usa Playwright con viewport real; audita a 390 y 1440 px.

## Puntos (contrato auditable)
1. Recorre ficha de producto → agregar a la bolsa → abrir la bolsa → ir a `/comprar`.
   Documenta cada pantalla: qué se ve, qué se pide, cuántos clics/toques toma avanzar.
2. En la ficha: verifica que el precio, el stock y las variantes (si las hay) son coherentes
   con lo que muestra la grilla de `/tienda`. Reporta cualquier diferencia de cifra.
3. Al agregar a la bolsa: reporta el aviso de confirmación (qué dice, cuánto dura, si se puede
   deshacer) y si el contador de la cabecera se actualiza.
4. En la bolsa: cambia cantidades y quita productos. Verifica que el subtotal recalcula bien.
   Reporta el comportamiento con cantidad 0 y con la cantidad máxima disponible.
5. En `/comprar`: recorre los 4 pasos SIN confirmar. Reporta por cada paso qué datos pide,
   qué validaciones aparecen al dejar campos vacíos o inválidos, y si se puede retroceder sin
   perder lo escrito.
6. **Costo total antes de pagar:** reporta si en algún punto se muestra el costo de envío y el
   total final antes de pedir datos de pago. Si el envío aparece en $0 o vacío, dilo explícito.
7. Reporta todo punto del flujo donde el usuario podría quedarse sin saber qué hacer: botón sin
   estado de carga, error sin mensaje, paso sin indicación de progreso.
8. A 390 px: verifica que ningún botón del flujo queda fuera de pantalla o tapado.

## Reglas
- Grep dirigido, no leas archivos enteros.
- **Si no lo verificaste, escribe NO VERIFICADO.** Un dato inventado invalida la entrega.
- Datos de prueba ficticios en los formularios. Nunca datos personales ni bancarios reales.

## Cierre
Máximo 10 líneas: cuántos pasos tiene el flujo, dónde se pierde el usuario, y los 3 problemas
más graves por severidad.
