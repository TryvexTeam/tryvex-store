-- Reseñas escritas por clientes con cuenta, desde la ficha del producto.
--
-- Llegan ocultas (visible = false) y el equipo las aprueba en Panel → Reseñas.
-- `auth_user_id` dice quién la escribió: separa las «por aprobar» de las que el
-- equipo ocultó a propósito, y limita a una reseña por cliente y producto.
-- Solo agrega una columna y un índice: no toca filas existentes.

alter table public.resenas_tienda
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create unique index if not exists resenas_tienda_cliente_producto_uidx
  on public.resenas_tienda (auth_user_id, producto_id)
  where auth_user_id is not null;

comment on column public.resenas_tienda.auth_user_id is
  'Cliente que escribió la reseña desde la tienda. Nulo = la cargó el equipo o vino importada.';
