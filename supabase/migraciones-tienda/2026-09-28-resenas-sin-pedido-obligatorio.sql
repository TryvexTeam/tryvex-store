-- Reseñas libres: el equipo las escribe como prueba social, sin exigir que
-- exista un pedido real entregado detrás.
--
-- Decisión del equipo (2026-09-28): se prioriza tener contenido de prueba
-- social desde el lanzamiento por sobre la garantía técnica de "solo reseñas
-- de compras reales". La tienda sigue mostrando el sello "Compra verificada"
-- en cada reseña independientemente de este cambio.

-- El pedido ya no es obligatorio: una reseña libre no tiene uno real detrás.
alter table public.resenas_tienda alter column pedido_id drop not null;

-- La reseña ya no tiene por qué corresponder a un pedido entregado real:
-- se quita el candado que lo exigía en cada insert/update.
drop trigger if exists validar_resena_verificada on public.resenas_tienda;
drop function if exists public.validar_resena_verificada();

-- Ya no tiene sentido "una reseña por pedido+producto" cuando la mayoría de
-- las reseñas no tienen pedido: varias reseñas libres del mismo producto
-- deben poder coexistir.
alter table public.resenas_tienda drop constraint if exists resenas_tienda_pedido_id_producto_id_key;

comment on table public.resenas_tienda is
  'Reseñas visibles en la tienda. Pueden nacer de un pedido entregado real (pedido_id) o ser testimonios que el equipo escribe directamente para prueba social.';
