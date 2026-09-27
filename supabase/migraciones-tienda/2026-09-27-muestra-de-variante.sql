-- Muestra de cada variante: la imagen chica del círculo de color que se ve
-- bajo la card y en la ficha (como los de dunedragon.cl, donde un círculo
-- puede ser un diseño de dos tonos o una textura, no solo un color plano).
--
-- Ruta en el bucket `productos`, bajo `<producto_id>/muestras/`: cae dentro
-- de la carpeta del producto, así que la cubren las mismas reglas de
-- escritura del equipo. Vacía: el círculo se pinta con `color_hex`.
-- Aplicado en producción el 2026-09-27.

alter table producto_variantes add column if not exists muestra_url text;

comment on column producto_variantes.muestra_url is
  'Imagen del círculo de la variante (ruta en el bucket productos). Nula: se usa color_hex.';
