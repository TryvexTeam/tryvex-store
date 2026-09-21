# Integración de Mercado Pago — bitácora de decisiones

**Inicio:** 2026-09-21
**Objetivo:** que Tryvex Store cobre con tarjeta de verdad, en vez de prometerlo.
**Estado:** en curso — aplicación creada, credenciales pendientes.

Este documento registra qué se decidió, **por qué**, y **contra qué fuente se verificó**.
Si una afirmación no tiene fuente, está marcada como no verificada.

---

## El problema que se está resolviendo

La tienda ya ofrecía "Mercado Pago" como forma de pago, pero era solo una etiqueta:

- `app/comprar/acciones.ts` — `METODOS = ['transferencia', 'mercadopago']`. El método se
  guarda en el pedido, pero no ocurre ningún cobro.
- `app/comprar/formulario.tsx` — la opción se le muestra al comprador como
  *"Tarjeta de crédito, débito o cuotas"*.
- El pedido se crea en estado `pendiente` y el flujo real termina en WhatsApp, igual que
  una transferencia.

O sea: **el sitio prometía un cobro con tarjeta que no existía**. Eso es lo que cierra
esta integración.

---

## Decisión 1 — Checkout Pro, no Checkout API

**Elegido:** Checkout Pro.

| | Checkout Pro | Checkout API / Bricks |
|---|---|---|
| Dónde paga el comprador | En Mercado Pago | En nuestro sitio |
| Habilitación de la cuenta | Inmediata con credenciales | Suele requerir aprobación y medición de calidad |
| Estados que debemos manejar | Pocos | 3DS, rechazos por emisor, cuotas, reintentos |
| Tiempo hasta la primera venta | Corto | Bastante mayor |

Razón de fondo: con cero ventas todavía, el camino que **no se bloquea** vale más que el
más elegante.

**Corrección registrada:** en la conversación se dijo primero que Checkout API implicaba
una carga PCI mucho mayor. Eso fue impreciso — con Bricks los datos de tarjeta se
tokenizan contra Mercado Pago y no pasan por nuestro servidor, así que el alcance PCI es
bajo. Las razones válidas para preferir Pro son las tres de la tabla, no la PCI.

**Deuda asumida:** Checkout Pro redirige al comprador fuera del sitio, y eso rompe la
continuidad visual que el resto de la tienda cuidó. Queda por verificar si Checkout Pro
admite apertura en **modal sobre nuestro sitio** (botón Wallet). Si existe, se adopta.
Bricks queda como fase 2, cuando haya ventas que lo justifiquen.

---

## Decisión 2 — Orders API, no Preferences API

Al crear la aplicación, el panel pide elegir entre `API de Orders` y `API de Preferences`.

**Elegido:** API de Orders.

El análisis inicial favorecía Preferences: la URL canónica de Checkout Pro redirige a
`/docs/checkout-pro-preferences/overview`, y su árbol de documentación incluye "Mostrar
valor de envío" y "Configurar la apariencia del botón de pago", que el de Orders no lista.

**Lo que invirtió la decisión:** al seleccionar `API de Preferences`, el propio panel
muestra en rojo:

> Esta API será descontinuada pronto.

Nacer sobre una API que Mercado Pago ya marca como saliente se paga con una migración
completa más adelante. El costo de Orders (menos ejemplos, envío no documentado como
campo propio) es menor y acotado: si hace falta, el envío viaja como una línea más.

**Fuente:** aviso del propio panel de Mercado Pago, pantalla *Crear aplicación*,
2026-09-21.

---

## Aplicación creada

| Dato | Valor |
|---|---|
| Nombre | Tryvex Store |
| ID de aplicación | 5644100493425421 |
| Solución | Checkout Pro |
| Tipo de API | API de Orders |
| Cuenta | NI20250408185936 |
| País | Chile (MLC) |

La creación exigió verificación telefónica (2FA) de la cuenta y la aceptación de los
términos, ambas hechas por el titular.

---

## Manejo de credenciales

Regla: **el Access Token no entra al repositorio ni a esta bitácora.** Solo variables de
entorno. `.gitignore` ya excluye `.env*` y versiona únicamente `.env.example`.

| Variable | Dónde se usa | Secreta |
|---|---|---|
| `MP_ACCESS_TOKEN` | Solo servidor: crear la order y consultar el pago | Sí |
| `MP_WEBHOOK_SECRET` | Solo servidor: validar la firma `x-signature` | Sí |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | Frontend, si se usa el SDK de cliente | No |
| `APP_URL` | URLs de retorno y de webhook | No |

**Fuente:** https://www.mercadopago.cl/developers/es/docs/your-integrations/credentials
— "Access Token: clave privada de la aplicación que siempre se debe utilizar en el
backend. Nunca deberá ser expuesta en un parámetro o del lado público de la integración."

---

## Dominio

El campo *URL del sitio en producción* es **opcional y editable** después, desde
*Editar datos* en el detalle de la aplicación. Las URLs de webhook viven en otra sección
y también se editan cuando se quiera.

**Fuente:** https://www.mercadopago.cl/developers/es/docs/your-integrations/application-details

