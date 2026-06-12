create extension if not exists pgcrypto;

alter table public.cash_registers
  add column if not exists register_number integer,
  add column if not exists responsible_user_id uuid references public.profiles (id) on delete set null;

update public.cash_registers
set
  branch_id = '00000000-0000-4000-8000-000000000101',
  register_number = 1,
  name = 'Lourdes',
  slug = 'caja-1-lourdes',
  status = 'active'
where id = '00000000-0000-4000-8000-000000000201';

update public.cash_registers
set
  branch_id = '00000000-0000-4000-8000-000000000101',
  register_number = 2,
  name = 'Victoria',
  slug = 'caja-2-victoria',
  status = 'active'
where id = '00000000-0000-4000-8000-000000000202';

update public.cash_registers
set
  branch_id = '00000000-0000-4000-8000-000000000101',
  register_number = 3,
  name = 'Antonella',
  slug = 'caja-3-antonella',
  status = 'active'
where id = '00000000-0000-4000-8000-000000000203';

update public.cash_registers
set
  branch_id = '00000000-0000-4000-8000-000000000102',
  register_number = 4,
  name = 'Román',
  slug = 'caja-4-roman',
  status = 'active'
where id = '00000000-0000-4000-8000-000000000204';

update public.cash_registers
set
  branch_id = '00000000-0000-4000-8000-000000000102',
  register_number = 5,
  name = 'Antonella',
  slug = 'caja-5-antonella',
  status = 'active'
where id = '00000000-0000-4000-8000-000000000205';

update public.cash_registers
set responsible_user_id = '25ab0e24-f36f-45b9-a1a8-81b9dfde328f'
where id = '00000000-0000-4000-8000-000000000201';

update public.cash_registers
set responsible_user_id = 'b4516776-938c-4863-a58e-e65fc4302502'
where id = '00000000-0000-4000-8000-000000000202';

update public.cash_registers
set responsible_user_id = '9c62754f-1710-4f58-b4fe-3a22cda0166a'
where id = '00000000-0000-4000-8000-000000000203';

update public.cash_registers
set responsible_user_id = 'ee188491-0332-45d0-b036-14a0e13cb037'
where id = '00000000-0000-4000-8000-000000000204';

update public.cash_registers
set responsible_user_id = 'cce9fc58-f0cd-4568-b7f0-2849445bf897'
where id = '00000000-0000-4000-8000-000000000205';

