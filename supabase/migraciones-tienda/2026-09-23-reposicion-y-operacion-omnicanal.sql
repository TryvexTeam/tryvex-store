-- Operación omnicanal ligera: cada producto define cuándo necesita reposición.
-- Las variantes heredan este mínimo. Así no se duplican umbrales ni se mezcla
-- inventario de venta con un ERP de compras.
alter table public.productos
  add column if not exists stock_minimo integer not null default 5
  check (stock_minimo >= 0 and stock_minimo <= 1000000);

comment on column public.productos.stock_minimo is
  'Unidades disponibles a partir de las que el producto entra en la lista de reposición. Las variantes heredan el umbral del producto.';

create index if not exists pedidos_pendientes_transferencia_idx
  on public.pedidos (created_at asc)
  where estado = 'pendiente' and metodo_pago = 'transferencia';

create index if not exists pedidos_cliente_contacto_idx
  on public.pedidos (cliente_email, cliente_fono, created_at desc);

-- La columna pertenece al catálogo, que ya usa las políticas de equipo de
-- productos. No se agrega una política amplia para no abrir el catálogo a
-- clientes ni duplicar la autorización existente.
