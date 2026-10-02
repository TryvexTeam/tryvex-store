-- Medidas de la foto de cada reseña, para que la tarjeta se adapte a su forma.
--
-- Hasta ahora la foto se metía en un marco fijo 16:9 y se recortaba: una foto
-- vertical de celular perdía la cara o el producto. Con ancho y alto guardados,
-- la tarjeta dibuja un marco con la proporción real de la foto (acotada a un
-- rango razonable) y, si la foto se sale del rango, la muestra entera en vez de
-- recortarla.
--
-- Las medidas las toma el navegador al elegir la foto. Son opcionales: una
-- reseña sin foto, o con una foto que el navegador no pudo medir (p. ej. HEIC),
-- las deja vacías y la tarjeta usa el marco 16:9 de siempre.
--
-- Solo agrega columnas nuevas y vacías: no toca ni reescribe ningún dato.

alter table public.resenas_tienda
  add column if not exists foto_ancho integer check (foto_ancho is null or foto_ancho between 1 and 20000),
  add column if not exists foto_alto integer check (foto_alto is null or foto_alto between 1 and 20000);

comment on column public.resenas_tienda.foto_ancho is 'Ancho en píxeles de la foto, ya con la orientación EXIF aplicada.';
comment on column public.resenas_tienda.foto_alto is 'Alto en píxeles de la foto, ya con la orientación EXIF aplicada.';
