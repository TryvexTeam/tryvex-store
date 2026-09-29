-- Avisos push del panel: cada teléfono (o navegador) del equipo que activa
-- las notificaciones deja aquí su suscripción de Web Push.
--
-- Nadie la lee ni la escribe desde el navegador: el panel pasa por acciones
-- del servidor que comprueban que quien suscribe es integrante activo, y el
-- envío corre con la clave de servicio. Por eso RLS queda activo SIN
-- políticas y sin permisos para anon ni authenticated: en este Postgres las
-- tablas nuevas le conceden todo a authenticated por defecto.

create table if not exists public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  integrante_id uuid not null references public.dim_integrantes (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  dispositivo text check (dispositivo is null or char_length(dispositivo) <= 200),
  created_at timestamptz not null default now(),
  ultimo_envio_at timestamptz
);

create index if not exists push_suscripciones_integrante_idx
  on public.push_suscripciones (integrante_id);

alter table public.push_suscripciones enable row level security;
revoke all on public.push_suscripciones from public, anon, authenticated;
grant select, insert, update, delete on public.push_suscripciones to service_role;

comment on table public.push_suscripciones is
  'Suscripciones Web Push de los dispositivos del equipo. Solo la usa el servidor.';
