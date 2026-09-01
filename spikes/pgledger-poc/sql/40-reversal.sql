\set ON_ERROR_STOP on

select spike_test.reset_fixture(0, 500);
select
  spike_test.account_id('Caja A / ARS') as caja_a_ars,
  spike_test.account_id('Caja A / USD') as caja_a_usd,
  spike_test.account_id('Clearing / ARS') as clearing_ars,
  spike_test.account_id('Clearing / USD') as clearing_usd
\gset

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select * from spike_api.execute_fx_sale(
  'sale-to-reverse',
  :'caja_a_ars', :'caja_a_usd', :'clearing_ars', :'clearing_usd',
  500, 1470
);
select * from spike_api.reverse_operation(
  'reversal-sale-to-reverse',
  'sale-to-reverse',
  'Cotización cargada incorrectamente'
);
reset role;

select spike_test.assert_numeric(
  'Reversal restored ARS balance',
  (select balance from public.pgledger_accounts where id = :'caja_a_ars'),
  0
);
select spike_test.assert_numeric(
  'Reversal restored USD balance',
  (select balance from public.pgledger_accounts where id = :'caja_a_usd'),
  500
);
select spike_test.assert_true(
  'Original and reversal remain visible',
  (
    select count(*) = 2
    from spike_app.operations
    where operation_id in ('sale-to-reverse', 'reversal-sale-to-reverse')
      and status = 'confirmed'
  )
);
select spike_test.assert_true(
  'Reversal points to original operation',
  exists (
    select 1
    from spike_app.operations
    where operation_id = 'reversal-sale-to-reverse'
      and reversal_of = 'sale-to-reverse'
      and reason = 'Cotización cargada incorrectamente'
  )
);
select spike_test.assert_true(
  'Original and reversal each have two ledger transfers',
  (
    select count(*) = 4
    from spike_app.operation_transfers
    where operation_id in ('sale-to-reverse', 'reversal-sale-to-reverse')
  )
);

select operation_id, operation_kind, reversal_of, reason, status
from spike_app.operations
order by created_at;
select 'REVERSAL=PASS' as result;
