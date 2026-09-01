#!/bin/sh
set -eu

PSQL="psql -X -U spike_admin -d pgledger_spike"
ACTOR="11111111-1111-4111-8111-111111111111"

round=1
while [ "$round" -le 10 ]; do
  $PSQL -v ON_ERROR_STOP=1 -Atc "select spike_test.reset_fixture(0, 1000);" >/dev/null

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

  query_a="set role authenticated; set request.jwt.claim.sub='$ACTOR'; select * from spike_api.execute_fx_sale('concurrency-$round-a','$caja_ars','$caja_usd','$clearing_ars','$clearing_usd',800,1470);"
  query_b="set role authenticated; set request.jwt.claim.sub='$ACTOR'; select * from spike_api.execute_fx_sale('concurrency-$round-b','$caja_ars','$caja_usd','$clearing_ars','$clearing_usd',500,1470);"

  set +e
  $PSQL -v ON_ERROR_STOP=1 -c "$query_a" >/tmp/concurrency-a.out 2>&1 &
  pid_a=$!
  $PSQL -v ON_ERROR_STOP=1 -c "$query_b" >/tmp/concurrency-b.out 2>&1 &
  pid_b=$!
  wait "$pid_a"
  rc_a=$?
  wait "$pid_b"
  rc_b=$?
  set -e

  successes=0
  [ "$rc_a" -eq 0 ] && successes=$((successes + 1))
  [ "$rc_b" -eq 0 ] && successes=$((successes + 1))
  if [ "$successes" -ne 1 ]; then
    cat /tmp/concurrency-a.out
    cat /tmp/concurrency-b.out
    echo "round=$round expected_one_success rc_a=$rc_a rc_b=$rc_b" >&2
    exit 1
  fi

  result="$($PSQL -At -F '|' -c "
    select
      (select balance from public.pgledger_accounts where id='$caja_usd'),
      (select count(*) from spike_app.operations where operation_id like 'concurrency-$round-%'),
      (select coalesce(sum((request_payload->>'amount_usd')::numeric),0) from spike_app.operations where operation_id like 'concurrency-$round-%');
  ")"
  IFS='|' read -r balance operations sold <<EOF
$result
EOF

  if [ "$operations" -ne 1 ]; then
    echo "round=$round expected_one_operation got=$operations" >&2
    exit 1
  fi
  if [ "$balance" != "200" ] && [ "$balance" != "500" ]; then
    echo "round=$round invalid_balance=$balance" >&2
    exit 1
  fi
  if [ "$sold" != "800" ] && [ "$sold" != "500" ]; then
    echo "round=$round invalid_sold=$sold" >&2
    exit 1
  fi

  failure_file=/tmp/concurrency-a.out
  [ "$rc_b" -ne 0 ] && failure_file=/tmp/concurrency-b.out
  error_line="$(grep -m1 'ERROR:' "$failure_file" || true)"
  echo "round=$round rc_a=$rc_a rc_b=$rc_b final_usd=$balance sold=$sold operations=$operations failure=[$error_line]"
  round=$((round + 1))
done

echo "CONCURRENCY_10_ROUNDS=PASS"