Plan: partir con el dominio estable de Vercel (`*.vercel.app`, **no** una URL de preview,
que cambia en cada deploy) y cambiarlo al dominio propio cuando exista.

*Pendiente de verificar en el panel real: mostrar el campo efectivamente editable.*

---

## Validación del webhook

Mercado Pago firma cada notificación en el header `x-signature`, con forma
`ts=<timestamp>,v1=<hash>`. Para validarla se arma este manifiesto:

```
id:<data.id de los query params, en minúsculas>;request-id:<header x-request-id>;ts:<ts>;
```

y se calcula `HMAC-SHA256` en hexadecimal, con la clave secreta de la aplicación como
llave, comparando el resultado contra `v1`. Si `data.id` o `x-request-id` no vienen, se
quitan del manifiesto.

**Fuente:** https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks

**Criterio de seguridad propio:** la firma es un filtro, no la fuente de verdad. El estado
de un pedido se decide **volviendo a consultar la order/pago contra la API** con nuestro
Access Token, nunca creyéndole al cuerpo del webhook. Mismo principio que ya rige en
`declararPago()`: el cliente puede avisar, pero no puede declararse pagado.

---

---

## Credenciales de producción — activadas

| Dato | Valor |
|---|---|
| Industria declarada | Electrónicos, audio y video |
| Sitio web declarado | https://www.tryvex.tech |
| Estado | Activas (producción y prueba) |

El sitio declarado es un campo **editable**. Se usó `tryvex.tech` porque es un dominio
propio ya verificado del mismo negocio. Mercado Pago no lo usa para cobrar — las URLs de
retorno viajan en cada order y el webhook se configura aparte — pero sí lo mira si revisa
la cuenta por riesgo, así que conviene que muestre un negocio real.

**Propuesta pendiente de decidir:** publicar la tienda en `tienda.tryvex.tech` en vez de
un dominio `*.vercel.app`, para que lo declarado y lo real coincidan de forma permanente
y el comprador vea un dominio propio al pagar.

---

## Tropiezo resuelto: error 403 al activar credenciales de prueba

Tres intentos de activar las credenciales de prueba fallaron con "Algo salió mal"
(códigos `DXT40-MUBO9O5S`, `DXT40-MUBOCLPU`). El mensaje de pantalla no decía nada útil.
La consola del navegador sí:

```
[CredentialsActivateUser][ERROR] Error activating test user credentials
for userId: undefined for appId: 5644100493425421:
AxiosError: Request failed with status code 403
```

**Causa:** `userId: undefined`. El panel exige reautenticación (2FA) para las secciones
sensibles, y ese token dura **5 minutos** (`exp - iat = 300` en el JWT `rtk` de la URL).
Habíamos explorado el panel demasiado rato antes de pulsar el botón; para cuando lo
hicimos, el contexto de usuario ya no existía.

**Regla operativa que se deriva:** toda acción sensible en el panel de Mercado Pago se
ejecuta **inmediatamente después** de pasar el 2FA, no tras explorar. Si aparece un 403
en el panel, la primera sospecha es token de reautenticación expirado, no un dato mal
ingresado.

Al activar las credenciales de producción justo después de reautenticar, funcionó a la
primera, y el panel mostró **ambas** credenciales activas.

---

## Riesgo evitado: compartir credenciales

Tras activar, el panel abre un modal *"Comparte tus credenciales con otras cuentas de
Mercado Pago"*, con el correo del titular precargado y las credenciales de producción
preseleccionadas. Se cerró sin usar.

Compartir credenciales de producción da a otra cuenta la capacidad de cobrar en nombre
del vendedor, y **no se necesita para esta integración**: la tienda usa el Access Token
directamente desde su propio servidor. No compartir con nadie, por ningún motivo.

---

## Hallazgos de la investigación técnica (Orders API)

Investigado contra la documentación chilena vigente y el código del SDK de Node.

**Crear la order** — `POST https://api.mercadopago.com/v1/orders`, respuesta `201`.
Header `X-Idempotency-Key` **obligatorio** (UUID por intento): sin él, 400
`empty_required_header`; repetido, 409. En el SDK: clase `Order`, método `create`, con
`requestOptions.idempotencyKey`. Si no se pasa, el SDK genera una al vuelo — lo que
**no** deduplica de verdad; hay que derivarla del pedido.

Body para Checkout Pro: `type: "online"`, `processing_mode: "manual"`, `total_amount`
(string), `items[]`, `payer.email`, `external_reference` (≤64), `expiration_time`.
Las URLs de retorno van **dentro de `config.online`**: `success_url`, `failure_url`,
`pending_url`, `auto_return`.

**Redirección** — el campo **no** es `init_point` (eso era Preferences), sino
**`checkout_url`**. No existe modo modal documentado para Orders: solo redirección en la
misma ventana o en pestaña nueva. Eso confirma que la continuidad visual dentro del sitio
solo se logra con Bricks, en una fase posterior.

