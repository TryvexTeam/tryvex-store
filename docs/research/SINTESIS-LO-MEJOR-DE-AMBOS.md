# Lo mejor de los dos mundos — qué aplicar a Tryvex Store

**Fecha:** 2026-09-17
**Fuentes medidas:** `apple-cl-store/store/PERFIL.md`, `dunedragon-cl/home/PERFIL.md`, y Tryvex en `localhost:3100` con el mismo script.
**Regla:** todo lo de abajo es valor medido con `getComputedStyle()`, no impresión visual.

## La tabla que importa

| | Apple Store CL | Dune Dragon | **Tryvex hoy** |
|---|---|---|---|
| Familia | SF Pro Text | Geist | Geist |
| Base | 17px / 25px | 14px / 22.4px | 16px / 24px |
| H1 | 80/84, w600, ls −1.2px | 72/72, w400, ls normal | 80/81.6, w600, **ls −3.6px** |
| Color de texto | `rgb(29,29,31)` | `rgba(3,3,2,0.76)` | `rgb(29,29,31)` |
| Fondo | `rgb(245,245,247)` | `#fff` | `#fff` |
| Tokens en `:root` | 69 | **0** | **85** |
| Carruseles con snap | 4 (`x mandatory`) | 0 | 1 (`x mandatory`) |
| Hover en tarjetas | por medir | **muerto** | por medir |
| Librerías de animación | ninguna | ninguna | ninguna |

**Conclusión incómoda para la premisa de partida:** Tryvex ya está estructuralmente por delante de Dune Dragon en casi todo lo medible. Más tokens que Apple, el mismo color de texto que Apple, H1 del mismo tamaño con tracking negativo, carrusel con encaje. Dune Dragon gana en percepción, no en sistema.

## 1. Lo que hay que corregir en Tryvex (hallazgo propio, no copiado)

### El tracking está sobre-apretado y es ciego al tamaño

Nuestros valores: −3.6px a 80px, −4.32px a 96px, −2.16px a 72px. Eso es un **−0.045em fijo** aplicado a todo.

Apple usa −1.2px a 80px (**−0.015em**), y —esto es lo fino— **cambia de signo** en el rango medio: +0.196px a 28px, +0.216px a 24px.

Somos **3× más apretados que Apple** en display. A 96px con −4.32px las letras se tocan.

**Acción:** escala de tracking por tramo, no un ratio único.

| Tamaño | Tracking sugerido |
|---|---|
| 96px | −0.02em (≈ −1.9px) |
| 80px | −0.015em (≈ −1.2px) |
| 72px | −0.015em (≈ −1.1px) |
| 28px | +0.007em (≈ +0.2px) |
| 24px | +0.009em (≈ +0.2px) |
| 17px | −0.022em (≈ −0.37px) |
| 14px | −0.016em (≈ −0.22px) |

### Base de 16px contra 17px

Apple usa 17/25. Nosotros 16/24. Un punto parece nada; en párrafos largos es la diferencia entre "web" y "producto Apple". Barato de cambiar, y nuestro `--canal` ya está resuelto.

### Fondo blanco puro

Apple no usa blanco de fondo: usa `rgb(245,245,247)` con tarjetas blancas encima. Esa es la razón de que sus tarjetas floten sin sombra. Nosotros ponemos blanco sobre blanco y necesitamos bordes para separar.

**Acción:** fondo de página a gris 245-247, tarjetas en blanco puro. Elimina bordes y gana profundidad gratis.

## 2. Lo que vale tomar de Apple

| Patrón | Medida | Por qué |
|---|---|---|
| **Carruseles `scroll-snap-type: x mandatory`** | 4 filas, contenido hasta 3× el ancho visible | CSS nativo, cero librería. Ya tenemos uno: faltan las filas de categoría y accesorios |
| **Fila de categorías con iconos** | 10 accesos, icono sobre etiqueta, arriba de todo | Resuelve navegación de catálogo sin menú. Con 30 audífonos y accesorios, nos sirve |
| **Precio con cuota en la tarjeta** | precio contado + mensual, nota al pie numerada | En Chile, la cuota vende. Hoy mostramos solo el precio |
| **Tarjetas de fondo alterno** | blancas y negras en la misma fila | Rompe la monotonía de grilla sin romper la grilla |
| **Tracking óptico por tamaño** | ver tabla arriba | El detalle que separa "bien hecho" de "Apple" |
| **Sistema de tokens expuesto** | 69 custom properties | Ya lo tenemos y mejor: 85 |

## 3. Lo que vale tomar de Dune Dragon

| Patrón | Por qué |
|---|---|
| **Texto a 76% de opacidad** | `rgba(3,3,2,0.76)` en vez de negro pleno. Baja la dureza del contraste. Es la mitad de por qué su sitio se siente suave. Aplicable a texto secundario |
| **Badges de estado en la grilla** | "OFERTA" y "AGOTADO" sobre la imagen. Comunica disponibilidad sin abrir la ficha |
| **Precio comparativo tachado** | precio vigente + anterior tachado, en la tarjeta. Justifica el descuento en el punto de decisión |
| **Variantes de color en la grilla** | puntos de color bajo el precio, sin entrar a la ficha. Apple hace lo mismo: los dos coinciden, señal fuerte |
| **Búsqueda predictiva en modal** | resultados mientras se escribe. Nuestra lupa hoy solo lleva a `/tienda?buscar=1` |

## 4. Lo que NO hay que copiar de Dune Dragon

| Antipatrón | Medición |
|---|---|
| **Modal de oferta al entrar** | Tapa el hero antes de que el visitante vea un producto |
| **Header transparente sobre foto clara** | Navegación blanca sobre arena: ilegible. Falla de contraste real |
| **Hover muerto en tarjetas** | Declaran `transition: all` y no cambia ni una propiedad. Las tarjetas no responden al cursor |
| **Base de 14px** | Chica para cuerpo de texto |
| **Cero tokens en `:root`** | Sin sistema: cada valor vive suelto en el tema |
| **H1 en peso 400** | Jerarquía solo por tamaño, sin apoyo de peso |

## 5. Orden de aplicación sugerido

1. **Escala de tracking por tramo** — una tabla en `globals.css`. Impacto visual alto, riesgo nulo.
2. **Fondo gris 245 + tarjetas blancas** — profundidad sin sombras. Toca tokens, no estructura.
3. **Base a 17/25.**
4. **Hover real en tarjetas de producto** — donde Dune Dragon no tiene nada y podemos ganar de entrada.
5. **Badges de estado + precio comparativo tachado** en la grilla.
6. **Fila de categorías con iconos** sobre carrusel con snap.
7. **Precio con cuota** en tarjeta y ficha.
8. **Búsqueda predictiva** en la lupa.

Los puntos 1 a 3 son tokens: se hacen en una sesión y cambian la percepción del sitio entero. Del 4 en adelante son componentes.

## Pendiente de medir

- Responsive real a 390 y 768 px en los tres sitios. El resize de ventana de Chrome MCP no cambió el viewport (siguió reportando 1920). Requiere Playwright con viewport controlado.
- Hover de tarjetas en Apple y en Tryvex.
- Fichas de producto y flujos de compra de ambos referentes.
