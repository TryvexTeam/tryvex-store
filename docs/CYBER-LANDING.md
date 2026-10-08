# Landing /cyber y Meta Pixel

Página de campaña en `https://store.tryvex.tech/cyber`, pensada para tráfico de
Meta Ads, Instagram, TikTok y WhatsApp. Usa el catálogo real (precios, fotos y
stock) y el mismo diseño de la tienda. Este documento explica cómo operarla.

## Archivos

| Archivo | Qué es |
|---|---|
| `lib/cyber.ts` | **Lo editable**: modo, textos, productos, packs, categorías y mensajes de WhatsApp. |
| `lib/cyber-productos.ts` | Arma «Top ofertas» desde el catálogo y calcula «precios por cantidad desde N unidades». |
| `app/cyber/page.tsx` | La página: datos, metadata SEO y orden de las secciones. |
| `app/cyber/secciones.tsx` | Las secciones (servidor). |
| `app/cyber/rastreo.tsx` | Botones que miden, barra fija del teléfono y WhatsApp flotante. |
| `lib/meta-pixel.ts` | La única puerta al pixel: `rastrear()` (estándar) y `rastrearPropio()` (propios). |
| `lib/atribucion.ts` | Guarda UTMs y `fbclid` de la llegada, por sesión. |
| `components/meta-pixel.tsx` | `PageView` en cada página (montado en `app/layout.tsx`). |
| `components/medir.tsx` | Dispara un evento al mostrarse (ficha, landing, compra confirmada). |

## Cambiar de «live» a «extended»

En `lib/cyber.ts`:

```ts
export const CYBER_MODE: ModoCyber = 'extended' // o 'live'
```

- `live`: «Cyber Tryvex», «Cyber activo», «ofertas por tiempo limitado».
- `extended`: «Cyber extendido Tryvex», «últimas ofertas», «stock sujeto a disponibilidad».

Los textos de cada modo están en el objeto `COPY` del mismo archivo.

## Cambiar los productos destacados

Editar `CYBER_SLUGS` en `lib/cyber.ts`. El slug es lo que va después de
`/producto/` en la URL. Reglas automáticas:

- Un slug que no existe, está **agotado**, no tiene foto o cuesta menos de
  $1.000 (precio de prueba) **se omite solo**.
- Si quedan menos de 4, se completa con productos disponibles que tengan
  rebaja real (precio anterior mayor), de mayor a menor descuento.
- Precio, precio anterior, % y foto salen siempre del catálogo (Panel → Productos).

Productos incluidos al 8 de octubre de 2026: Audífonos Pro 3, Reloj Ultra 3
49 mm, Reloj Serie 11 46 mm, Audífono Max, Powerbank IRM 20.000 mAh, Proyector
4K Android, Cargador 120W + cable USB-C y Parlante Bluetooth 40W.
**«Audífonos Pro 2» no existe en el catálogo** y no se incluyó.

## WhatsApp

Los botones de WhatsApp usan el número de **Panel → Ajustes → WhatsApp**
(`configuracion_tienda.whatsapp`), igual que el resto de la tienda. Los
mensajes precargados están en `MENSAJES_WHATSAPP` (`lib/cyber.ts`):

- Stock: «Hola Tryvex, vengo de la landing Cyber y quiero consultar stock.»
- Mayorista: «Hola Tryvex, quiero la lista mayorista Cyber.»

> **Importante:** si el número no está configurado, los botones llevan a
> `/contacto` en vez de quedar rotos. Al 8 de octubre de 2026 el campo está
> vacío en la base: hay que cargarlo antes de lanzar la campaña de WhatsApp.

## Meta Pixel

- ID: `1797120077973891`, en `lib/meta-pixel.ts`. `NEXT_PUBLIC_META_PIXEL_ID`
  lo reemplaza y `off` lo apaga.
- Solo dispara en el dominio de la tienda. Las vistas previas de Vercel y
  `localhost` no mandan eventos (no ensucian audiencias). Para probar en local:
  `NEXT_PUBLIC_META_PIXEL_FORZAR=1`.
- El script se carga en segundo plano y a pedido: no frena la página. Si Meta
  no carga (bloqueador de anuncios), nada se rompe.
- Las UTMs (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`,
  `utm_term`) y `fbclid` de la llegada viajan en cada evento de la sesión.
- `content_ids` es el **SKU**, el mismo `id` del feed de catálogo
  (`/api/feed/productos`), para que Meta conecte eventos y catálogo.

UTMs sugeridas para los anuncios:

```
utm_source=meta&utm_medium=paid&utm_campaign=cyber_tryvex&utm_content={{ad.name}}&utm_term={{adset.name}}
```

### Eventos estándar (toda la tienda)

| Evento | Cuándo | Parámetros |
|---|---|---|
| `PageView` | Cada página (también al navegar sin recargar) | UTMs |
| `ViewContent` | Entrar a /cyber | `content_name: Cyber Tryvex Landing`, `content_category: Cyber`, `currency` |
| `ViewContent` | Ficha de producto | `content_ids`, `content_name`, `content_type: product`, `content_category`, `value`, `currency` |
| `AddToCart` | Agregar a la bolsa desde cualquier parte | `content_ids`, `content_name`, `content_type`, `value`, `currency`, `num_items` |
| `InitiateCheckout` | Llegar a /comprar con el pedido cotizado | `content_ids`, `content_type`, `value`, `currency`, `num_items` |
| `Purchase` | Solo con el pago **confirmado en la base** (`/comprar/resultado`) | `value`, `currency`, `content_ids`, `num_items`, `order_id`; `eventID = pedido-<número>`; una sola vez por pedido |
| `Lead` | Clics a WhatsApp mayorista | `content_name` = botón |
| `Contact` | Clics a WhatsApp de consulta | `content_name` = botón |

### Eventos propios (/cyber)

`CyberHeroCTA_Click`, `CyberWholesaleCTA_Click`, `CyberWholesaleLead_Click`,
`CyberProduct_Click`, `CyberAllOffers_Click`, `CyberIntent_Detail_Click`,
`CyberIntent_Gift_Click`, `CyberIntent_Wholesale_Click`, `CyberPack_Click`,
`CyberResell_Click`, `CyberCategory_Click` (`category_name`),
`CyberHowToBuyCTA_Click`, `CyberFinalCTA_Click`, `CyberBarCTA_Click`,
`CyberStickyOffers_Click`, `CyberStickyWhatsapp_Click`,
`CyberFloatingWhatsapp_Click`.

## Qué falta para Conversions API (no implementado)

Recomendación: **implementar Conversions API con deduplicación para Purchase,
AddToCart, InitiateCheckout y Lead.**

1. Token de acceso de Conversions API (Administrador de eventos → Configuración), solo servidor.
2. `Purchase` desde el servidor en `lib/confirmar-pago.ts` (`confirmarPagoDePedido`),
   que ya usan el webhook de Mercado Pago y la conciliación. Mismo
   `event_id = pedido-<número>` que el navegador, para que Meta no cuente dos veces.
3. Las compras por **transferencia** hoy no disparan `Purchase` en el navegador
   (el comprador no vuelve a la página cuando se confirma el pago): CAPI las cubre.
4. Para AddToCart, InitiateCheckout y Lead: generar el `eventID` en el navegador
   (`rastrear(evento, params, eventID)` ya lo acepta) y mandarlo también al servidor.

## SEO

Título «Cyber Tryvex | Tecnología para comprar, regalar o revender», descripción
propia, canonical `/cyber`, Open Graph y Twitter Card con la imagen de la
tienda, `index, follow`, y entrada en `/sitemap.xml`.
