# Apple Store CL — perfil medido

**URL:** https://www.apple.com/cl/store
**Fecha de medición:** 2026-09-17
**Método:** Chrome MCP, `getComputedStyle()` sobre el sitio en vivo. Todo valor es medido.

## Tipografía

Familia: `"SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif`

| Rol | Medida |
|---|---|
| Base / body | **17px / 25px** (ratio 1.47) |
| H1 | **80px / 84px**, w600, **letter-spacing −1.2px** |
| Título de sección | 28px / 32px, w600, ls +0.196px |
| Título de tarjeta | 24px / 28px, w600, ls +0.216px |
| Subtítulo / destacado | 17px / 21px, w600, ls −0.374px |
| Texto de apoyo | 14px / 18px, w400, ls −0.224px |
| Etiqueta / legal | 12px / 16px, w400 o w600, ls −0.12px |

**El detalle que marca la diferencia: tracking óptico.** El letter-spacing no es fijo. Es **negativo y proporcional al tamaño** en los tamaños grandes (−1.2px a 80px, −0.374px a 17px, −0.224px a 14px) y se vuelve **positivo** en el rango medio de títulos (+0.196px a 28px, +0.216px a 24px).

Eso es un sistema, no un valor. Dune Dragon usa `letter-spacing: normal` en todo.

## Color

| Rol | Valor |
|---|---|
| Fondo body | `rgb(245, 245, 247)` |
| Texto body | `rgb(29, 29, 31)` |

**Ni blanco puro ni negro puro.** El fondo es un gris apenas frío y el texto un casi-negro. Las tarjetas en blanco puro sobre ese fondo generan la separación por capas sin necesidad de bordes ni sombras fuertes.

**Custom properties en `:root`: 69.** Sistema de tokens real y expuesto (`--r-globalnav-*` y familia).

## Navegación

| Propiedad | Scroll 0 | Scroll 1200 |
|---|---|---|
| position | **absolute** | absolute |
| top | 0px | 0px |
| height | 44px | 44px |
| background | `rgba(0,0,0,0)` | `rgba(0,0,0,0)` |
| backdrop-filter | none | none |
| box-shadow | none | none |

**Propiedades que cambian al scrollear: ninguna.** Y no es sticky: es `absolute`, así que se va con el scroll y no reaparece.

Corrige una creencia común (la tuve yo al empezar): en esta página la barra de Apple **no** hace el truco de encogerse ni ponerse translúcida. Esa mecánica vive en otras páginas de apple.com, no en la Store.

## Carruseles — la mecánica que sí vale copiar

4 contenedores `rf-cards-scroller-content`:

| Propiedad | Valor |
|---|---|
| `scroll-snap-type` | **`x mandatory`** |
| `scroll-behavior` | auto |
| overflow-x | scroll / auto |
| ancho de contenido vs visible | 6140 / 1905, 3764 / 1905, 2260 / 1905, 2258 / 1905 |

Fila horizontal con encaje obligatorio en el eje X, botón de flecha para avanzar, y el contenido excediendo hasta 3× el ancho visible. Es CSS nativo — sin librería de carrusel.

## Estructura de la página

Orden de arriba a abajo:

1. Barra de navegación global (44px, absolute)
2. Título de la tienda + enlace de contacto con especialistas, a la derecha
3. **Fila de categorías con iconos** — 10 accesos (Mac, iPhone, iPad, Watch, AirPods, AirTag, TV, HomePod, Accesorios, Gift Card), icono sobre etiqueta
4. Franja "lo último" — carrusel de tarjetas de producto con etiqueta de estado, título, descripción corta y precio con cuota
5. Franja de accesorios — carrusel con selector de color por punto y precio
6. Franja de ayuda y servicios — tarjetas de soporte y asesoría
7. Asistente flotante abajo a la derecha

## Patrones de tarjeta de producto

- **Etiqueta de estado sobre el título** en mayúscula pequeña y color de acento (preventa, novedad, fecha de disponibilidad)
- **Precio con financiamiento en la misma línea**: precio contado + cuota mensual, con nota al pie numerada
- **Puntos de color** para variantes, visibles en la tarjeta sin entrar a la ficha
- **Tarjetas de fondo alterno**: blancas y negras intercaladas en la misma fila, según el producto
- Imagen del producto centrada sobre fondo plano, sin sombra ni escenario

## Pendiente de medir

- Responsive real a 390 y 768 px (requiere Playwright con viewport controlado)
- Hover de tarjetas y botones de flecha
- Ficha de producto y flujo de compra
