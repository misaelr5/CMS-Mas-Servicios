\set ON_ERROR_STOP on

create schema if not exists spike_test authorization spike_owner;
revoke all on schema spike_test from public, anon, authenticated;

create or replace function spike_test.account_id(p_name text)
returns text
language sql
stable
set search_path = pg_catalog, public
as $$
  select id from public.pgledger_accounts where name = p_name
$$;

create or replace function spike_test.reset_fixture(
  p_caja_a_ars numeric default 0,
  p_caja_a_usd numeric default 0
)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  caja_a_ars text;
  caja_a_usd text;
  funding_ars text;
  funding_usd text;
begin
  truncate table
    spike_app.operation_transfers,
    spike_app.operations,
    public.pgledger_entries,
    public.pgledger_transfers,
    public.pgledger_accounts;

  select id into caja_a_ars from public.pgledger_create_account('Caja A / ARS', 'ARS', false, true);
  select id into caja_a_usd from public.pgledger_create_account('Caja A / USD', 'USD', false, true);
  perform public.pgledger_create_account('Caja B / ARS', 'ARS', false, true);
  perform public.pgledger_create_account('Caja B / USD', 'USD', false, true);
  perform public.pgledger_create_account('Clearing / ARS', 'ARS', true, true);
  perform public.pgledger_create_account('Clearing / USD', 'USD', true, true);
  select id into funding_ars from public.pgledger_create_account('Funding / ARS', 'ARS', true, true);
  select id into funding_usd from public.pgledger_create_account('Funding / USD', 'USD', true, true);

  if p_caja_a_ars > 0 then
    perform public.pgledger_create_transfer(funding_ars, caja_a_ars, p_caja_a_ars);
  end if;
  if p_caja_a_usd > 0 then
    perform public.pgledger_create_transfer(funding_usd, caja_a_usd, p_caja_a_usd);
  end if;
end
$$;

create or replace function spike_test.assert_true(p_label text, p_condition boolean)
returns void
language plpgsql
as $$
begin
  if p_condition is not true then
    raise exception 'ASSERTION_FAILED: %', p_label;
  end if;
  raise notice 'PASS: %', p_label;
end
$$;

create or replace function spike_test.assert_numeric(p_label text, p_actual numeric, p_expected numeric)
returns void
language plpgsql
as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'ASSERTION_FAILED: %, expected %, got %', p_label, p_expected, p_actual;
  end if;
  raise notice 'PASS: % = %', p_label, p_actual;
end
$$;

alter function spike_test.account_id(text) owner to spike_owner;
alter function spike_test.reset_fixture(numeric, numeric) owner to spike_owner;
alter function spike_test.assert_true(text, boolean) owner to spike_owner;
alter function spike_test.assert_numeric(text, numeric, numeric) owner to spike_owner;
