-- Endurece lecturas y escrituras directas por RLS.
--
-- La app usa Server Actions con service role para las mutaciones principales,
-- pero el cliente autenticado tambien puede llamar la REST API de Supabase.
-- Estas policies evitan que un usuario autenticado lea o escriba datos
-- operativos fuera de su alcance.

create or replace function public.is_bag_assigned_to_current_user(target_bag_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bags b
    where b.id = target_bag_id
      and b.responsible_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.bag_assignments ba
    where ba.bag_id = target_bag_id
      and ba.user_id = auth.uid()
      and ba.status = 'active'
  );
$$;

create or replace function public.can_read_branch(target_branch_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_role() in ('admin', 'encargado', 'viewer')
    or exists (
      select 1
      from public.cash_registers cr
      where cr.branch_id = target_branch_id
        and cr.responsible_user_id = auth.uid()
    );
$$;

create or replace function public.can_read_cash_register(target_cash_register_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_role() in ('admin', 'encargado', 'viewer')
    or exists (
      select 1
      from public.cash_registers cr
      where cr.id = target_cash_register_id
        and cr.responsible_user_id = auth.uid()
    );
$$;

create or replace function public.can_read_bag(target_bag_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_role() in ('admin', 'encargado', 'viewer')
    or public.is_bag_assigned_to_current_user(target_bag_id);
$$;

create or replace function public.can_operate_bag(target_bag_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_role() in ('admin', 'encargado')
    or (
      public.current_role() = 'cajero'
      and public.is_bag_assigned_to_current_user(target_bag_id)
    );
$$;

drop policy if exists "branches_read_authenticated" on public.branches;
create policy "branches_read_scoped"
on public.branches
for select
to authenticated
using (public.can_read_branch(id));

drop policy if exists "cash_registers_read_authenticated" on public.cash_registers;
create policy "cash_registers_read_scoped"
on public.cash_registers
for select
to authenticated
using (public.can_read_cash_register(id));

drop policy if exists "bags_read_authenticated" on public.bags;
create policy "bags_read_scoped"
on public.bags
for select
to authenticated
using (public.can_read_bag(id));

drop policy if exists "bag_operations_read_authenticated" on public.bag_operations;
create policy "bag_operations_read_scoped"
on public.bag_operations
for select
to authenticated
using (public.can_read_bag(bag_id));

drop policy if exists "bag_operations_operational_write" on public.bag_operations;
create policy "bag_operations_operational_write_scoped"
on public.bag_operations
for all
to authenticated
using (public.can_operate_bag(bag_id))
with check (public.can_operate_bag(bag_id));

drop policy if exists "bag_snapshots_read_authenticated" on public.bag_daily_snapshots;
create policy "bag_snapshots_read_scoped"
on public.bag_daily_snapshots
for select
to authenticated
using (public.can_read_bag(bag_id));

drop policy if exists "bag_snapshots_operational_write" on public.bag_daily_snapshots;
create policy "bag_snapshots_operational_write_scoped"
on public.bag_daily_snapshots
for all
to authenticated
using (public.current_role() in ('admin', 'encargado'))
with check (public.current_role() in ('admin', 'encargado'));

drop policy if exists "bag_internal_transfers_read_authenticated" on public.bag_internal_transfers;
create policy "bag_internal_transfers_read_scoped"
on public.bag_internal_transfers
for select
to authenticated
using (
  public.current_role() in ('admin', 'encargado', 'viewer')
  or public.is_bag_assigned_to_current_user(origin_bag_id)
  or public.is_bag_assigned_to_current_user(destination_bag_id)
);

drop policy if exists "bag_internal_transfers_operational_write" on public.bag_internal_transfers;
create policy "bag_internal_transfers_operational_write_scoped"
on public.bag_internal_transfers
for all
to authenticated
using (public.can_operate_bag(origin_bag_id))
with check (public.can_operate_bag(origin_bag_id));

drop policy if exists "cash_report_categories_read_authenticated" on public.cash_report_categories;
create policy "cash_report_categories_read_roles"
on public.cash_report_categories
for select
to authenticated
using (public.current_role() in ('admin', 'encargado', 'cajero', 'viewer'));

drop policy if exists "cash_daily_reports_read_authenticated" on public.cash_daily_reports;
create policy "cash_daily_reports_read_scoped"
on public.cash_daily_reports
for select
to authenticated
using (public.can_read_cash_register(cash_register_id));

drop policy if exists "cash_daily_report_lines_read_authenticated" on public.cash_daily_report_lines;
create policy "cash_daily_report_lines_read_scoped"
on public.cash_daily_report_lines
for select
to authenticated
using (
  exists (
    select 1
    from public.cash_daily_reports cdr
    where cdr.id = cash_daily_report_id
      and public.can_read_cash_register(cdr.cash_register_id)
  )
);

drop policy if exists "daily_reports_read_authenticated" on public.daily_reports;
create policy "daily_reports_read_scoped"
on public.daily_reports
for select
to authenticated
using (public.can_read_branch(branch_id));

drop policy if exists "report_adjustments_read_authenticated" on public.report_adjustments;
create policy "report_adjustments_read_scoped"
on public.report_adjustments
for select
to authenticated
using (
  exists (
    select 1
    from public.daily_reports dr
    where dr.id = daily_report_id
      and public.can_read_branch(dr.branch_id)
  )
);

drop policy if exists "expenses_read_authenticated" on public.expenses;
create policy "expenses_read_scoped"
on public.expenses
for select
to authenticated
using (public.can_read_branch(branch_id));

drop policy if exists "weekly_cash_closures_read_authenticated" on public.weekly_cash_closures;
create policy "weekly_cash_closures_read_roles"
on public.weekly_cash_closures
for select
to authenticated
using (public.current_role() in ('admin', 'encargado', 'viewer'));

drop policy if exists "weekly_cash_closure_lines_read_authenticated" on public.weekly_cash_closure_lines;
create policy "weekly_cash_closure_lines_read_roles"
on public.weekly_cash_closure_lines
for select
to authenticated
using (public.current_role() in ('admin', 'encargado', 'viewer'));
