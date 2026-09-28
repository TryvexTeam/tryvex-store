-- Conciliación periódica de pagos de Mercado Pago (aplicada el 2026-09-28).
--
-- Cada 5 minutos, pg_cron llama por pg_net a /api/pagos/conciliar, que le
-- pregunta a Mercado Pago por cada pedido pendiente con order `ORD…` y confirma
-- los acreditados. Existe porque el aviso del webhook dejó de llegar entre el
-- 22 y el 27 de septiembre de 2026: esto no depende de él.
--
-- El secreto NO va en este archivo ni en el texto del trabajo: vive en el
-- Vault con el nombre `conciliar_pagos` y debe ser igual a CONCILIAR_SECRET de
-- Vercel. Para crearlo o rotarlo (valor por stdin, no por línea de comandos):
--   select vault.create_secret('<valor>', 'conciliar_pagos', '...');
--   select vault.update_secret((select id from vault.secrets where name = 'conciliar_pagos'), '<valor>');

select cron.schedule(
  'conciliar-pagos-mercadopago',
  '*/5 * * * *',
  $cmd$
  select net.http_post(
    url := 'https://store.tryvex.tech/api/pagos/conciliar',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'conciliar_pagos'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cmd$
);
