create index if not exists idx_bag_operations_bag_status_created_at
on public.bag_operations (bag_id, status, created_at desc);

create unique index if not exists idx_bag_daily_snapshots_bag_id_date
on public.bag_daily_snapshots (bag_id, date);

create index if not exists idx_bag_internal_transfers_origin_bag_id
on public.bag_internal_transfers (origin_bag_id);

create index if not exists idx_bag_internal_transfers_destination_bag_id
on public.bag_internal_transfers (destination_bag_id);

create index if not exists idx_bag_internal_transfers_status_created_at
on public.bag_internal_transfers (status, created_at desc);

create index if not exists idx_cash_daily_reports_status_created_at
on public.cash_daily_reports (status, created_at desc);

create index if not exists idx_daily_reports_status_created_at
on public.daily_reports (status, created_at desc);

create index if not exists idx_report_adjustments_created_at
on public.report_adjustments (created_at desc);

create index if not exists idx_report_adjustments_report_id_created_at
on public.report_adjustments (daily_report_id, created_at desc);

create index if not exists idx_report_adjustments_annulled_at
on public.report_adjustments (annulled_at desc);

create index if not exists idx_expenses_status_created_at
on public.expenses (status, created_at desc);

create index if not exists idx_expenses_annulled_at
on public.expenses (annulled_at desc);

create index if not exists idx_weekly_cash_closures_status_created_at
on public.weekly_cash_closures (status, created_at desc);

create index if not exists idx_weekly_cash_closure_lines_status_created_at
on public.weekly_cash_closure_lines (status, created_at desc);
