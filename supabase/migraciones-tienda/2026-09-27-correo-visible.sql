-- Correo que la tienda muestra, separado del que recibe los mensajes.
--
-- La tienda enseña una dirección de marca (tryvex@tryvex.tech) y, al tocarla,
-- abre un correo dirigido a `email_contacto` (el buzón que el equipo lee).
-- Vacío: se muestra el mismo `email_contacto`.
-- Aplicado en producción el 2026-09-27 con los valores pedidos por el dueño.

alter table configuracion_tienda add column if not exists email_visible text;

update configuracion_tienda
   set email_visible = 'tryvex@tryvex.tech',
       email_contacto = 'tryvexentreprise@gmail.com'
 where id;
