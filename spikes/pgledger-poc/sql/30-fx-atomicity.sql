\set ON_ERROR_STOP on

select spike_test.reset_fixture(1420000, 0);
select
  spike_test.account_id('Caja A / ARS') as caja_a_ars,
  spike_test.account_id('Caja A / USD') as caja_a_usd,
  spike_test.account_id('Clearing / ARS') as clearing_ars,
  spike_test.account_id('Clearing / USD') as clearing_usd
\gset

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select * from spike_api.execute_fx_purchase(
  'fx-purchase-success',
  :'caja_a_ars', :'caja_a_usd', :'clearing_ars', :'clearing_usd',
  1000, 1420, false
);
reset role;

select spike_test.assert_numeric(
  'FX purchase ARS balance',
  (select balance from public.pgledger_accounts where id = :'caja_a_ars'),
  0
);
select spike_test.assert_numeric(
  'FX purchase USD balance',
  (select balance from public.pgledger_accounts where id = :'caja_a_usd'),
  1000
);
select spike_test.assert_true(
  'FX purchase is one logical operation with two transfers',
  (select count(*) = 2 from spike_app.operation_transfers where operation_id = 'fx-purchase-success')
);
select spike_test.assert_true(
  'FX purchase produced four double-entry rows',
  (
    select count(*) = 4
    from public.pgledger_entries e
    join spike_app.operation_transfers links on links.pgledger_transfer_id = e.transfer_id
    where links.operation_id = 'fx-purchase-success'
  )
);
select spike_test.assert_true(
  'Each FX transfer has exactly two balanced entries',
  not exists (
    select links.pgledger_transfer_id
    from spike_app.operation_transfers links
    join public.pgledger_entries e on e.transfer_id = links.pgledger_transfer_id
    where links.operation_id = 'fx-purchase-success'
    group by links.pgledger_transfer_id
    having count(*) <> 2 or sum(e.amount) <> 0
  )
);

select spike_test.reset_fixture(1420000, 0);
select
  spike_test.account_id('Caja A / ARS') as rollback_caja_a_ars,
  spike_test.account_id('Caja A / USD') as rollback_caja_a_usd,
  spike_test.account_id('Clearing / ARS') as rollback_clearing_ars,
  spike_test.account_id('Clearing / USD') as rollback_clearing_usd
\gset

\set ON_ERROR_STOP off
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select * from spike_api.execute_fx_purchase(
  'fx-purchase-forced-failure',
  :'rollback_caja_a_ars', :'rollback_caja_a_usd', :'rollback_clearing_ars', :'rollback_clearing_usd',
  1000, 1420, true
);
reset role;
\set ON_ERROR_STOP on

select spike_test.assert_numeric(
  'Forced failure preserved ARS balance',
  (select balance from public.pgledger_accounts where id = :'rollback_caja_a_ars'),
  1420000
);
select spike_test.assert_numeric(
  'Forced failure preserved USD balance',
  (select balance from public.pgledger_accounts where id = :'rollback_caja_a_usd'),
  0
);
select spike_test.assert_true(
  'Forced failure rolled back domain operation',
  not exists (
    select 1 from spike_app.operations where operation_id = 'fx-purchase-forced-failure'
  )
);
select spike_test.assert_true(
  'Forced failure left no tagged ledger transfer',
  not exists (
    select 1
    from public.pgledger_transfers
    where metadata->>'operation_id' = 'fx-purchase-forced-failure'
  )
);
select 'FX_ATOMICITY_AND_ROLLBACK=PASS' as result;
