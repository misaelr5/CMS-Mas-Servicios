create table if not exists public.weekly_cash_closures (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null unique,
  week_end_date date not null,
  status text not null default 'abierto' check (status in ('abierto', 'cerrado', 'revisar')),
  total_operated_ars numeric(14, 2) not null default 0,
  total_profit_ars numeric(14, 2) not null default 0,
  center_profit_ars numeric(14, 2) not null default 0,
  terminal_profit_ars numeric(14, 2) not null default 0,
  notes text,
  closed_at timestamptz,
  closed_by uuid references public.profiles (id) on delete set null,
  reopened_at timestamptz,
  reopened_by uuid references public.profiles (id) on delete set null,
  reopen_reason text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_cash_closure_lines (
  id uuid primary key default gen_random_uuid(),
  weekly_cash_closure_id uuid not null references public.weekly_cash_closures (id) on delete cascade,
  cash_register_id uuid not null references public.cash_registers (id) on delete restrict,
  branch_id uuid not null references public.branches (id) on delete restrict,
  total_operated_ars numeric(14, 2) not null default 0,
  total_profit_ars numeric(14, 2) not null default 0,
  loaded_days_count integer not null default 0,
  pending_days_count integer not null default 0,
  reviewed_days_count integer not null default 0,
  status text not null default 'abierto' check (status in ('abierto', 'cerrado', 'revisar')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (weekly_cash_closure_id, cash_register_id)
);

create index if not exists idx_weekly_cash_closures_week_start_date on public.weekly_cash_closures (week_start_date desc);
create index if not exists idx_weekly_cash_closure_lines_closure_id on public.weekly_cash_closure_lines (weekly_cash_closure_id);
create index if not exists idx_weekly_cash_closure_lines_register_id on public.weekly_cash_closure_lines (cash_register_id);

drop trigger if exists set_weekly_cash_closures_updated_at on public.weekly_cash_closures;
create trigger set_weekly_cash_closures_updated_at
before update on public.weekly_cash_closures
for each row execute function public.set_updated_at();

drop trigger if exists set_weekly_cash_closure_lines_updated_at on public.weekly_cash_closure_lines;
create trigger set_weekly_cash_closure_lines_updated_at
before update on public.weekly_cash_closure_lines
for each row execute function public.set_updated_at();

create or replace function public.weekly_cash_closure_week_start(target_date date)
returns date
language sql
immutable
as $$
  select (target_date - ((extract(dow from target_date)::int - 5 + 7) % 7))::date;
$$;

create or replace function public.is_weekly_cash_closure_locked(target_date date)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.weekly_cash_closures
    where week_start_date = public.weekly_cash_closure_week_start(target_date)
      and status = 'cerrado'
  );
$$;

create or replace function public.prevent_weekly_cash_closure_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_date_value date;
begin
  if tg_table_name = 'cash_daily_reports' then
    report_date_value := new.report_date;
  else
    select cdr.report_date
      into report_date_value
    from public.cash_daily_reports cdr
    where cdr.id = new.cash_daily_report_id;
  end if;

  if report_date_value is not null and public.is_weekly_cash_closure_locked(report_date_value) then
    raise exception 'Esta semana esta cerrada. Reabrila para modificarla.';
  end if;

  return new;
end;
$$;

drop trigger if exists weekly_cash_closure_lock_cash_daily_reports on public.cash_daily_reports;
create trigger weekly_cash_closure_lock_cash_daily_reports
before insert or update on public.cash_daily_reports
for each row execute function public.prevent_weekly_cash_closure_edit();

drop trigger if exists weekly_cash_closure_lock_cash_daily_report_lines on public.cash_daily_report_lines;
create trigger weekly_cash_closure_lock_cash_daily_report_lines
before insert or update on public.cash_daily_report_lines
for each row execute function public.prevent_weekly_cash_closure_edit();

alter table public.weekly_cash_closures enable row level security;
alter table public.weekly_cash_closure_lines enable row level security;

drop policy if exists "weekly_cash_closures_read_authenticated" on public.weekly_cash_closures;
create policy "weekly_cash_closures_read_authenticated"
on public.weekly_cash_closures
for select
to authenticated
using (true);

drop policy if exists "weekly_cash_closures_write_admin_manager" on public.weekly_cash_closures;
create policy "weekly_cash_closures_write_admin_manager"
on public.weekly_cash_closures
for all
using (public.has_role('admin') or public.has_role('encargado'))
with check (public.has_role('admin') or public.has_role('encargado'));

drop policy if exists "weekly_cash_closure_lines_read_authenticated" on public.weekly_cash_closure_lines;
create policy "weekly_cash_closure_lines_read_authenticated"
on public.weekly_cash_closure_lines
for select
to authenticated
using (true);

drop policy if exists "weekly_cash_closure_lines_write_admin_manager" on public.weekly_cash_closure_lines;
create policy "weekly_cash_closure_lines_write_admin_manager"
on public.weekly_cash_closure_lines
for all
using (public.has_role('admin') or public.has_role('encargado'))
with check (public.has_role('admin') or public.has_role('encargado'));
