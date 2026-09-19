# Dune Dragon — perfil medido

**URL:** https://dunedragon.cl/
**Fecha de medición:** 2026-09-17
**Método:** Chrome MCP, `getComputedStyle()` sobre el sitio en vivo. Todo valor de abajo es medido, no estimado.

## Plataforma

| Qué | Valor |
|---|---|
| CMS | Shopify (tema Horizon; clases `image-block`, `card__inner`, `layout-panel-flex`) |
| GSAP | no |
| Swiper | no |
| Lenis / Locomotive | no |
| Motion / Alpine | no |

**Lectura:** cero librerías de animación. Todo el movimiento que exista es CSS nativo del tema. No hay scroll suave: el scroll es el nativo del navegador.

## Tipografía

Familia única: **Geist, sans-serif** (sin pareja tipográfica; una sola familia para todo).

| Rol | Medida |
|---|---|
| Base / body | 14px / 22.4px, w400 (ratio de interlineado 1.6) |
| H1 | 72px / 72px, w400, letter-spacing normal |
| Etiquetas | 12px / 13.2px, w500, letter-spacing 0.36px |
| Párrafo alterno | 16px / 19.2px, w400 |
| Destacado | 16px / 24px, w600 |
| H3 tarjeta | 13px / 16.9px, w400 |

**Observación:** el H1 usa peso 400 a 72 px. El contraste de jerarquía lo consigue por tamaño, no por peso. Base de 14 px es chica para lectura de cuerpo.

## Color

| Rol | Valor |
|---|---|
| Fondo body | `rgb(255, 255, 255)` |
| Texto body | `rgba(3, 3, 2, 0.76)` |

**Detalle fino que vale copiar:** el texto no es negro puro. Es un casi-negro cálido (3,3,2) a **76% de opacidad**. Eso baja el contraste duro y es parte de por qué el sitio se siente suave.

**Custom properties en `:root`: 0.** No hay sistema de tokens CSS expuesto. Los valores viven en clases del tema.

## Header

| Propiedad | Scroll 0 | Scroll 800 |
|---|---|---|
| position | sticky | sticky |
| background | `rgba(0,0,0,0)` | `rgba(0,0,0,0)` |
| height | 0px | 0px |
| box-shadow | none | none |
| backdrop-filter | none | none |
| transform | none | none |
| z-index | 8 | 8 |

**Propiedades que cambian al scrollear: ninguna.** El header es transparente y fijo, idéntico siempre.

**Consecuencia observada:** sobre el hero de arena clara, la navegación en blanco queda ilegible. Es un defecto de contraste real, no una opinión.

## Tarjetas de producto

| Propiedad | Valor |
|---|---|
| transition declarada | `all` |
| transform en hover | none |
| scale en hover | none |
| box-shadow en hover | none |
| filter en hover | none |
| opacity en hover | 1 |

**Hover muerto.** Declara `transition: all` y no cambia ninguna propiedad. Las tarjetas no responden al cursor.

## Grilla (a 1920 px)

- `grid-template-columns`: 6 columnas de 290px
- `gap`: 20px
- padding del body: 0px
- desborde horizontal: 0

## Estructura y peso

- Imágenes: se inventarían en la pasada de assets
- Videos: 0 detectados en home
- Plataforma de ecommerce completa (carrito, búsqueda predictiva con `search-modal`, filtros de colección, variantes de color por producto)

## Comportamientos registrados

1. **Modal de oferta al entrar.** Aparece sobre el hero al cargar la home. Interrumpe antes de que el visitante vea el producto.
2. **Búsqueda predictiva.** `dialog-component#search-modal` con botón "Cerrar diálogo", limpieza de resultados y búsqueda incremental.
3. **Etiquetas de estado en grilla.** "AGOTADO" y "OFERTA" como badges sobre la imagen.
4. **Precio comparativo.** Precio vigente + precio anterior tachado, en la tarjeta.
5. **Variantes de color visibles en la grilla.** Puntos de color bajo el precio, sin entrar a la ficha.

## Pendiente de medir

- Responsive real a 390 y 768 px: el resize de ventana no cambió el viewport (siguió en 1920). Requiere Playwright con viewport controlado.
- Inventario y peso de assets.
- Ficha de producto y checkout.
