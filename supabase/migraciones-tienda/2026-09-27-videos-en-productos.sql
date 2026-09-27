-- El bucket de productos admite videos para la galería de cada producto.
--
-- Las fotos siguen topadas en 5 MB desde la aplicación (lib/imagenes.ts);
-- el bucket sube a 30 MB por los videos, que se suben directo del
-- navegador con URL firmada (Vercel corta los envíos de más de 4,5 MB).
-- El servicio de storage del VPS permite hasta 50 MB (FILE_SIZE_LIMIT).
-- Aplicado en producción el 2026-09-27.

update storage.buckets
   set file_size_limit = 31457280,
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic',
         'video/mp4', 'video/webm'
       ]
 where id = 'productos';
