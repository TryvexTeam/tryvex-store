-- Saldo declarado de la cuenta: lo que el equipo dice que hay en la cuenta bancaria.
--
-- Es una foto manual, no un movimiento: sirve para cuadrar contra lo que el sistema dice que
-- debería haber (ventas y aportes menos compras). Cada vez que se actualiza se agrega una fila y
-- la más reciente es la vigente; las anteriores quedan como historial.
--
-- Permisos como las demás tablas de dinero: ver con `ver_finanzas`, registrar con
-- `gestionar_finanzas`, sin acceso anónimo y sin UPDATE ni DELETE (una corrección es una fila nueva).

begin;

create table if not exists public.saldo_cuenta (
  id uuid primary key default gen_random_uuid(),
  monto_clp numeric(14, 0) not null check (monto_clp >= 0),
  fecha date not null default current_date,
  nota text check (nota is null or char_length(nota) <= 240),
  creado_por uuid references public.dim_integrantes(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists saldo_cuenta_reciente_idx on public.saldo_cuenta (fecha desc, created_at desc);

alter table public.saldo_cuenta enable row level security;

drop policy if exists "leer saldo con permiso" on public.saldo_cuenta;
drop policy if exists "declarar saldo con permiso" on public.saldo_cuenta;

create policy "leer saldo con permiso" on public.saldo_cuenta
  for select to authenticated using (public.tengo_permiso('ver_finanzas'));
create policy "declarar saldo con permiso" on public.saldo_cuenta
  for insert to authenticated with check (public.tengo_permiso('gestionar_finanzas'));

revoke all on table public.saldo_cuenta from public, anon, authenticated;
grant select, insert on table public.saldo_cuenta to authenticated;
grant all on table public.saldo_cuenta to service_role;

commit;

notify pgrst, 'reload schema';
