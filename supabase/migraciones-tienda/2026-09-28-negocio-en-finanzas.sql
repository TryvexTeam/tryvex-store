-- Cada movimiento de finanzas dice de qué negocio viene.
--
-- La tienda y Tryvex Plataform (CRM) escriben en la misma tabla y la leen con
-- el mismo permiso (tengo_permiso('ver_finanzas')). Hasta ahora no había forma
-- de distinguir una venta de la tienda de un ingreso de la agencia. Ahora:
--   · negocio = 'Tryvex Store'   → todo lo que escribe la tienda
--   · negocio = 'Tryvex Agencia' → lo registrado en el CRM (valor por defecto)
-- Los 9 movimientos existentes al 2026-09-28 eran todos de la tienda (ventas
-- de pedidos e importación de stock), y se marcan como tales.

alter table public.movimientos_financieros
  add column if not exists negocio text not null default 'Tryvex Agencia'
  check (char_length(negocio) between 2 and 40);

update public.movimientos_financieros set negocio = 'Tryvex Store'
 where descripcion like 'Pedido #%' or categoria in ('Importación', 'Venta');

create index if not exists movimientos_financieros_negocio_fecha_idx
  on public.movimientos_financieros (negocio, fecha desc);

-- La venta confirmada por pago queda marcada como de la tienda.
CREATE OR REPLACE FUNCTION public.confirmar_pago_pedido(p_numero bigint, p_proveedor text, p_referencia text, p_total numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  insert into movimientos_financieros (tipo, categoria, descripcion, monto_clp, fecha, metodo_pago, contraparte, negocio)
  values ('ingreso', 'Venta',
          'Pedido #' || v_pedido.numero || ' · ' || v_pedido.cliente_nombre,
          v_pedido.total_clp, current_date,
          coalesce(v_pedido.metodo_pago, p_proveedor), v_pedido.cliente_nombre, 'Tryvex Store')
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
$function$;
