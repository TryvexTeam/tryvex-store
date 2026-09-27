-- Ranura de la escena en foco («Diseñados para acompañarte»).
--
-- Se edita desde el panel (Portada → Escena en foco): producto del botón,
-- video, modo (en bucle o con el scroll) y frases. Nace sin frases ni video:
-- así la escena se ve igual que antes (frases automáticas y foto del primer
-- producto disponible) hasta que el equipo la edite.
-- Aplicado en producción el 2026-09-27.

insert into secciones_landing (clave, titulo, visible, orden, contenido)
values ('foco', 'Escena en foco', true, 70, '{"tipo": "foco", "modo": "bucle"}'::jsonb)
on conflict (clave) do nothing;