create table if not exists public.cash_report_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_daily_reports (
  id uuid primary key default gen_random_uuid(),
  cash_register_id uuid not null references public.cash_registers (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete restrict,
  report_date date not null,
  total_operated_ars numeric(14, 2) not null default 0 check (total_operated_ars >= 0),
  total_profit_ars numeric(14, 2) not null default 0,
  status text not null default 'pendiente' check (status in ('pendiente', 'parcial', 'cargado', 'revisado')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cash_register_id, report_date)
);

create table if not exists public.cash_daily_report_lines (
  id uuid primary key default gen_random_uuid(),
  cash_daily_report_id uuid not null references public.cash_daily_reports (id) on delete cascade,
  category_id uuid not null references public.cash_report_categories (id) on delete restrict,
  operated_amount_ars numeric(14, 2) not null default 0 check (operated_amount_ars >= 0),
  profit_amount_ars numeric(14, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cash_daily_report_id, category_id)
);

create index if not exists idx_cash_registers_register_number on public.cash_registers (register_number);
create index if not exists idx_cash_registers_responsible_user_id on public.cash_registers (responsible_user_id);
create index if not exists idx_cash_report_categories_sort_order on public.cash_report_categories (sort_order);
create index if not exists idx_cash_daily_reports_register_date on public.cash_daily_reports (cash_register_id, report_date desc);
create index if not exists idx_cash_daily_reports_branch_date on public.cash_daily_reports (branch_id, report_date desc);
create index if not exists idx_cash_daily_report_lines_report_id on public.cash_daily_report_lines (cash_daily_report_id);
create index if not exists idx_cash_daily_report_lines_category_id on public.cash_daily_report_lines (category_id);

drop trigger if exists set_cash_daily_reports_updated_at on public.cash_daily_reports;
create trigger set_cash_daily_reports_updated_at
before update on public.cash_daily_reports
for each row execute function public.set_updated_at();

drop trigger if exists set_cash_daily_report_lines_updated_at on public.cash_daily_report_lines;
create trigger set_cash_daily_report_lines_updated_at
before update on public.cash_daily_report_lines
for each row execute function public.set_updated_at();

insert into public.cash_report_categories (id, name, sort_order, active)
values
  ('00000000-0000-4000-8000-000000000401', 'Envíos internacionales', 1, true),
  ('00000000-0000-4000-8000-000000000402', 'Pagos internacionales', 2, true),
  ('00000000-0000-4000-8000-000000000403', 'Envíos nacionales', 3, true),
  ('00000000-0000-4000-8000-000000000404', 'Pagos nacionales', 4, true),
  ('00000000-0000-4000-8000-000000000405', 'Extracciones', 5, true),
  ('00000000-0000-4000-8000-000000000406', 'Billetera virtual', 6, true),
  ('00000000-0000-4000-8000-000000000407', 'Cobro facturas crédito', 7, true),
  ('00000000-0000-4000-8000-000000000408', 'Transferencia x efectivo', 8, true),
  ('00000000-0000-4000-8000-000000000409', 'Depósito CBU', 9, true),
  ('00000000-0000-4000-8000-000000000410', 'Impresiones / CUS-ISA / tickets', 10, true)
on conflict (name) do update
set sort_order = excluded.sort_order,
    active = excluded.active;

create or replace function public.is_cash_register_owner(register_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cash_registers
    where id = register_id
      and responsible_user_id = auth.uid()
  );
$$;

alter table public.cash_report_categories enable row level security;
alter table public.cash_daily_reports enable row level security;
alter table public.cash_daily_report_lines enable row level security;

drop policy if exists "cash_report_categories_read_authenticated" on public.cash_report_categories;
create policy "cash_report_categories_read_authenticated"
on public.cash_report_categories
for select
to authenticated
using (true);

drop policy if exists "cash_report_categories_admin_write" on public.cash_report_categories;
create policy "cash_report_categories_admin_write"
on public.cash_report_categories
for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "cash_daily_reports_read_authenticated" on public.cash_daily_reports;
create policy "cash_daily_reports_read_authenticated"
on public.cash_daily_reports
for select
to authenticated
using (true);

drop policy if exists "cash_daily_reports_write_admin_manager_owner" on public.cash_daily_reports;
create policy "cash_daily_reports_write_admin_manager_owner"
on public.cash_daily_reports
for all
using (
  public.has_role('admin')
  or public.has_role('encargado')
  or public.is_cash_register_owner(cash_register_id)
)
with check (
  public.has_role('admin')
  or public.has_role('encargado')
  or public.is_cash_register_owner(cash_register_id)
);

drop policy if exists "cash_daily_report_lines_read_authenticated" on public.cash_daily_report_lines;
create policy "cash_daily_report_lines_read_authenticated"
on public.cash_daily_report_lines
for select
to authenticated
using (true);

drop policy if exists "cash_daily_report_lines_write_admin_manager_owner" on public.cash_daily_report_lines;
create policy "cash_daily_report_lines_write_admin_manager_owner"
on public.cash_daily_report_lines
for all
using (
  public.has_role('admin')
  or public.has_role('encargado')
  or exists (
    select 1
    from public.cash_daily_reports
    where id = cash_daily_report_id
      and (public.has_role('admin') or public.has_role('encargado') or public.is_cash_register_owner(cash_register_id))
  )
)
with check (
  public.has_role('admin')
  or public.has_role('encargado')
  or exists (
    select 1
    from public.cash_daily_reports
    where id = cash_daily_report_id
      and (public.has_role('admin') or public.has_role('encargado') or public.is_cash_register_owner(cash_register_id))
  )
);

insert into public.cash_registers (id, branch_id, register_number, name, slug, status)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 1, 'Lourdes', 'caja-1-lourdes', 'active'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 2, 'Victoria', 'caja-2-victoria', 'active'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000101', 3, 'Antonella', 'caja-3-antonella', 'active'),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000102', 4, 'Román', 'caja-4-roman', 'active'),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000102', 5, 'Antonella', 'caja-5-antonella', 'active')
on conflict (id) do update
set branch_id = excluded.branch_id,
    register_number = excluded.register_number,
    name = excluded.name,
    slug = excluded.slug,
    status = excluded.status;
