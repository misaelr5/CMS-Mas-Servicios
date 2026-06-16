alter table public.daily_reports
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid references public.profiles (id) on delete set null,
  add column if not exists close_note text;
