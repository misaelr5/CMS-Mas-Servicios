create extension if not exists pgcrypto;

alter table public.bag_operations
  add column if not exists internal_transfer_id uuid,
  add column if not exists related_operation_id uuid references public.bag_operations (id) on delete set null,
  add column if not exists is_internal boolean not null default false,
  add column if not exists affects_profit boolean not null default true;

create table if not exists public.bag_internal_transfers (
  id uuid primary key default gen_random_uuid(),
  origin_bag_id uuid not null references public.bags (id) on delete restrict,
  destination_bag_id uuid not null references public.bags (id) on delete restrict,
  origin_operation_id uuid references public.bag_operations (id) on delete set null,
  destination_operation_id uuid references public.bag_operations (id) on delete set null,
  amount_usd numeric(14, 4) not null check (amount_usd > 0),
  internal_rate_ars numeric(14, 4) not null check (internal_rate_ars > 0),
  total_ars numeric(14, 2) not null check (total_ars > 0),
  destination_payment_source text not null check (destination_payment_source in ('efectivo', 'cuenta')),
  origin_receive_destination text not null check (origin_receive_destination in ('efectivo', 'cuenta')),
  reason text not null check (length(trim(reason)) > 0),
  note text not null check (length(trim(note)) > 0),
  status text not null default 'confirmada' check (status in ('confirmada', 'anulada')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  annulled_at timestamptz,
  annulled_by uuid references public.profiles (id) on delete set null,
  annulment_reason text,
  check (origin_bag_id <> destination_bag_id)
);

alter table public.bag_operations
  drop constraint if exists bag_operations_internal_transfer_id_fkey;

alter table public.bag_operations
  add constraint bag_operations_internal_transfer_id_fkey
  foreign key (internal_transfer_id) references public.bag_internal_transfers (id) on delete set null;

create index if not exists idx_bag_operations_internal_transfer_id on public.bag_operations (internal_transfer_id);
create index if not exists idx_bag_operations_related_operation_id on public.bag_operations (related_operation_id);
create index if not exists idx_bag_internal_transfers_origin on public.bag_internal_transfers (origin_bag_id);
create index if not exists idx_bag_internal_transfers_destination on public.bag_internal_transfers (destination_bag_id);
create index if not exists idx_bag_internal_transfers_status on public.bag_internal_transfers (status);

drop trigger if exists set_bag_internal_transfers_updated_at on public.bag_internal_transfers;
create trigger set_bag_internal_transfers_updated_at
before update on public.bag_internal_transfers
for each row execute function public.set_updated_at();

alter table public.bag_internal_transfers enable row level security;

drop policy if exists "bag_internal_transfers_read_authenticated" on public.bag_internal_transfers;
create policy "bag_internal_transfers_read_authenticated"
on public.bag_internal_transfers
for select
to authenticated
using (true);

drop policy if exists "bag_internal_transfers_operational_write" on public.bag_internal_transfers;
create policy "bag_internal_transfers_operational_write"
on public.bag_internal_transfers
for all
to authenticated
using (public.current_role() in ('admin', 'encargado', 'cajero'))
with check (public.current_role() in ('admin', 'encargado', 'cajero'));

alter table public.notes
  drop constraint if exists notes_entity_type_check;

alter table public.notes
  add constraint notes_entity_type_check check (
    entity_type in (
      'bag',
      'bag_operation',
      'bag_internal_transfer',
      'cash_register',
      'cash_daily_report',
      'daily_report',
      'expense',
      'closure',
      'general'
    )
  );
