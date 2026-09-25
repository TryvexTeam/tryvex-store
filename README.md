# Tryvex Store

Tienda en línea y panel de administración de Tryvex, construidos sobre Next.js y Supabase.

La tienda vende varias familias de productos con precios por tramo de cantidad: el precio
por unidad baja al comprar más. El cobro todavía no pasa por una pasarela de pago; el
cliente hace una transferencia y declara el pago desde el sitio, y el equipo la confirma
en el panel.

El panel está pensado como aplicación móvil. No es un escritorio que además funciona en el
teléfono: el teléfono es el caso principal, y por eso los controles tienen objetivos
táctiles de 44 px y la navegación vive al alcance del pulgar.

## Cómo está organizado el repositorio

La aplicación vive en la raíz, que es donde Vercel la busca por omisión.

```
app/                Rutas (App Router)
├── tienda/         Catálogo, filtros y orden
├── producto/       Ficha de producto
├── comprar/        Checkout y declaración de transferencia
├── panel/          Administración: productos, pedidos, finanzas, portada
└── api/feed/       Feed de productos para servicios externos
components/         Componentes compartidos
lib/                Acceso a datos y lógica de negocio
public/             Imágenes de la tienda
supabase/           Migraciones
docs/               Investigación de referencias de diseño
```

## Desarrollo local

Hace falta Node 20 o superior.

```bash
npm install
cp .env.example .env.local   # y completar los valores
npm run dev
```

La tienda queda en `http://localhost:3000` y el panel en `/panel`.

## Variables de entorno

| Variable | Obligatoria | Para qué sirve |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Dirección del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí | Clave pública. Viaja al navegador; las políticas RLS son las que protegen los datos |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | **Solo servidor.** El checkout la necesita porque crear un pedido escribe en una tabla cuyas políticas son solo para el equipo |
| `NEXT_PUBLIC_URL_TIENDA` | Sí en producción | Dirección pública canónica de la tienda, usada en enlaces de Mercado Pago y en el feed de productos. Debe ser una URL `https://` real, sin rutas ni parámetros. |
| `FEED_TOKEN` | Sí si se habilita el feed | Secreto largo para `/api/feed/productos?token=…`. El feed responde 503 mientras no esté definido, para no exponer catálogo y disponibilidad por accidente. |
| `MP_ACCESS_TOKEN` | Sí si se ofrece Mercado Pago | Credencial privada del servidor para crear y consultar órdenes. |
| `MP_WEBHOOK_SECRET` | Sí si se ofrece Mercado Pago | Secreto privado para validar avisos firmados del webhook. Sin él, el webhook responde 503 y no acredita pagos. |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | No | Solo es necesaria si se incorpora el SDK de Mercado Pago al navegador. |

`SUPABASE_SERVICE_ROLE_KEY` salta todas las políticas RLS y da acceso completo a la base de
datos. Nunca debe llevar el prefijo `NEXT_PUBLIC_`: ese prefijo hace que Next la empaquete
en el JavaScript que se envía al navegador, y quedaría a la vista de cualquier visitante.

## Despliegue en Vercel

El proyecto se despliega sin configuración especial: **Root Directory en `./`** y
**Framework Preset en Next.js**, que es lo que Vercel detecta solo al haber un
`package.json` con `next` en la raíz.

Cargue en Vercel las variables aplicables de la tabla anterior: Supabase en Production y
Preview; Mercado Pago y feed solo cuando esos servicios se habiliten. Use el dominio final
para `NEXT_PUBLIC_URL_TIENDA`, no una URL temporal de Preview.

Después del primer despliegue, en Supabase → Authentication → URL Configuration, agregar la
dirección de Vercel a **Redirect URLs**. Sin eso, el acceso al panel rebota al intentar
entrar.

La lista verificable de código y los pasos que requieren acceso a Vercel, Supabase, Mercado
Pago o datos comerciales están en [`docs/CHECKLIST-LANZAMIENTO.md`](docs/CHECKLIST-LANZAMIENTO.md).

## Antes de la primera venta real

En el panel, sección Ajustes, hay que cargar:

- **El número de WhatsApp.** Sin él, el botón de confirmación del pedido no se dibuja y el
  cliente se queda sin forma de avisar que transfirió.
- **`envio_tarifa_clp`.** Mientras esté vacío, la tienda muestra el envío como «Gratis» por
  omisión, y eso es una promesa al cliente.
