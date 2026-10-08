"""Herramienta: vuelve transparentes las zonas blancas grandes encerradas en una foto de producto.

Uso: python quitar_blanco.py entrada.png salida.webp
Solo toca manchas blancas grandes (huecos entre correas, etc.); el texto blanco
pequeño de una pantalla queda intacto. El borde se suaviza para que no quede halo.
Solo numpy + Pillow (scipy está bloqueado por la política de Windows).
"""
import sys
from collections import deque
import numpy as np
from PIL import Image

entrada, salida = sys.argv[1], sys.argv[2]
im = Image.open(entrada).convert("RGBA")
a = np.asarray(im).astype(np.float32)
rgb, alfa = a[..., :3], a[..., 3]
alto, ancho = alfa.shape

blanco = (rgb.min(axis=2) > 232) & (alfa > 200)
visto = np.zeros_like(blanco)
grandes = np.zeros_like(blanco)
minimo = blanco.size * 0.004  # manchas de al menos 0,4 % de la imagen
manchas = quitadas = 0

for y0, x0 in zip(*np.nonzero(blanco)):
    if visto[y0, x0]:
        continue
    manchas += 1
    cola, pixeles = deque([(y0, x0)]), []
    visto[y0, x0] = True
    while cola:
        y, x = cola.popleft()
        pixeles.append((y, x))
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < alto and 0 <= nx < ancho and blanco[ny, nx] and not visto[ny, nx]:
                visto[ny, nx] = True
                cola.append((ny, nx))
    if len(pixeles) >= minimo:
        quitadas += 1
        ys, xs = zip(*pixeles)
        grandes[list(ys), list(xs)] = True

print("manchas:", manchas, "grandes:", quitadas, "px quitados:", int(grandes.sum()))


def dilatar(m, veces):
    m = m.copy()
    for _ in range(veces):
        d = m.copy()
        d[1:] |= m[:-1]; d[:-1] |= m[1:]; d[:, 1:] |= m[:, :-1]; d[:, :-1] |= m[:, 1:]
        m = d
    return m


# Borde suave: alrededor de la mancha, cuanto más blanco el píxel, más transparente.
borde = dilatar(grandes, 3) & ~grandes
blancura = np.clip((rgb.min(axis=2) - 170) / (255 - 170), 0, 1)
nueva = alfa.copy()
nueva[grandes] = 0
nueva[borde] = alfa[borde] * (1 - blancura[borde])

a[..., 3] = nueva
Image.fromarray(a.astype(np.uint8), "RGBA").save(salida, "WEBP", quality=90, method=6)
