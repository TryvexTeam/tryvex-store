# Checklist de lanzamiento — Tryvex Store

Fecha de revisión de código: 2026-09-21.

Esta lista distingue lo verificado en el repositorio de tareas que requieren acceso a
Vercel, Supabase, Mercado Pago y datos comerciales. No sustituye una compra real.

## Verificado en el repositorio

- [x] `.env*` está ignorado; solo `.env.example` se versiona.
- [x] `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` no usan prefijo
  `NEXT_PUBLIC_` y se usan únicamente desde servidor.
- [x] `/panel/:path*` usa `proxy.ts`, la convención de Next.js 16. Refresca cookies y usa
  `supabase.auth.getUser()`; páginas, acciones y RLS vuelven a validar acceso del equipo.
- [x] El callback de Auth limita `next` a rutas internas y evita redirecciones abiertas.
- [x] Las acciones del panel exigen integrante activo; permisos y RLS, no solo la interfaz,
  limitan las operaciones administrativas.
- [x] El webhook de Mercado Pago valida firma, consulta la orden contra la API y solo acredita
  `processed/accredited`.
- [x] El feed solo publica productos publicados y variantes activas, no expone costos ni stock
  exacto, exige token y no permite caché pública. Los enlaces usan la ficha y los precios usan
  el tramo de una unidad; sin token o dominio canónico falla cerrado con `503`.
- [x] `next.config.ts` define `nosniff`, anti-encuadre, HSTS, política de referencias y permisos
  mínimos.

## Producción: configuración externa

- [ ] Definir `NEXT_PUBLIC_URL_TIENDA` como dominio canónico final con `https://`, sin rutas ni
  parámetros. No usar una URL efímera de Preview.
- [ ] Cargar en Vercel para **Production** las variables Supabase y las variables aplicables de
  Mercado Pago/feed. Nunca incluir secretos en commits, tickets ni capturas.
- [ ] Configurar URL del sitio y Redirect URLs de Supabase Auth para dominio final y URL estable
  de Vercel. Probar magic link, invitación, callback y cierre de sesión.
- [ ] Confirmar proyecto de producción, migraciones, RLS y buckets `productos`/`vouchers` en
  Supabase.
- [ ] En Ajustes, revisar con doble control: WhatsApp, correo, cuenta bancaria, tarifa, umbral
  de envío gratis, plazo, retiro y textos reales de garantía, retracto y envío.
- [ ] Publicar solo productos con SKU, slug, categoría, foto, precio, stock y condiciones
  correctas. Revisar variantes, GTIN y peso antes de exportarlos al feed.
- [ ] Revisar requisitos legales y comerciales locales antes de prometer plazos, cobertura,
  retracto o garantía.

## Mercado Pago — responsable de pagos

No modificar el flujo sin coordinación con el integrante responsable.

- [ ] Cargar credenciales de producción `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET`.
- [ ] Configurar `https://DOMINIO/api/mercadopago/webhook` en Mercado Pago para avisos de órdenes.
- [ ] Hacer una compra punta a punta: pedido, redirección, pago, aviso firmado, consulta a API,
  acreditación única, stock, panel y cuenta del cliente.
- [ ] Reintentar el mismo aviso: no debe duplicar pago, movimiento ni descuento de stock.
- [ ] Probar pago pendiente, rechazado y retorno del navegador sin acreditar mediante parámetros.
- [ ] Revisar logs de Vercel: no deben contener tokens ni datos de pago.

## Feed Google / Meta — responsable de catálogo

- [ ] Generar un `FEED_TOKEN` aleatorio y largo; guardar la URL con token solo en el integrador.
- [ ] Probar el feed con token (`200`), sin token/incorrecto (`401`) y sin configuración (`503`).
- [ ] Validar muestra: SKU, enlace HTTPS de ficha, imagen accesible, CLP, oferta y disponibilidad
  de cada variante.
- [ ] Registrar el feed con la URL tokenizada en Google/Meta y resolver sus diagnósticos.
- [ ] Rotar el token si se filtra; actualizar el integrador y Vercel de forma coordinada.

## Prueba de aceptación

- [ ] Visitante: catálogo, búsqueda, ficha, variantes, agotados, bolsa y total de envío.
- [ ] Cliente: cuenta, favoritos, perfil, historial de pedidos y salida.
- [ ] Equipo sin permisos: no puede entrar al panel ni invocar acciones administrativas.
- [ ] Equipo autorizado: productos, imágenes, stock, pedidos, despacho, finanzas y comprobantes.
- [ ] Comprar por transferencia y por Mercado Pago cuando éste esté configurado.
- [ ] Probar móvil/escritorio, contacto, retiro, políticas, 404 y enlaces externos.
- [ ] Ejecutar `npm run build` y `git diff --check` con el árbol final.

## Operación y reversión

- [ ] Habilitar alertas de Vercel y definir responsable de pedidos/pagos fallidos.
- [ ] Documentar redeploy del último despliegue sano; no revertir migraciones con pedidos o pagos
  sin un plan de datos.
- [ ] Tras la primera venta, conciliar orden de Mercado Pago, pedido, stock y movimiento
  financiero.

## Unidad de commit recomendada

Incluir juntos: eliminación de `middleware.ts`, creación de `proxy.ts`, endurecimiento de
`app/api/feed/productos/route.ts`, README, este checklist y la normalización de
`package-lock.json` para que coincida con `package.json`. Excluir `.env.local`, secretos,
URLs con token y cambios ajenos.
