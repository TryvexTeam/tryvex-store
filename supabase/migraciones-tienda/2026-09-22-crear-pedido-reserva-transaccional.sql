-- Creación de pedidos y reserva de inventario atómicas.
--
-- El checkout y el panel antes escribían `pedidos`, `pedido_items` y
-- `stock_movimientos` en consultas separadas. Una falla entre ellas dejaba
-- pedidos incompletos, y dos compradores podían leer el mismo stock antes de
-- que cualquiera alcanzara a reservarlo. Esta función es la única frontera
-- transaccional para crear un pedido pendiente.

create or replace function public.crear_pedido_con_reserva_stock(
  p_pedido jsonb,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido pedidos%rowtype;
  v_item record;
  v_linea record;
  v_disponible numeric;
  v_subtotal numeric;
  v_clave_stock text;
begin
  if jsonb_typeof(p_pedido) <> 'object' or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('ok', false, 'error', 'El pedido no contiene líneas válidas');
  end if;

  -- Cada recurso de inventario obtiene un candado transaccional estable. Se
  -- toman ordenados para que dos bolsas con los mismos productos no se esperen
  -- mutuamente en distinto orden. También cubre productos sin variantes.
  for v_item in
    select producto_id, variante_id, sum(cantidad)::integer as cantidad
      from jsonb_to_recordset(p_items) as i(producto_id uuid, variante_id uuid, cantidad integer)
     where producto_id is not null
       and cantidad > 0
     group by producto_id, variante_id
     order by producto_id, variante_id nulls first
  loop
    v_clave_stock := v_item.producto_id::text || ':' || coalesce(v_item.variante_id::text, 'sin-variante');
    perform pg_advisory_xact_lock(hashtextextended(v_clave_stock, 0));
  end loop;

  -- Valida cada línea después de obtener sus candados. La disponibilidad no se
  -- toma de una vista: se calcula de los movimientos bajo el mismo bloqueo.
  for v_linea in
    select producto_id, variante_id, cantidad, precio_unitario, tramo_aplicado, subtotal_clp
      from jsonb_to_recordset(p_items) as i(
        producto_id uuid,
        variante_id uuid,
        cantidad integer,
        precio_unitario numeric,
        tramo_aplicado text,
        subtotal_clp numeric
      )
  loop
    if v_linea.producto_id is null
       or v_linea.cantidad is null or v_linea.cantidad < 1
       or v_linea.precio_unitario is null or v_linea.precio_unitario < 0
       or v_linea.subtotal_clp is null or v_linea.subtotal_clp <> v_linea.cantidad * v_linea.precio_unitario then
      return jsonb_build_object('ok', false, 'error', 'Una línea del pedido no es válida');
    end if;

    if not exists (select 1 from productos where id = v_linea.producto_id) then
      return jsonb_build_object('ok', false, 'error', 'Uno de los productos ya no existe');
    end if;

    if v_linea.variante_id is not null and not exists (
      select 1 from producto_variantes
       where id = v_linea.variante_id
         and producto_id = v_linea.producto_id
         and activo
    ) then
      return jsonb_build_object('ok', false, 'error', 'Una variante ya no está disponible');
    end if;

    if v_linea.variante_id is null and exists (
      select 1 from producto_variantes where producto_id = v_linea.producto_id and activo
    ) then
      return jsonb_build_object('ok', false, 'error', 'Debes elegir una variante para ese producto');
    end if;

  end loop;

  -- Las líneas repetidas se suman para la verificación: validar una por una
  -- permitiría que dos líneas de 3 unidades pasaran contra un stock de 5.
  for v_item in
    select producto_id, variante_id, sum(cantidad)::integer as cantidad
      from jsonb_to_recordset(p_items) as i(producto_id uuid, variante_id uuid, cantidad integer)
     group by producto_id, variante_id
  loop
    select coalesce(sum(cantidad), 0)
      into v_disponible
      from stock_movimientos
     where producto_id = v_item.producto_id
       and variante_id is not distinct from v_item.variante_id;

    if v_disponible < v_item.cantidad then
      return jsonb_build_object(
        'ok', false,
        'error', 'Stock insuficiente',
        'producto_id', v_item.producto_id,
        'variante_id', v_item.variante_id,
        'disponible', v_disponible
      );
    end if;
  end loop;

  select coalesce(sum(cantidad * precio_unitario), 0)
    into v_subtotal
    from jsonb_to_recordset(p_items) as i(cantidad integer, precio_unitario numeric);

  if (p_pedido->>'subtotal_clp')::numeric <> v_subtotal
     or (p_pedido->>'total_clp')::numeric <> v_subtotal + coalesce((p_pedido->>'envio_clp')::numeric, 0) then
    return jsonb_build_object('ok', false, 'error', 'Los totales del pedido no coinciden con sus líneas');
  end if;

  insert into pedidos (
    cliente_auth_id, cliente_nombre, cliente_email, cliente_fono, canal,
    estado, metodo_pago, subtotal_clp, envio_clp, total_clp, region, comuna,
    direccion, notas, atendido_por
  ) values (
    nullif(p_pedido->>'cliente_auth_id', '')::uuid,
    nullif(p_pedido->>'cliente_nombre', ''),
    nullif(p_pedido->>'cliente_email', ''),
    nullif(p_pedido->>'cliente_fono', ''),
    nullif(p_pedido->>'canal', ''),
    'pendiente',
    nullif(p_pedido->>'metodo_pago', ''),
    (p_pedido->>'subtotal_clp')::numeric,
    coalesce((p_pedido->>'envio_clp')::numeric, 0),
    (p_pedido->>'total_clp')::numeric,
    nullif(p_pedido->>'region', ''),
    nullif(p_pedido->>'comuna', ''),
    p_pedido->'direccion',
    nullif(p_pedido->>'notas', ''),
    nullif(p_pedido->>'atendido_por', '')::uuid
  ) returning * into v_pedido;

  for v_linea in
    select producto_id, variante_id, cantidad, precio_unitario, tramo_aplicado, subtotal_clp
      from jsonb_to_recordset(p_items) as i(
        producto_id uuid,
        variante_id uuid,
        cantidad integer,
        precio_unitario numeric,
        tramo_aplicado text,
        subtotal_clp numeric
      )
  loop
    insert into pedido_items (pedido_id, producto_id, variante_id, cantidad, precio_unitario, tramo_aplicado, subtotal_clp)
    values (v_pedido.id, v_linea.producto_id, v_linea.variante_id, v_linea.cantidad,
            v_linea.precio_unitario, v_linea.tramo_aplicado, v_linea.subtotal_clp);

    insert into stock_movimientos (producto_id, variante_id, tipo, cantidad, motivo, pedido_id, creado_por)
    values (v_linea.producto_id, v_linea.variante_id, 'reserva', -v_linea.cantidad,
            'Pedido #' || v_pedido.numero || ' · ' || coalesce(v_pedido.cliente_nombre, 'Cliente'),
            v_pedido.id, nullif(p_pedido->>'atendido_por', '')::uuid);
  end loop;

  return jsonb_build_object('ok', true, 'id', v_pedido.id, 'numero', v_pedido.numero);
end;
$$;

comment on function public.crear_pedido_con_reserva_stock is
  'Crea un pedido pendiente, sus líneas y sus reservas de stock en una transacción. Bloquea cada recurso de inventario de forma determinista y rechaza stock insuficiente.';

revoke all on function public.crear_pedido_con_reserva_stock(jsonb, jsonb) from public, anon, authenticated;

-- Supabase incluye el rol `service_role`; algunos proveedores compatibles no.
-- No se debe conceder EXECUTE a PUBLIC, anon ni authenticated. Si existe el
-- rol de servicio estándar, se habilita automáticamente; de lo contrario el
-- administrador debe concederlo al rol real asociado a su clave de servidor.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.crear_pedido_con_reserva_stock(jsonb, jsonb) to service_role;
  else
    raise warning 'El rol service_role no existe. Concede EXECUTE solo al rol usado por la clave de servidor de esta plataforma.';
  end if;
end;
$$;
