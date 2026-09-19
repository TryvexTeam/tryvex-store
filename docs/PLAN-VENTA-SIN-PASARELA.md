# Plan de venta sin pasarela de pago

**Fecha:** 2026-09-19
**Objetivo:** que Tryvex venda de verdad hoy, cobrando por transferencia, sin esperar a integrar Mercado Pago.
**Criterio:** cada paso se evalúa por cuántas ventas salva, no por lo elegante que sea.

---

## Dónde se pierde una venta con transferencia manual

El flujo manual tiene tres fugas, y conviene nombrarlas antes de proponer nada:

1. **El cliente confirma y no transfiere.** Cierra la página, se distrae, o no tiene la app del banco a mano en ese momento. Nunca vuelve.
2. **Transfiere y usted no se entera.** Hay que revisar la cuenta a mano para saber qué pedido está pagado.
3. **El stock queda reservado por un pedido fantasma.** Cada confirmación descuenta stock; si el pago no llega, esas unidades quedan bloqueadas sin que nadie las libere.

Todo lo que sigue ataca una de esas tres.

---

## Lo que ya está construido

No hay que rehacerlo, conviene saberlo:

- La confirmación muestra **número de pedido, total y los seis datos de la cuenta** (banco, tipo, número, RUT, titular, correo).
- Hay un **botón grande a WhatsApp** con el mensaje del pedido ya escrito: nombre, número, detalle y total.
- El cliente puede **ver sus pedidos** en su cuenta, con el estado.
- El panel permite **marcar pagado** y adjuntar comprobante.
- Cada confirmación **reserva stock** con un movimiento trazable.

---

## Fase 1 — Que el que quiso pagar, pague

Lo más barato y lo que más vende. Todo en la pantalla de confirmación.

### 1.1 Copiar con un toque
Hoy los datos están en una tabla para leer. En un teléfono, copiar un número de cuenta de diez dígitos mirando la pantalla y tecleándolo en la app del banco es la fricción más alta de todo el proceso, y donde se cometen errores caros.

- Botón **copiar** en el número de cuenta, el RUT y el monto.
- Un botón **«Copiar todos los datos»** que deje en el portapapeles un bloque listo para pegar en el chat del banco o en una nota.
- Confirmación visible al copiar («Copiado»), porque sin respuesta el usuario toca dos veces y duda.

### 1.2 El monto exacto, separado y copiable
El total debe poder copiarse solo, sin el signo de pesos ni los puntos: **25000**, no **$25.000**. Es lo que el banco pide. Si el cliente tiene que borrar puntos a mano, se equivoca.

### 1.3 Pedir el número de pedido en el comentario
Instrucción corta y explícita: «Pon **#1042** en el comentario de la transferencia». Es lo que después permite conciliar en treinta segundos en vez de cruzar montos y nombres.

### 1.4 Plazo con consecuencia dicha
«Reservamos tus unidades por **24 horas**.» Da urgencia honesta y explica por qué el pedido puede caerse. Sin plazo, el cliente asume que el producto lo espera indefinidamente.

---

## Fase 2 — Que usted se entere del pago sin revisar la cuenta

### 2.1 Que el cliente adjunte el comprobante
Hoy el comprobante lo sube el equipo desde el panel. Si el cliente puede adjuntarlo desde su pedido:
- Usted ve el comprobante junto al pedido, sin pedirlo por WhatsApp.
- El cliente siente que cumplió su parte y deja de preocuparse.

Pantalla: en la confirmación y en «Mis compras», un botón **«Ya transferí, adjuntar comprobante»**.

### 2.2 Un lugar donde mirar lo que falta
En el panel, una vista de **pedidos esperando pago**, ordenados por antigüedad, con el comprobante si lo hay y el botón de marcar pagado al lado. Es la pantalla que usted abriría tres veces al día.

### 2.3 Aviso al confirmar el pago
Cuando marca un pedido como pagado, que salga un mensaje al cliente por WhatsApp con un toque: «Recibimos tu pago, tu pedido va en camino». Cierra el círculo de confianza.

---

## Fase 3 — Que el stock no se pudra en reservas fantasma

### 3.1 Caducidad de la reserva
Un pedido sin pago a las 24 horas libera sus unidades automáticamente y pasa a estado vencido. Sin esto, con treinta productos y algunas semanas, el catálogo aparece agotado por pedidos que nunca se pagaron.

### 3.2 Aviso antes de vencer
A las 20 horas, un recordatorio por WhatsApp con los datos otra vez. Muchas ventas se recuperan solo con eso: el cliente quería comprar y se le pasó.

---

## Fase 4 — Cuando llegue la pasarela

Nada de lo anterior se tira. La transferencia sigue siendo un medio de pago válido y barato en Chile — muchos compradores la prefieren. Al integrar Mercado Pago:

- El método «transferencia» queda como está.
- Se suma «tarjeta y cuotas» con confirmación automática.
- Las fases 2 y 3 siguen sirviendo para quien elija transferir.

---

## Orden sugerido

| Orden | Qué | Por qué primero |
|---|---|---|
| 1 | Copiar datos y monto con un toque | Es donde se pierde el cliente que ya decidió comprar |
| 2 | Número de pedido en el comentario + plazo | Cuesta una línea de texto y le ahorra la conciliación |
| 3 | Adjuntar comprobante | Convierte WhatsApp en respaldo, no en canal obligatorio |
| 4 | Vista de pedidos esperando pago | Su rutina diaria |
| 5 | Caducidad de reservas | Urgente recién cuando haya catálogo y volumen |
| 6 | Recordatorio antes de vencer | Recupera ventas dormidas |

---

## Lo que falta cargar para que esto funcione

- **WhatsApp de la tienda**: hoy está vacío, y sin él **el botón de la confirmación no se renderiza**. Es el paso más importante del flujo actual y ahora mismo no existe.
- **Tarifa de envío**: hoy la tienda dice «Gratis» porque falta el dato, no porque se haya decidido. Cada venta despachada sale del bolsillo.
