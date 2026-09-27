-- Cada categoría puede tener su propia foto para la fila de familias de la
-- tienda (la que imita apple.com/cl/store). Ruta dentro del bucket
-- `productos`, bajo `categorias/<id>/`. Si está vacía, la tienda sigue
-- usando la foto del primer producto de la categoría.
-- Aplicado en producción el 2026-09-27.

alter table categorias add column if not exists imagen_url text;

comment on column categorias.imagen_url is
  'Foto de la categoría en la fila de familias (ruta en el bucket productos). Nula: se usa la del primer producto.';

-- Escritura en el bucket: el equipo sube, reemplaza y borra la foto de una
-- categoría solo bajo `categorias/<id>/` y solo si esa categoría existe. Es
-- la misma regla que ya protege las carpetas de productos y de campaña.
drop policy if exists categorias_sube_equipo on storage.objects;
drop policy if exists categorias_actualiza_equipo on storage.objects;
drop policy if exists categorias_borra_equipo on storage.objects;

create policy categorias_sube_equipo on storage.objects for insert
  with check (
    bucket_id = 'productos' and is_integrante()
    and (storage.foldername(name))[1] = 'categorias'
    and exists (select 1 from categorias c where c.id::text = (storage.foldername(objects.name))[2])
  );

create policy categorias_actualiza_equipo on storage.objects for update
  using (bucket_id = 'productos' and is_integrante() and (storage.foldername(name))[1] = 'categorias')
  with check (
    bucket_id = 'productos' and is_integrante()
    and (storage.foldername(name))[1] = 'categorias'
    and exists (select 1 from categorias c where c.id::text = (storage.foldername(objects.name))[2])
  );

create policy categorias_borra_equipo on storage.objects for delete
  using (bucket_id = 'productos' and is_integrante() and (storage.foldername(name))[1] = 'categorias');
