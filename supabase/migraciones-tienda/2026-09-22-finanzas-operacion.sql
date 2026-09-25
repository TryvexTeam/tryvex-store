-- Finanzas y operación: flujo de caja, obligaciones y trazabilidad.
--
-- Esta migración es aditiva. NO se aplica desde la aplicación: ejecútala en
-- Supabase SQL Editor después de revisar las políticas y respaldar producción.
-- Los pagos de pedidos siguen entrando exclusivamente por confirmar_pago_pedido.

create table if not exists public.categorias_financieras (
  codigo text primary key check (codigo ~ '^[a-z0-9_]{2,60}$'),
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  nombre text not null check (char_length(nombre) between 2 and 100),
  orden smallint not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.categorias_financieras (codigo, tipo, nombre, orden) values
  ('ventas','ingreso','Ventas',10),
  ('otros_ingresos','ingreso','Otros ingresos',90),
  ('devolucion_proveedor','ingreso','Devolución de proveedor',80),
  ('servicios_basicos','egreso','Servicios básicos',10),
  ('inventario_insumos','egreso','Inventario e insumos',20),
  ('arriendo','egreso','Arriendo',30),
  ('remuneraciones','egreso','Remuneraciones',40),
  ('administracion','egreso','Gastos administrativos',50),
  ('marketing','egreso','Marketing y publicidad',60),
  ('transporte_logistica','egreso','Transporte y logística',70),
  ('mantencion_reparaciones','egreso','Mantención y reparaciones',80),
  ('equipamiento','egreso','Muebles, equipos y maquinaria',90),
  ('comisiones_medios_pago','egreso','Comisiones y medios de pago',100),
  ('impuestos','egreso','Impuestos',110),
  ('otros_gastos','egreso','Otros gastos',120)
on conflict (codigo) do update set tipo = excluded.tipo, nombre = excluded.nombre, orden = excluded.orden;

alter table public.movimientos_financieros
  add column if not exists categoria_codigo text references public.categorias_financieras(codigo),
  add column if not exists origen text not null default 'manual' check (origen in ('manual','pedido','stock','obligacion','ajuste')),
  add column if not exists bloqueado boolean not null default false,
  add column if not exists pedido_id uuid references public.pedidos(id) on delete restrict,
  add column if not exists corregido_por_id uuid references public.movimientos_financieros(id) on delete restrict,
  add column if not exists nota_correccion text check (char_length(nota_correccion) <= 500),
  add column if not exists updated_at timestamptz not null default now();

-- Conserva el texto antiguo para auditoría, pero habilita reportes por código.
update public.movimientos_financieros
set categoria_codigo = case
  when tipo = 'ingreso' and lower(categoria) like '%venta%' then 'ventas'
  when tipo = 'ingreso' and lower(categoria) like '%proveedor%' then 'devolucion_proveedor'
  when tipo = 'ingreso' then 'otros_ingresos'
  when lower(categoria) like '%stock%' or lower(categoria) like '%import%' then 'inventario_insumos'
  when lower(categoria) like '%env%o%' or lower(categoria) like '%log%stica%' then 'transporte_logistica'
  when lower(categoria) like '%publicidad%' then 'marketing'
  when lower(categoria) like '%comisi%' then 'comisiones_medios_pago'
  else 'otros_gastos'
end
where categoria_codigo is null;

update public.movimientos_financieros
set origen = 'pedido', bloqueado = true
where lower(categoria) = 'venta' and descripcion like 'Pedido #%';

create index if not exists movimientos_financieros_fecha_idx
  on public.movimientos_financieros (fecha desc, created_at desc);
create index if not exists movimientos_financieros_categoria_codigo_idx
  on public.movimientos_financieros (categoria_codigo, fecha desc);
create index if not exists movimientos_financieros_pedido_idx
  on public.movimientos_financieros (pedido_id) where pedido_id is not null;

-- Una obligación representa una cuenta por cobrar o pagar; no es efectivo.
create table if not exists public.obligaciones_financieras (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('por_cobrar','por_pagar')),
  estado text not null default 'pendiente' check (estado in ('pendiente','parcial','pagada','anulada','vencida')),
  contraparte text not null check (char_length(trim(contraparte)) between 2 and 120),
  concepto text not null check (char_length(trim(concepto)) between 2 and 240),
  monto_total_clp numeric(14,0) not null check (monto_total_clp > 0),
  fecha_emision date not null default current_date,
  fecha_vencimiento date,
  categoria_codigo text references public.categorias_financieras(codigo),
  pedido_id uuid references public.pedidos(id) on delete restrict,
  creado_por uuid references public.dim_integrantes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  anulada_at timestamptz,
  check (fecha_vencimiento is null or fecha_vencimiento >= fecha_emision)
);

