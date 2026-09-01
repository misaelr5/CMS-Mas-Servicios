\set ON_ERROR_STOP on

-- Supabase roles and auth.uid() shim for an isolated vanilla PostgreSQL test.
-- In production Supabase owns these objects and PostgREST validates the JWT.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'spike_owner') then
    create role spike_owner nologin;
  end if;
end
$$;

create schema if not exists auth;
revoke all on schema auth from public;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

revoke all on function auth.uid() from public;
grant usage on schema auth to authenticated, spike_owner;
grant execute on function auth.uid() to authenticated, spike_owner;

create schema if not exists spike_app authorization spike_owner;
create schema if not exists spike_api authorization spike_owner;
revoke all on schema spike_app from public, anon, authenticated;
revoke all on schema spike_api from public, anon;
grant usage on schema spike_api to authenticated;

create table spike_app.operations (
  operation_id text primary key,
  operation_kind text not null check (
    operation_kind in ('fx_purchase', 'fx_sale', 'internal_transfer', 'reversal')
  ),
  actor_user_id uuid not null,
  request_payload jsonb not null,
  reversal_of text references spike_app.operations(operation_id) on delete restrict,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  created_at timestamptz not null default clock_timestamp(),
  confirmed_at timestamptz
);

create unique index one_reversal_per_operation
  on spike_app.operations(reversal_of)
  where reversal_of is not null;

create table spike_app.operation_transfers (
  operation_id text not null references spike_app.operations(operation_id) on delete restrict,
  sequence integer not null check (sequence > 0),
  pgledger_transfer_id text not null unique references public.pgledger_transfers(id) on delete restrict,
  primary key (operation_id, sequence)
);

alter table spike_app.operations enable row level security;
alter table spike_app.operation_transfers enable row level security;
alter table spike_app.operations owner to spike_owner;
alter table spike_app.operation_transfers owner to spike_owner;
alter index spike_app.one_reversal_per_operation owner to spike_owner;

-- Raw pgledger remains callable only by the no-login owner used by wrappers.
revoke create on schema public from public, anon, authenticated;
revoke all on all tables in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant usage on schema public to spike_owner;
grant select, insert, update on all tables in schema public to spike_owner;
grant execute on all functions in schema public to spike_owner;

create or replace function spike_app.claim_operation(
  p_operation_id text,
  p_operation_kind text,
  p_actor_user_id uuid,
  p_request_payload jsonb,
  p_reversal_of text default null,
  p_reason text default null
)
returns boolean
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  inserted_id text;
  existing spike_app.operations%rowtype;
begin
  insert into spike_app.operations (
    operation_id,
    operation_kind,
    actor_user_id,
    request_payload,
    reversal_of,
    reason
  )
  values (
    p_operation_id,
    p_operation_kind,
    p_actor_user_id,
    p_request_payload,
    p_reversal_of,
    p_reason
  )
  on conflict (operation_id) do nothing
  returning operation_id into inserted_id;

  if inserted_id is not null then
    return true;
  end if;

  select *
  into existing
  from spike_app.operations
  where operation_id = p_operation_id;

  if existing.operation_kind <> p_operation_kind
     or existing.request_payload <> p_request_payload
     or existing.reversal_of is distinct from p_reversal_of then
    raise exception 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD: %', p_operation_id
      using errcode = '22023';
  end if;

  if existing.status <> 'confirmed' then
    raise exception 'IDEMPOTENT_OPERATION_NOT_CONFIRMED: %', p_operation_id
      using errcode = '40001';
  end if;

  return false;
end
$$;

alter function spike_app.claim_operation(text, text, uuid, jsonb, text, text) owner to spike_owner;
revoke all on function spike_app.claim_operation(text, text, uuid, jsonb, text, text) from public, anon, authenticated;

