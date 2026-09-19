-- Cuentas de clientes de la tienda, en la misma base del CRM de Tryvex.
--
-- Principio: un cliente con sesión NO es integrante. Todo lo del CRM ya exige
-- is_integrante()/mi_integrante_id(); aquí solo se agregan tablas propias del
-- cliente con acceso exclusivo a sus filas, y se cierra la única escritura del
-- CRM que aceptaba a cualquier usuario con sesión.

-- 1. Caché de búsquedas de música: solo integrantes activos pueden escribir.
drop policy if exists "guardar en el cache de busquedas" on public.musica_busquedas;
create policy "guardar en el cache de busquedas"
  on public.musica_busquedas for insert to authenticated
  with check (public.is_integrante());

-- 2. Correo confirmado de la sesión. `authenticated` no puede leer auth.users,
--    así que se expone solo este dato, solo del propio usuario, solo si está
--    verificado. search_path vacío: nada se resuelve fuera de lo calificado.
create or replace function public.mi_email_confirmado()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)
  from auth.users u
  where u.id = (select auth.uid())
    and u.email_confirmed_at is not null
$$;
revoke all on function public.mi_email_confirmado() from public, anon;
grant execute on function public.mi_email_confirmado() to authenticated;

-- 3. Perfil del cliente (1:1 con auth.users). Sin datos de pago.
create table if not exists public.clientes_tienda (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  nombre text check (char_length(nombre) <= 120),
  telefono text check (char_length(telefono) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clientes_tienda enable row level security;

create policy "cliente lee su perfil" on public.clientes_tienda
  for select to authenticated using (auth_user_id = (select auth.uid()));
create policy "cliente crea su perfil" on public.clientes_tienda
  for insert to authenticated with check (auth_user_id = (select auth.uid()));
create policy "cliente edita su perfil" on public.clientes_tienda
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));
create policy "equipo lee perfiles" on public.clientes_tienda
  for select to authenticated using (public.is_integrante());

-- 4. Favoritos: pares (cliente, producto). Solo productos publicados.
create table if not exists public.favoritos_tienda (
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (auth_user_id, producto_id)
);
alter table public.favoritos_tienda enable row level security;

create policy "cliente lee sus favoritos" on public.favoritos_tienda
  for select to authenticated using (auth_user_id = (select auth.uid()));
create policy "cliente agrega favorito publicado" on public.favoritos_tienda
  for insert to authenticated
  with check (
    auth_user_id = (select auth.uid())
    and exists (select 1 from public.productos p where p.id = producto_id and p.estado = 'publicado')
  );
create policy "cliente quita sus favoritos" on public.favoritos_tienda
  for delete to authenticated using (auth_user_id = (select auth.uid()));

-- 5. Pedidos ligados a la cuenta. La columna la llena SOLO el servidor al crear
--    el pedido con sesión; el cliente nunca inserta ni edita pedidos.
alter table public.pedidos add column if not exists cliente_auth_id uuid references auth.users (id) on delete set null;
create index if not exists pedidos_cliente_auth_id_idx on public.pedidos (cliente_auth_id);
create index if not exists pedidos_cliente_email_lower_idx on public.pedidos (lower(cliente_email));

-- Lectura: por cuenta, o por correo ya CONFIRMADO de la sesión. Nunca por un
-- correo sin verificar (evita que alguien registre un correo ajeno y vea compras).
create policy "cliente lee sus pedidos" on public.pedidos
  for select to authenticated
  using (
    cliente_auth_id = (select auth.uid())
    or (cliente_email is not null and lower(cliente_email) = (select public.mi_email_confirmado()))
  );

create policy "cliente lee items de sus pedidos" on public.pedido_items
  for select to authenticated
  using (exists (
    select 1 from public.pedidos p
    where p.id = pedido_id
      and (
        p.cliente_auth_id = (select auth.uid())
        or (p.cliente_email is not null and lower(p.cliente_email) = (select public.mi_email_confirmado()))
      )
  ));
