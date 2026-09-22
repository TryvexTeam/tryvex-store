-- Las reservas de un pedido abandonado tienen que soltarse solas.
--
-- Cada pedido web reserva sus unidades al confirmarse, para que dos personas
-- no compren el mismo stock. Pero si nadie paga, esa reserva no se liberaba
-- nunca: el inventario quedaba tomado por pedidos fantasma hasta que alguien
-- los cancelara a mano. Pasó de verdad — la tienda llegó a mostrar «Agotado»
-- con 33 unidades en bodega, porque 12 pedidos sin pagar tenían todo tomado.
--
-- Un pedido con pago declarado NO se toca: el cliente dice que transfirió y
-- eso lo revisa una persona. Cancelarle la compra a quien pagó sería peor que
-- el problema que se resuelve.

create or replace function expirar_pedidos_abandonados(p_horas int default 24)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido record;
  v_item record;
  v_cancelados bigint := 0;
  v_numeros bigint[] := '{}';
begin
  for v_pedido in
    select id, numero
      from pedidos
     where estado = 'pendiente'
       and pago_declarado_at is null
       and created_at < now() - make_interval(hours => p_horas)
     order by numero
     for update skip locked
  loop
    for v_item in select * from pedido_items where pedido_id = v_pedido.id loop
      insert into stock_movimientos (producto_id, variante_id, tipo, cantidad, motivo, pedido_id)
      values (v_item.producto_id, v_item.variante_id, 'liberacion', v_item.cantidad,
              'Pedido #' || v_pedido.numero || ' expiró sin pago', v_pedido.id);
    end loop;

    update pedidos
       set estado = 'cancelado',
           notas = coalesce(notas || ' · ', '') || 'Expiró sin pago tras ' || p_horas || ' horas',
           updated_at = now()
     where id = v_pedido.id;

    v_cancelados := v_cancelados + 1;
    v_numeros := v_numeros || v_pedido.numero;
  end loop;

  return jsonb_build_object('cancelados', v_cancelados, 'numeros', v_numeros);
end;
$$;

comment on function expirar_pedidos_abandonados is
  'Cancela pedidos pendientes sin pago declarado y devuelve sus unidades al stock. No toca los que dicen haber pagado: eso lo revisa una persona.';

-- Corre sola cada hora. Sin esto la función existe pero nadie la llama, y el
-- inventario se vuelve a llenar de reservas fantasma. Cada hora y no una vez
-- al día porque una unidad tomada por un pedido que nadie va a pagar es una
-- venta que no ocurre.
create extension if not exists pg_cron;

select cron.schedule(
  'expirar-pedidos-abandonados',
  '7 * * * *',
  $$select expirar_pedidos_abandonados(24)$$
);
