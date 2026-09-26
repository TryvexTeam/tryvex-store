-- Las funciones de pago y limpieza solo las llama el servidor.
--
-- `confirmar_pago_pedido` marca un pedido como pagado, registra el ingreso y
-- descuenta stock. Era SECURITY DEFINER y ejecutable por `anon` vía
-- /rest/v1/rpc/confirmar_pago_pedido: con el número de un pedido (son
-- correlativos) y sin `p_total`, cualquiera podía darlo por pagado sin pagar.
--
-- La única llamada legítima es el webhook de Mercado Pago, con la clave de
-- servicio (lib/confirmar-pago.ts). Las otras dos las corre pg_cron.
-- Detectado por el Security Advisor; aplicado en producción el 2026-09-26.

revoke execute on function public.confirmar_pago_pedido(bigint, text, text, numeric) from public, anon, authenticated;
revoke execute on function public.expirar_pedidos_abandonados(integer) from public, anon, authenticated;
revoke execute on function public.limpiar_intentos_reserva_publica() from public, anon, authenticated;

grant execute on function public.confirmar_pago_pedido(bigint, text, text, numeric) to service_role;
grant execute on function public.expirar_pedidos_abandonados(integer) to service_role;
grant execute on function public.limpiar_intentos_reserva_publica() to service_role;
