-- Reseñas verificadas de productos.
--
-- Una reseña siempre se ancla a una compra entregada y al producto que venía en
-- ese pedido. Así la tienda no presenta opiniones inventadas como testimonios
-- de compradores. Las fotos viven aparte de las imágenes de catálogo: se
-- pueden publicar en la tienda, pero nadie fuera del equipo puede escribirlas.

create table if not exists public.resenas_tienda (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete cascade,
  cliente_nombre text not null check (char_length(cliente_nombre) between 1 and 120),
  texto text not null check (char_length(texto) between 1 and 1200),
  foto_path text check (foto_path is null or char_length(foto_path) <= 300),
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.dim_integrantes (id) on delete set null,
  unique (pedido_id, producto_id)
);

create index if not exists resenas_tienda_producto_visible_created_idx
  on public.resenas_tienda (producto_id, created_at desc)
  where visible;
create index if not exists resenas_tienda_visible_created_idx
  on public.resenas_tienda (created_at desc)
  where visible;

-- La aplicación también valida esta regla para dar un mensaje entendible; el
-- trigger la vuelve imposible de saltar por una llamada directa a PostgREST.
create or replace function public.validar_resena_verificada()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.pedidos p
    join public.pedido_items i on i.pedido_id = p.id
    where p.id = new.pedido_id
      and p.estado = 'entregado'
      and i.producto_id = new.producto_id
  ) then
    raise exception 'La reseña debe pertenecer a un producto de un pedido entregado.';
  end if;
  return new;
end;
$$;

drop trigger if exists validar_resena_verificada on public.resenas_tienda;
create trigger validar_resena_verificada
before insert or update of pedido_id, producto_id on public.resenas_tienda
for each row execute function public.validar_resena_verificada();

alter table public.resenas_tienda enable row level security;

create policy "visitantes leen resenas visibles" on public.resenas_tienda
  for select to anon, authenticated using (visible or public.is_integrante());
create policy "equipo crea resenas verificadas" on public.resenas_tienda
  for insert to authenticated with check (public.is_integrante());
create policy "equipo actualiza resenas" on public.resenas_tienda
  for update to authenticated using (public.is_integrante()) with check (public.is_integrante());
create policy "equipo borra resenas" on public.resenas_tienda
  for delete to authenticated using (public.is_integrante());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resenas', 'resenas', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "equipo sube fotos de resenas" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resenas' and public.is_integrante());
create policy "equipo reemplaza fotos de resenas" on storage.objects
  for update to authenticated
  using (bucket_id = 'resenas' and public.is_integrante())
  with check (bucket_id = 'resenas' and public.is_integrante());
create policy "equipo borra fotos de resenas" on storage.objects
  for delete to authenticated
  using (bucket_id = 'resenas' and public.is_integrante());

comment on table public.resenas_tienda is
  'Reseñas visibles de compras entregadas. Cada fila se valida contra pedido_items.';
