-- Subir la foto de una reseña fallaba con «new row violates row-level security
-- policy» aunque el usuario fuera del equipo.
--
-- Causa: el bucket `resenas` tenía reglas para subir, reemplazar y borrar, pero
-- ninguna de LECTURA sobre storage.objects. Al guardar un archivo, Supabase hace
-- un INSERT ... RETURNING (y con upsert, un ON CONFLICT DO UPDATE), y Postgres
-- exige que la fila nueva pase también una regla de lectura. Sin ella rechaza el
-- insert con ese mismo mensaje. `productos` y `vouchers` sí la tienen, por eso
-- solo fallaban las reseñas.
--
-- Las fotos de reseñas ya son públicas (el bucket es público y se muestran en la
-- tienda), así que la lectura pública no expone nada nuevo. Escribir, reemplazar y
-- borrar sigue reservado al equipo por las reglas que ya existían.
--
-- No borra ni modifica nada. Se comprueba antes de crear para poder repetirse.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'lectura publica de fotos de resenas'
  ) then
    create policy "lectura publica de fotos de resenas" on storage.objects
      for select to public
      using (bucket_id = 'resenas');
  end if;
end
$$;
