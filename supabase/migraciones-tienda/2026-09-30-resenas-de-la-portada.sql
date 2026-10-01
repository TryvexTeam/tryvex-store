-- Reseñas de la portada: testimonios que no pertenecen a ningún producto.
--
-- Hasta ahora toda reseña colgaba de un producto. El equipo quiere poder
-- escribir reseñas sueltas para la sección «Lo que dicen de Tryvex» de la
-- portada, sin atarlas a un producto. Con producto_id vacío la reseña sale
-- solo en la portada; con producto, sale también en la ficha de ese producto.
--
-- Solo afloja una regla: no borra ni reescribe nada, y las reseñas que ya
-- existan conservan su producto. La llave foránea sigue vigente para las que
-- sí lo tienen (on delete cascade: si se borra el producto, se borran las suyas).

alter table public.resenas_tienda alter column producto_id drop not null;

comment on column public.resenas_tienda.producto_id is
  'Producto reseñado. Vacío = reseña de la portada (sin producto).';
