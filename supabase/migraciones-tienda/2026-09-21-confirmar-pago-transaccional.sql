-- Confirmación de pago atómica.
--
-- Antes esto vivía en la aplicación: leía el pedido, insertaba el ingreso en
-- finanzas, movía el stock y recién al final cambiaba el estado con un
-- `.eq('estado','pendiente')`. Ese filtro impedía que dos procesos dejaran el
-- pedido pagado dos veces, pero no impedía que ambos llegaran hasta ahí
-- habiendo insertado ya su ingreso y su descuento de stock.
--
-- Mercado Pago manda varias notificaciones por pago y reintenta hasta recibir
-- un 200, así que dos avisos simultáneos no son una hipótesis.
--
-- Aquí el `select ... for update` bloquea la fila del pedido: el segundo aviso
-- espera, y cuando entra ve que el pedido ya no está pendiente y se va sin
-- tocar nada. Todo ocurre en una transacción: o se aplica completo, o nada.

create or replace function confirmar_pago_pedido(
  p_numero bigint,
  p_proveedor text,
  p_referencia text,
  p_total numeric default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido pedidos%rowtype;
  v_movimiento_id uuid;
  v_item record;
begin
  -- El bloqueo es lo que vuelve seguro todo lo que viene después.
  select * into v_pedido from pedidos where numero = p_numero for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'El pedido no existe');
  end if;

  -- Ya confirmado por un aviso anterior: se responde bien sin repetir nada.
  if v_pedido.estado <> 'pendiente' then
    return jsonb_build_object('ok', true, 'aplicado', false, 'numero', v_pedido.numero);
  end if;

  -- El monto cobrado tiene que ser el del pedido. Si no calza no se despacha:
  -- queda anotado para que lo mire una persona.
  if p_total is not null and round(p_total) <> round(v_pedido.total_clp) then
    update pedidos
       set pago_proveedor = p_proveedor,
           pago_referencia = p_referencia,
           notas = 'REVISAR: se cobraron $' || round(p_total)::text ||
                   ' y el pedido dice $' || round(v_pedido.total_clp)::text,
           updated_at = now()
     where id = v_pedido.id;
    return jsonb_build_object('ok', false, 'error', 'El monto cobrado no calza con el pedido');
  end if;

  insert into movimientos_financieros (tipo, categoria, descripcion, monto_clp, fecha, metodo_pago, contraparte)
  values ('ingreso', 'Venta',
          'Pedido #' || v_pedido.numero || ' · ' || v_pedido.cliente_nombre,
          v_pedido.total_clp, current_date,
          coalesce(v_pedido.metodo_pago, p_proveedor), v_pedido.cliente_nombre)
  returning id into v_movimiento_id;

  -- La reserva se libera y se registra la venta: dos filas, para que el
  -- historial de stock cuente lo que pasó de verdad.
  for v_item in select * from pedido_items where pedido_id = v_pedido.id loop
    insert into stock_movimientos (producto_id, variante_id, tipo, cantidad, motivo, pedido_id)
    values (v_item.producto_id, v_item.variante_id, 'liberacion', v_item.cantidad,
            'Pedido #' || v_pedido.numero || ' pagado con ' || p_proveedor, v_pedido.id);

    insert into stock_movimientos (producto_id, variante_id, tipo, cantidad, precio_unitario,
                                   total_clp, motivo, pedido_id, movimiento_id)
    values (v_item.producto_id, v_item.variante_id, 'venta', -v_item.cantidad, v_item.precio_unitario,
            v_item.cantidad * v_item.precio_unitario,
            'Pedido #' || v_pedido.numero || ' · ' || v_pedido.cliente_nombre,
            v_pedido.id, v_movimiento_id);
  end loop;

  update pedidos
     set estado = 'pagado',
         pagado_at = now(),
         pago_proveedor = p_proveedor,
         pago_referencia = p_referencia,
         updated_at = now()
   where id = v_pedido.id;

  return jsonb_build_object('ok', true, 'aplicado', true, 'numero', v_pedido.numero);
end;
$$;

comment on function confirmar_pago_pedido is
  'Da un pedido por pagado en una sola transacción, con la fila bloqueada. Idempotente: un segundo aviso del mismo pago no duplica el ingreso ni el stock.';

-- Cinturón sobre el tirante: un mismo pago no puede quedar en dos pedidos.
create unique index if not exists pedidos_pago_referencia_key
  on pedidos (pago_proveedor, pago_referencia)
  where pago_referencia is not null;
