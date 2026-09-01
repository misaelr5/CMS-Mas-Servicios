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
  'test-sale-001',
  :'caja_a_ars', :'caja_a_usd', :'clearing_ars', :'clearing_usd',
  500, 1470
);
select * from spike_api.execute_fx_sale(
  'test-sale-001',
  :'caja_a_ars', :'caja_a_usd', :'clearing_ars', :'clearing_usd',
  500, 1470
);
reset role;

select spike_test.assert_true(
  'Duplicate submit created one operation',
  (select count(*) = 1 from spike_app.operations where operation_id = 'test-sale-001')
);
select spike_test.assert_true(
  'Duplicate submit created one effective FX batch',
  (select count(*) = 2 from spike_app.operation_transfers where operation_id = 'test-sale-001')
);
select spike_test.assert_numeric(
  'Duplicate submit debited USD once',
  (select balance from public.pgledger_accounts where id = :'caja_a_usd'),
  0
);
select spike_test.assert_numeric(
  'Duplicate submit credited ARS once',
  (select balance from public.pgledger_accounts where id = :'caja_a_ars'),
  735000
);

\set ON_ERROR_STOP off
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select * from spike_api.execute_fx_sale(
  'test-sale-001',
  :'caja_a_ars', :'caja_a_usd', :'clearing_ars', :'clearing_usd',
  400, 1470
);
reset role;
\set ON_ERROR_STOP on

select spike_test.assert_true(
  'Same key with different payload was rejected without new ledger rows',
  (select count(*) = 2 from spike_app.operation_transfers where operation_id = 'test-sale-001')
);
select 'IDEMPOTENCY_SEQUENTIAL=PASS' as result;
