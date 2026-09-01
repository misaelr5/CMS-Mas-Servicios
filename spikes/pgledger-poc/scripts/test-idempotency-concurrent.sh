#!/bin/sh
set -eu

PSQL="psql -X -U spike_admin -d pgledger_spike"
ACTOR="11111111-1111-4111-8111-111111111111"

$PSQL -v ON_ERROR_STOP=1 -Atc "select spike_test.reset_fixture(0, 500);" >/dev/null
ids="$($PSQL -At -F '|' -c "
  select
    spike_test.account_id('Caja A / ARS'),
    spike_test.account_id('Caja A / USD'),
    spike_test.account_id('Clearing / ARS'),
    spike_test.account_id('Clearing / USD');
")"
IFS='|' read -r caja_ars caja_usd clearing_ars clearing_usd <<EOF
$ids
EOF

query="set role authenticated; set request.jwt.claim.sub='$ACTOR'; select * from spike_api.execute_fx_sale('test-sale-001','$caja_ars','$caja_usd','$clearing_ars','$clearing_usd',500,1470);"

$PSQL -v ON_ERROR_STOP=1 -At -c "$query" >/tmp/idempotency-a.out 2>&1 &
pid_a=$!
$PSQL -v ON_ERROR_STOP=1 -At -c "$query" >/tmp/idempotency-b.out 2>&1 &
pid_b=$!
wait "$pid_a"
wait "$pid_b"

result="$($PSQL -At -F '|' -c "
  select
    (select count(*) from spike_app.operations where operation_id='test-sale-001'),
    (select count(*) from spike_app.operation_transfers where operation_id='test-sale-001'),
    (select trim_scale(balance) from public.pgledger_accounts where id='$caja_usd'),
    (select trim_scale(balance) from public.pgledger_accounts where id='$caja_ars');
")"
IFS='|' read -r operations links usd_balance ars_balance <<EOF
$result
EOF

if [ "$operations" -ne 1 ] || [ "$links" -ne 2 ] || [ "$usd_balance" != "0" ] || [ "$ars_balance" != "735000" ]; then
  cat /tmp/idempotency-a.out
  cat /tmp/idempotency-b.out
  echo "concurrent idempotency failed operations=$operations links=$links usd=$usd_balance ars=$ars_balance" >&2
  exit 1
fi

echo "submit_a=$(tr '\n' ' ' </tmp/idempotency-a.out)"
echo "submit_b=$(tr '\n' ' ' </tmp/idempotency-b.out)"
echo "operations=$operations links=$links usd=$usd_balance ars=$ars_balance"
echo "IDEMPOTENCY_CONCURRENT=PASS"
