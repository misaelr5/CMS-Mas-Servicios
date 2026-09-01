#!/bin/sh
set -eu

PSQL="psql -X -U spike_admin -d pgledger_spike"
ACTOR="11111111-1111-4111-8111-111111111111"

$PSQL -v ON_ERROR_STOP=1 -Atc "select spike_test.reset_fixture(0, 100);" >/dev/null
ids="$($PSQL -At -F '|' -c "
  select
    spike_test.account_id('Caja A / USD'),
    spike_test.account_id('Caja B / USD');
")"
IFS='|' read -r caja_a_usd caja_b_usd <<EOF
$ids
EOF

expect_denied() {
  label="$1"
  query="$2"
  set +e
  output="$($PSQL -v ON_ERROR_STOP=1 -c "$query" 2>&1)"
  rc=$?
  set -e
  if [ "$rc" -eq 0 ]; then
    echo "$label unexpectedly succeeded" >&2
    echo "$output" >&2
    exit 1
  fi
  echo "$label=PASS error=[$(printf '%s' "$output" | grep -m1 'ERROR:' || true)]"
}

expect_denied "direct_table_read" "set role authenticated; select * from public.pgledger_accounts;"
expect_denied "direct_table_write" "set role authenticated; insert into public.pgledger_accounts(id,name,currency,balance,version,allow_negative_balance,allow_positive_balance,created_at,updated_at) values('bad','bad','USD',0,0,true,true,now(),now());"
expect_denied "direct_pgledger_function" "set role authenticated; select * from public.pgledger_create_transfer('$caja_a_usd','$caja_b_usd',1);"
expect_denied "wrapper_without_actor" "set role authenticated; select * from spike_api.execute_internal_transfer('rpc-no-actor','$caja_a_usd','$caja_b_usd',10);"

$PSQL -v ON_ERROR_STOP=1 -Atc "
  set role authenticated;
  set request.jwt.claim.sub='$ACTOR';
  select * from spike_api.execute_internal_transfer('rpc-authorized','$caja_a_usd','$caja_b_usd',10);
" >/tmp/rpc-authorized.out

result="$($PSQL -At -F '|' -c "
  select
    (select balance from public.pgledger_accounts where id='$caja_a_usd'),
    (select balance from public.pgledger_accounts where id='$caja_b_usd'),
    (select actor_user_id from spike_app.operations where operation_id='rpc-authorized');
")"
IFS='|' read -r balance_a balance_b actor <<EOF
$result
EOF

if [ "$balance_a" != "90" ] || [ "$balance_b" != "10" ] || [ "$actor" != "$ACTOR" ]; then
  echo "authorized wrapper failed balance_a=$balance_a balance_b=$balance_b actor=$actor" >&2
  exit 1
fi

echo "authorized_wrapper=PASS balance_a=$balance_a balance_b=$balance_b actor=$actor"
echo "RPC_ISOLATION=PASS"
