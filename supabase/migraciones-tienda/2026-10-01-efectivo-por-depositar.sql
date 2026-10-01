-- Efectivo por depositar: quién del equipo tiene plata en efectivo y cuánto falta depositar.
--
-- Cada fila es un hecho: un integrante RECIBIÓ efectivo (por ventas cobradas en mano) o lo
-- DEPOSITÓ en la cuenta. El saldo de cada persona es lo recibido menos lo depositado. No toca
-- `movimientos_financieros`: mover efectivo a la cuenta no cambia cuánta plata tiene el negocio,
-- solo dónde está, y mezclarlo ahí inflaría «entró» y «salió».
--
-- Permisos: igual que las demás tablas de dinero. Ver con `ver_finanzas`; registrar y borrar con
-- `gestionar_finanzas`. Sin acceso anónimo y sin UPDATE: una corrección es borrar y volver a anotar.

begin;

create table if not exists public.efectivo_por_depositar (
  id uuid primary key default gen_random_uuid(),
  integrante_id uuid not null references public.dim_integrantes(id) on delete restrict,
  tipo text not null check (tipo in ('recibe', 'deposita')),
  monto_clp numeric(14, 0) not null check (monto_clp > 0),
  fecha date not null default current_date,
  nota text check (nota is null or char_length(nota) <= 240),
  creado_por uuid references public.dim_integrantes(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists efectivo_por_depositar_integrante_idx
  on public.efectivo_por_depositar (integrante_id, fecha desc, created_at desc);

alter table public.efectivo_por_depositar enable row level security;

drop policy if exists "leer efectivo con permiso" on public.efectivo_por_depositar;
drop policy if exists "registrar efectivo con permiso" on public.efectivo_por_depositar;
drop policy if exists "borrar efectivo con permiso" on public.efectivo_por_depositar;

create policy "leer efectivo con permiso" on public.efectivo_por_depositar
  for select to authenticated using (public.tengo_permiso('ver_finanzas'));
create policy "registrar efectivo con permiso" on public.efectivo_por_depositar
  for insert to authenticated with check (public.tengo_permiso('gestionar_finanzas'));
create policy "borrar efectivo con permiso" on public.efectivo_por_depositar
  for delete to authenticated using (public.tengo_permiso('gestionar_finanzas'));

-- Postgres concede a `anon` por defecto en este servidor: se cierra de forma explícita.
revoke all on table public.efectivo_por_depositar from public, anon, authenticated;
grant select, insert, delete on table public.efectivo_por_depositar to authenticated;
grant all on table public.efectivo_por_depositar to service_role;

commit;

-- Que la API vea la tabla nueva sin reiniciar.
notify pgrst, 'reload schema';
