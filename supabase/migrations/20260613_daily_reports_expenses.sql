create extension if not exists pgcrypto;

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  report_date date not null,
  automatic_pf_profit_ars numeric(14, 2) not null default 0,
  manual_pf_adjustment_ars numeric(14, 2) not null default 0,
  automatic_currency_profit_ars numeric(14, 2) not null default 0,
  manual_currency_adjustment_ars numeric(14, 2) not null default 0,
  gross_profit_ars numeric(14, 2) not null default 0,
  expenses_ars numeric(14, 2) not null default 0,
  available_profit_ars numeric(14, 2) not null default 0,
  status text not null default 'abierto' check (status in ('abierto', 'cerrado', 'revisar')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, report_date)
);

create table if not exists public.report_adjustments (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references public.daily_reports (id) on delete cascade,
  adjustment_type text not null check (
    adjustment_type in (
      'pf_manual_positive',
      'pf_manual_negative',
      'currency_manual_positive',
      'currency_manual_negative'
    )
  ),
  amount_ars numeric(14, 2) not null check (amount_ars > 0),
  reason text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  annulled_at timestamptz,
  annulled_by uuid references public.profiles (id) on delete set null,
  annulment_reason text
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  date date not null,
  amount_ars numeric(14, 2) not null check (amount_ars > 0),
  category text not null,
  detail text not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'pagado', 'imputado', 'anulado')),
  paid_from text not null default 'otro' check (paid_from in ('caja', 'ganancia', 'cuenta', 'otro')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  annulled_at timestamptz,
  annulled_by uuid references public.profiles (id) on delete set null,
  annulment_reason text
);

create index if not exists idx_daily_reports_branch_date on public.daily_reports (branch_id, report_date desc);
create index if not exists idx_report_adjustments_report_id on public.report_adjustments (daily_report_id);
create index if not exists idx_expenses_branch_date on public.expenses (branch_id, date desc);
create index if not exists idx_expenses_status on public.expenses (status);
create index if not exists idx_expenses_category on public.expenses (category);

drop trigger if exists set_daily_reports_updated_at on public.daily_reports;
create trigger set_daily_reports_updated_at
before update on public.daily_reports
for each row execute function public.set_updated_at();

alter table public.daily_reports enable row level security;
alter table public.report_adjustments enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "daily_reports_read_authenticated" on public.daily_reports;
create policy "daily_reports_read_authenticated"
on public.daily_reports
for select
to authenticated
using (true);

drop policy if exists "daily_reports_write_admin_manager" on public.daily_reports;
create policy "daily_reports_write_admin_manager"
on public.daily_reports
for all
using (public.has_role('admin') or public.has_role('encargado'))
with check (public.has_role('admin') or public.has_role('encargado'));

drop policy if exists "report_adjustments_read_authenticated" on public.report_adjustments;
create policy "report_adjustments_read_authenticated"
on public.report_adjustments
for select
to authenticated
using (true);

drop policy if exists "report_adjustments_write_admin_manager" on public.report_adjustments;
create policy "report_adjustments_write_admin_manager"
on public.report_adjustments
for all
using (public.has_role('admin') or public.has_role('encargado'))
with check (public.has_role('admin') or public.has_role('encargado'));

drop policy if exists "expenses_read_authenticated" on public.expenses;
create policy "expenses_read_authenticated"
on public.expenses
for select
to authenticated
using (true);

drop policy if exists "expenses_write_admin_manager" on public.expenses;
create policy "expenses_write_admin_manager"
on public.expenses
for all
using (public.has_role('admin') or public.has_role('encargado'))
with check (public.has_role('admin') or public.has_role('encargado'));
