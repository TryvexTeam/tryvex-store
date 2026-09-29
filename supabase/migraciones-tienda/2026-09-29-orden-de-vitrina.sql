-- Orden de la vitrina, elegido por el equipo desde el panel.
--
-- · productos.orden        → orden de /tienda (ya existía; ahora la tienda lo usa).
-- · productos.nuevo_orden  → posición en «Todo lo nuevo» de la portada.
--                            Nulo: el producto no aparece en esa sección.
--
-- Las dos funciones reciben la lista completa en el orden deseado y la
-- escriben en una sola sentencia. Son security invoker: corren con los
-- permisos de quien llama, así que la política «gestionar productos»
-- (is_integrante) sigue siendo la que decide quién puede ordenar.

alter table public.productos add column if not exists nuevo_orden integer;

create or replace function public.ordenar_vitrina(p_ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  update productos p
     set orden = t.posicion
    from unnest(p_ids) with ordinality as t(id, posicion)
   where p.id = t.id;
$$;

create or replace function public.ordenar_lo_nuevo(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update productos
     set nuevo_orden = null
   where nuevo_orden is not null
     and not (id = any (p_ids));

  update productos p
     set nuevo_orden = t.posicion
    from unnest(p_ids) with ordinality as t(id, posicion)
   where p.id = t.id;
end;
$$;

revoke all on function public.ordenar_vitrina(uuid[]) from public, anon;
revoke all on function public.ordenar_lo_nuevo(uuid[]) from public, anon;
grant execute on function public.ordenar_vitrina(uuid[]) to authenticated;
grant execute on function public.ordenar_lo_nuevo(uuid[]) to authenticated;

notify pgrst, 'reload schema';
