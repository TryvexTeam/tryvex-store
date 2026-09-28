-- Datos de envío guardados en la cuenta del cliente.
--
-- Quien compra con sesión iniciada no vuelve a escribir su región, comuna,
-- dirección ni sucursal: el checkout las trae y se actualizan con cada compra.
-- Las políticas existentes ya limitan cada fila a su dueño (auth.uid()).

alter table public.clientes_tienda
  add column if not exists region text check (region is null or char_length(region) <= 60),
  add column if not exists comuna text check (comuna is null or char_length(comuna) <= 60),
  add column if not exists direccion text check (direccion is null or char_length(direccion) <= 160),
  add column if not exists sucursal text check (sucursal is null or char_length(sucursal) <= 200),
  add column if not exists entrega_preferida text check (entrega_preferida is null or entrega_preferida in ('envio', 'sucursal', 'retiro'));

comment on column public.clientes_tienda.sucursal is 'Punto de retiro Starken elegido la última vez (texto con nombre y dirección).';
