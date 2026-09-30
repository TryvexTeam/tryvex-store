-- Calificación en estrellas para las reseñas verificadas.
--
-- Las reseñas ya existían (texto, foto, compra verificada); esto agrega la
-- nota de 1 a 5 estrellas que se muestra junto al texto en la tienda.

alter table public.resenas_tienda
  add column if not exists calificacion smallint not null default 5
  check (calificacion between 1 and 5);

comment on column public.resenas_tienda.calificacion is
  'Estrellas de 1 a 5 que el equipo asigna al publicar la reseña.';