**Envío** — sin campo documentado en la doc chilena de Orders. El SDK tipa
`shipment.mode: "custom"` + `cost`, pero no está documentado si `cost` entra en
`total_amount`. **Decisión: el envío viaja como un ítem más**, sumado a `total_amount`.
La API valida `total_amount` = Σ(`unit_price` × `quantity`) (`order_items_total_amount_mismatch`),
así que por construcción queda consistente. Envío gratis = simplemente no agregar el ítem.

**CLP** — la moneda sale del país de la cuenta, no se envía. Los montos son **string**.
La referencia chilena dice "entero, sin decimales"; los ejemplos genéricos usan `.00`.
Para CLP se envían enteros como string: `"25000"`.

**Webhook** — topic `orders` (evento "Order (Mercado Pago)" en el panel). El payload trae
`type: "order"` y `data.id`. La doc de estados menciona `orders_v2` sin reconciliarlo con
la tabla de eventos; operativamente se ramifica por `body.type === 'order'`.

**Trampa cara y específica de Orders:** el `data.id` llega en MAYÚSCULAS
(`ORD01JQ4S...`) y **debe pasarse a minúsculas** antes de calcular el HMAC del manifiesto.
Con Preferences los IDs eran numéricos y esto daba igual. Si se omite, la firma no valida
nunca.

**Confirmación de pago** — solo `status === "processed"` con
`status_detail === "accredited"`. Nunca despachar por el query param de la URL de retorno,
que el comprador puede manipular: se confirma con webhook validado **más** una
reconsulta `GET /v1/orders/{id}`.

**Pruebas** — los pagos hechos con credenciales de prueba **no disparan webhooks**. Hay
que usar el simulador del panel o usuarios de prueba con credenciales productivas. El
email del pagador en sandbox debe terminar en `@testuser.com`. El resultado del pago lo
decide el **nombre del titular** de la tarjeta: `APRO` aprueba, `OTHE` rechaza, `FUND`
fondos insuficientes, `SECU` CVV inválido, etc.

---

## Pendientes actualizados

- [x] Crear la aplicación
- [x] Activar credenciales de producción
- [ ] Copiar el Access Token a variables de entorno (lo hace el titular, nunca al repo)
- [ ] Configurar la URL de webhook y guardar la clave secreta de firma
- [ ] Decidir dominio definitivo de la tienda (`tienda.tryvex.tech` propuesto)
- [ ] Implementar creación de order + redirección a `checkout_url`
- [ ] Implementar webhook: validar firma (¡`data.id` en minúsculas!) + reconsultar la order
- [ ] Definir qué pasa con la reserva de stock si el pago se rechaza o expira
- [ ] Compra de prueba end-to-end

---

## Código implementado (2026-09-21)

| Archivo | Qué hace |
|---|---|
| `lib/mercadopago.ts` | Crear la order, consultar su estado, validar la firma del webhook |
| `lib/confirmar-pago.ts` | Dar un pedido por pagado: finanzas + stock + estado, de forma idempotente |
| `app/api/mercadopago/webhook/route.ts` | Recibe los avisos, valida y confirma |
| `app/comprar/acciones.ts` | Si el método es tarjeta, abre la orden y devuelve `checkoutUrl` |
| `app/comprar/formulario.tsx` | Redirige a Mercado Pago en vez de mostrar la confirmación |
| `app/comprar/resultado/page.tsx` | Pantalla de regreso, que lee el estado real de la base |

**Sin SDK.** Se habla con la API por `fetch`. Son tres llamadas, y así `X-Idempotency-Key`
queda bajo nuestro control: el SDK, si no se le pasa una clave, genera una nueva en cada
intento, que es justo lo contrario de lo que evita cobrar dos veces. Además no agrega
dependencias a un proyecto que ya sufrió builds pesados en esta máquina.

### Decisiones de seguridad tomadas en el código

1. **Nada se da por pagado sin reconsultar.** El webhook valida la firma, y aun así vuelve
   a preguntar `GET /v1/orders/{id}`. La firma prueba que el aviso es auténtico, no que el
   dinero esté acreditado.
2. **La URL de retorno no confirma nada.** `app/comprar/resultado` muestra lo que dice la
   base, no el query param — ese lo escribe el navegador del comprador.
3. **Solo `processed` + `accredited`** libera mercadería.
4. **Idempotencia en dos niveles**: se sale temprano si el pedido ya no está `pendiente`, y
   el `UPDATE` final lleva `.eq('estado','pendiente')` para que dos avisos simultáneos no
   dupliquen stock ni ingresos.
5. **Se compara el monto cobrado contra el del pedido.** Si no calza, no se despacha: se
   marca el pedido para revisión humana.
6. **Tolerancia de tiempo en la firma** (10 min), para que una firma válida capturada no
   sirva indefinidamente.
7. **Si falla abrir el pago, el pedido no se pierde**: queda tomado y el comprador puede
   pagar por transferencia. Perder la venta sería peor.

### Veredicto de verificación

- `npx tsc --noEmit` → sin errores
- `npx next build` → compila; la ruta `ƒ /api/mercadopago/webhook` aparece registrada

Falta la verificación que importa: una compra real de prueba. No se puede hacer hasta
cargar el Access Token y configurar los webhooks.