create or replace function spike_api.execute_fx_purchase(
  p_operation_id text,
  p_cash_ars_account text,
  p_cash_usd_account text,
  p_clearing_ars_account text,
  p_clearing_usd_account text,
  p_amount_usd numeric,
  p_rate_ars numeric,
  p_force_second_leg_failure boolean default false
)
returns table(operation_id text, replayed boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := auth.uid();
  total_ars numeric;
  payload jsonb;
  is_new boolean;
  movement record;
  movement_sequence integer := 0;
  usd_destination text;
begin
  if actor is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000';
  end if;
  if p_amount_usd <= 0 or p_rate_ars <= 0 then
    raise exception 'AMOUNT_AND_RATE_MUST_BE_POSITIVE' using errcode = '22023';
  end if;
  if round(p_amount_usd, 4) <> p_amount_usd or round(p_rate_ars, 4) <> p_rate_ars then
    raise exception 'INVALID_MONETARY_SCALE' using errcode = '22023';
  end if;

  total_ars := round(p_amount_usd * p_rate_ars, 2);
  payload := jsonb_build_object(
    'cash_ars_account', p_cash_ars_account,
    'cash_usd_account', p_cash_usd_account,
    'clearing_ars_account', p_clearing_ars_account,
    'clearing_usd_account', p_clearing_usd_account,
    'amount_usd', p_amount_usd,
    'rate_ars', p_rate_ars,
    'total_ars', total_ars
  );

  is_new := spike_app.claim_operation(
    p_operation_id,
    'fx_purchase',
    actor,
    payload
  );

  if not is_new then
    return query select p_operation_id, true;
    return;
  end if;

  usd_destination := case
    when p_force_second_leg_failure then p_cash_ars_account
    else p_cash_usd_account
  end;

  for movement in
    select *
    from public.pgledger_create_transfers(
      array[
        row(p_cash_ars_account, p_clearing_ars_account, total_ars)::public.transfer_request,
        row(p_clearing_usd_account, usd_destination, p_amount_usd)::public.transfer_request
      ],
      clock_timestamp(),
      jsonb_build_object('operation_id', p_operation_id, 'kind', 'fx_purchase')
    )
  loop
    movement_sequence := movement_sequence + 1;
    insert into spike_app.operation_transfers(operation_id, sequence, pgledger_transfer_id)
    values (p_operation_id, movement_sequence, movement.id);
  end loop;

  update spike_app.operations
  set status = 'confirmed', confirmed_at = clock_timestamp()
  where spike_app.operations.operation_id = p_operation_id;

  return query select p_operation_id, false;
end
$$;

create or replace function spike_api.execute_fx_sale(
  p_operation_id text,
  p_cash_ars_account text,
  p_cash_usd_account text,
  p_clearing_ars_account text,
  p_clearing_usd_account text,
  p_amount_usd numeric,
  p_rate_ars numeric
)
returns table(operation_id text, replayed boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := auth.uid();
  total_ars numeric;
  payload jsonb;
  is_new boolean;
  movement record;
  movement_sequence integer := 0;
begin
  if actor is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000';
  end if;
  if p_amount_usd <= 0 or p_rate_ars <= 0 then
    raise exception 'AMOUNT_AND_RATE_MUST_BE_POSITIVE' using errcode = '22023';
  end if;
  if round(p_amount_usd, 4) <> p_amount_usd or round(p_rate_ars, 4) <> p_rate_ars then
    raise exception 'INVALID_MONETARY_SCALE' using errcode = '22023';
  end if;

  total_ars := round(p_amount_usd * p_rate_ars, 2);
  payload := jsonb_build_object(
    'cash_ars_account', p_cash_ars_account,
    'cash_usd_account', p_cash_usd_account,
    'clearing_ars_account', p_clearing_ars_account,
    'clearing_usd_account', p_clearing_usd_account,
    'amount_usd', p_amount_usd,
    'rate_ars', p_rate_ars,
    'total_ars', total_ars
  );

  is_new := spike_app.claim_operation(
    p_operation_id,
    'fx_sale',
    actor,
    payload
  );

  if not is_new then
    return query select p_operation_id, true;
    return;
  end if;

  for movement in
    select *
    from public.pgledger_create_transfers(
      array[
        row(p_cash_usd_account, p_clearing_usd_account, p_amount_usd)::public.transfer_request,
        row(p_clearing_ars_account, p_cash_ars_account, total_ars)::public.transfer_request
      ],
      clock_timestamp(),
      jsonb_build_object('operation_id', p_operation_id, 'kind', 'fx_sale')
    )
  loop
    movement_sequence := movement_sequence + 1;
    insert into spike_app.operation_transfers(operation_id, sequence, pgledger_transfer_id)
    values (p_operation_id, movement_sequence, movement.id);
  end loop;

  update spike_app.operations
  set status = 'confirmed', confirmed_at = clock_timestamp()
  where spike_app.operations.operation_id = p_operation_id;

  return query select p_operation_id, false;
end
$$;

create or replace function spike_api.execute_internal_transfer(
  p_operation_id text,
  p_from_account text,
  p_to_account text,
  p_amount numeric
)
returns table(operation_id text, replayed boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := auth.uid();
  payload jsonb;
  is_new boolean;
  movement record;
begin
  if actor is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000';
  end if;
  if p_amount <= 0 or round(p_amount, 4) <> p_amount then
    raise exception 'INVALID_TRANSFER_AMOUNT' using errcode = '22023';
  end if;

  payload := jsonb_build_object(
    'from_account', p_from_account,
    'to_account', p_to_account,
    'amount', p_amount
  );
  is_new := spike_app.claim_operation(
    p_operation_id,
    'internal_transfer',
    actor,
    payload
  );

  if not is_new then
    return query select p_operation_id, true;
    return;
  end if;

  select * into movement
  from public.pgledger_create_transfer(
    p_from_account,
    p_to_account,
    p_amount,
    clock_timestamp(),
    jsonb_build_object('operation_id', p_operation_id, 'kind', 'internal_transfer')
  );

  insert into spike_app.operation_transfers(operation_id, sequence, pgledger_transfer_id)
  values (p_operation_id, 1, movement.id);

  update spike_app.operations
  set status = 'confirmed', confirmed_at = clock_timestamp()
  where spike_app.operations.operation_id = p_operation_id;

  return query select p_operation_id, false;
end
$$;

create or replace function spike_api.reverse_operation(
  p_operation_id text,
  p_original_operation_id text,
  p_reason text
)
returns table(operation_id text, replayed boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := auth.uid();
  payload jsonb;
  is_new boolean;
  reverse_requests public.transfer_request[];
  movement record;
  movement_sequence integer := 0;
begin
  if actor is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'REVERSAL_REASON_REQUIRED' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from spike_app.operations
    where spike_app.operations.operation_id = p_original_operation_id
      and status = 'confirmed'
      and operation_kind <> 'reversal'
  ) then
    raise exception 'ORIGINAL_OPERATION_NOT_FOUND: %', p_original_operation_id
      using errcode = '22023';
  end if;

  payload := jsonb_build_object(
    'original_operation_id', p_original_operation_id,
    'reason', btrim(p_reason)
  );
  is_new := spike_app.claim_operation(
    p_operation_id,
    'reversal',
    actor,
    payload,
    p_original_operation_id,
    btrim(p_reason)
  );

  if not is_new then
    return query select p_operation_id, true;
    return;
  end if;

  select array_agg(
    row(t.to_account_id, t.from_account_id, t.amount)::public.transfer_request
    order by links.sequence
  )
  into reverse_requests
  from spike_app.operation_transfers links
  join public.pgledger_transfers t on t.id = links.pgledger_transfer_id
  where links.operation_id = p_original_operation_id;

  if coalesce(array_length(reverse_requests, 1), 0) = 0 then
    raise exception 'ORIGINAL_OPERATION_HAS_NO_TRANSFERS: %', p_original_operation_id
      using errcode = '22023';
  end if;

  for movement in
    select *
    from public.pgledger_create_transfers(
      reverse_requests,
      clock_timestamp(),
      jsonb_build_object(
        'operation_id', p_operation_id,
        'kind', 'reversal',
        'reversal_of', p_original_operation_id,
        'reason', btrim(p_reason)
      )
    )
  loop
    movement_sequence := movement_sequence + 1;
    insert into spike_app.operation_transfers(operation_id, sequence, pgledger_transfer_id)
    values (p_operation_id, movement_sequence, movement.id);
  end loop;

  update spike_app.operations
  set status = 'confirmed', confirmed_at = clock_timestamp()
  where spike_app.operations.operation_id = p_operation_id;

  return query select p_operation_id, false;
end
$$;

alter function spike_api.execute_fx_purchase(text, text, text, text, text, numeric, numeric, boolean) owner to spike_owner;
alter function spike_api.execute_fx_sale(text, text, text, text, text, numeric, numeric) owner to spike_owner;
alter function spike_api.execute_internal_transfer(text, text, text, numeric) owner to spike_owner;
alter function spike_api.reverse_operation(text, text, text) owner to spike_owner;

revoke all on all functions in schema spike_api from public, anon;
grant execute on all functions in schema spike_api to authenticated;