create table if not exists public.pagos_obligaciones (
  id uuid primary key default gen_random_uuid(),
  obligacion_id uuid not null references public.obligaciones_financieras(id) on delete restrict,
  monto_clp numeric(14,0) not null check (monto_clp > 0),
  fecha date not null default current_date,
  metodo_pago text check (metodo_pago in ('transferencia','efectivo','tarjeta','mercadopago','otro')),
  referencia text check (char_length(referencia) <= 120),
  movimiento_financiero_id uuid unique references public.movimientos_financieros(id) on delete restrict,
  creado_por uuid references public.dim_integrantes(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists obligaciones_financieras_estado_idx
  on public.obligaciones_financieras (tipo, estado, fecha_vencimiento);
create index if not exists pagos_obligaciones_obligacion_idx
  on public.pagos_obligaciones (obligacion_id, fecha);

alter table public.categorias_financieras enable row level security;
alter table public.obligaciones_financieras enable row level security;
alter table public.pagos_obligaciones enable row level security;

-- Se usan los mismos permisos que ya protegen Finanzas.
create policy "equipo lee categorias financieras" on public.categorias_financieras
  for select to authenticated using (public.tengo_permiso('ver_finanzas'));
create policy "equipo lee obligaciones financieras" on public.obligaciones_financieras
  for select to authenticated using (public.tengo_permiso('ver_finanzas'));
create policy "equipo gestiona obligaciones financieras" on public.obligaciones_financieras
  for all to authenticated using (public.tengo_permiso('gestionar_finanzas'))
  with check (public.tengo_permiso('gestionar_finanzas'));
create policy "equipo lee pagos obligaciones" on public.pagos_obligaciones
  for select to authenticated using (public.tengo_permiso('ver_finanzas'));
create policy "equipo gestiona pagos obligaciones" on public.pagos_obligaciones
  for all to authenticated using (public.tengo_permiso('gestionar_finanzas'))
  with check (public.tengo_permiso('gestionar_finanzas'));

comment on table public.obligaciones_financieras is
  'Compromisos por cobrar o pagar. No entran al flujo de caja hasta registrar un pago.';
comment on column public.movimientos_financieros.bloqueado is
  'Los movimientos automáticos no se editan: se corrigen creando un movimiento compensatorio con referencia.';

-- Compatibilidad con confirmar_pago_pedido ya desplegada: al ejecutarse, su
-- insert existente queda marcado como automático sin abrir una segunda ruta de
-- pago ni alterar su bloqueo FOR UPDATE / idempotencia.
create or replace function public.marcar_movimiento_pedido_automatico()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.categoria = 'Venta' and new.descripcion like 'Pedido #%' then
    new.categoria_codigo := 'ventas';
    new.origen := 'pedido';
    new.bloqueado := true;
  end if;
  return new;
end;
$$;

drop trigger if exists marcar_movimiento_pedido_automatico on public.movimientos_financieros;
create trigger marcar_movimiento_pedido_automatico
  before insert on public.movimientos_financieros
  for each row execute function public.marcar_movimiento_pedido_automatico();

-- Los movimientos manuales ya usan la categoría centralizada en la aplicación.
-- Al implementar edición, bloquear UPDATE/DELETE cuando bloqueado=true y crear
-- un movimiento compensatorio con corregido_por_id y nota_correccion.
