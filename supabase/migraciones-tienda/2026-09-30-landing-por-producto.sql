-- Landing editable de cada producto.
--
-- El equipo arma desde el panel una página larga bajo la ficha de cada producto,
-- con bloques (encabezado, imagen con texto, galería, características, banner,
-- preguntas) que se agregan, ordenan, ocultan y editan sin tocar código.
--
-- Los bloques viven en una sola columna jsonb por producto: es una lista corta
-- que siempre se lee y se guarda entera, y así no hace falta una tabla por tipo
-- de bloque. La aplicación valida y normaliza la forma al guardar; la base solo
-- exige que sea una lista.
--
-- Solo agrega una columna nueva con valor por defecto vacío: no toca ni reescribe
-- ningún dato, y los productos existentes quedan sin landing (la ficha se ve igual).

alter table public.productos
  add column if not exists landing jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'productos_landing_es_lista' and conrelid = 'public.productos'::regclass
  ) then
    alter table public.productos
      add constraint productos_landing_es_lista check (jsonb_typeof(landing) = 'array');
  end if;
end
$$;

comment on column public.productos.landing is
  'Bloques de la landing del producto (lista ordenada). Forma validada por lib/landing-producto.ts.';
