create extension if not exists pgcrypto;

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, name)
);

create table if not exists public.bags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  base_limit_ars numeric(14, 2) not null default 0 check (base_limit_ars >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bag_assignments (
  id uuid primary key default gen_random_uuid(),
  bag_id uuid not null references public.bags (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (bag_id, user_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (
    entity_type in (
      'bag',
      'bag_operation',
      'cash_register',
      'cash_daily_report',
      'daily_report',
      'expense',
      'closure',
      'general'
    )
  ),
  entity_id uuid,
  entity_label text,
  entity_href text,
  title text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('normal', 'importante', 'urgente')),
  status text not null default 'abierta' check (status in ('abierta', 'resuelta', 'anulada')),
  created_by uuid references public.profiles (id) on delete set null,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  annulled_by uuid references public.profiles (id) on delete set null,
  annulled_at timestamptz,
  annul_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status <> 'anulada') or (annul_reason is not null and length(trim(annul_reason)) > 0)
  )
);

create index if not exists idx_cash_registers_branch_id on public.cash_registers (branch_id);
create index if not exists idx_bag_assignments_user_id on public.bag_assignments (user_id);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);
create index if not exists idx_audit_logs_actor on public.audit_logs (actor_id);
create index if not exists idx_notes_entity on public.notes (entity_type, entity_id);
create index if not exists idx_notes_priority_status on public.notes (priority, status);
create index if not exists idx_notes_created_at on public.notes (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_branches_updated_at on public.branches;
create trigger set_branches_updated_at
before update on public.branches
for each row execute function public.set_updated_at();

drop trigger if exists set_cash_registers_updated_at on public.cash_registers;
create trigger set_cash_registers_updated_at
before update on public.cash_registers
for each row execute function public.set_updated_at();

drop trigger if exists set_bags_updated_at on public.bags;
create trigger set_bags_updated_at
before update on public.bags
for each row execute function public.set_updated_at();

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

create or replace function public.has_role(target_role text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = target_role
  );
$$;

create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role
      from public.user_roles
      where user_id = auth.uid()
      limit 1
    ),
    'viewer'
  );
$$;

alter table public.branches enable row level security;
alter table public.cash_registers enable row level security;
alter table public.bags enable row level security;
alter table public.bag_assignments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notes enable row level security;

drop policy if exists "branches_read_authenticated" on public.branches;
create policy "branches_read_authenticated"
on public.branches
for select
to authenticated
using (true);

drop policy if exists "branches_admin_write" on public.branches;
create policy "branches_admin_write"
on public.branches
for all
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "cash_registers_read_authenticated" on public.cash_registers;
create policy "cash_registers_read_authenticated"
on public.cash_registers
for select
to authenticated
using (true);

drop policy if exists "cash_registers_admin_write" on public.cash_registers;
create policy "cash_registers_admin_write"
on public.cash_registers
for all
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "bags_read_authenticated" on public.bags;
create policy "bags_read_authenticated"
on public.bags
for select
to authenticated
using (true);

drop policy if exists "bags_admin_write" on public.bags;
create policy "bags_admin_write"
on public.bags
for all
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "bag_assignments_read_relevant" on public.bag_assignments;
create policy "bag_assignments_read_relevant"
on public.bag_assignments
for select
to authenticated
using (
  public.has_role('admin')
  or public.has_role('encargado')
  or public.has_role('viewer')
  or user_id = auth.uid()
);

drop policy if exists "bag_assignments_admin_write" on public.bag_assignments;
create policy "bag_assignments_admin_write"
on public.bag_assignments
for all
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "audit_logs_read_admin_encargado" on public.audit_logs;
create policy "audit_logs_read_admin_encargado"
on public.audit_logs
for select
to authenticated
using (public.has_role('admin') or public.has_role('encargado'));

drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;
create policy "audit_logs_insert_authenticated"
on public.audit_logs
for insert
to authenticated
with check (actor_id = auth.uid() or public.has_role('admin'));

drop policy if exists "notes_read_authenticated" on public.notes;
create policy "notes_read_authenticated"
on public.notes
for select
to authenticated
using (
  public.current_role() in ('admin', 'encargado', 'viewer')
  or created_by = auth.uid()
);

drop policy if exists "notes_insert_operational" on public.notes;
create policy "notes_insert_operational"
on public.notes
for insert
to authenticated
with check (
  public.current_role() in ('admin', 'encargado', 'cajero')
  and created_by = auth.uid()
);

drop policy if exists "notes_update_admin_encargado" on public.notes;
create policy "notes_update_admin_encargado"
on public.notes
for update
to authenticated
using (public.current_role() in ('admin', 'encargado'))
with check (public.current_role() in ('admin', 'encargado'));

insert into public.branches (id, name, slug, status)
values
  ('00000000-0000-4000-8000-000000000101', 'Centro', 'centro', 'active'),
  ('00000000-0000-4000-8000-000000000102', 'Terminal', 'terminal', 'active')
on conflict (slug) do update
set name = excluded.name,
    status = excluded.status;

insert into public.cash_registers (id, branch_id, name, slug, status)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'Lourdes', 'lourdes-centro', 'active'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'Vicky', 'vicky-centro', 'active'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000101', 'Antonella manana', 'antonella-manana-centro', 'active'),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000102', 'Roman', 'roman-terminal', 'active'),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000102', 'Anto tarde', 'anto-tarde-terminal', 'active')
on conflict (slug) do update
set branch_id = excluded.branch_id,
    name = excluded.name,
    status = excluded.status;

insert into public.bags (id, name, slug, base_limit_ars, status)
values
  ('00000000-0000-4000-8000-000000000301', 'Bolsa 1', 'bolsa-1', 2000000, 'active'),
  ('00000000-0000-4000-8000-000000000302', 'Bolsa 2', 'bolsa-2', 2000000, 'active'),
  ('00000000-0000-4000-8000-000000000303', 'Bolsa 3', 'bolsa-3', 2000000, 'active'),
  ('00000000-0000-4000-8000-000000000304', 'Bolsa 4', 'bolsa-4', 2000000, 'active'),
  ('00000000-0000-4000-8000-000000000305', 'Bolsa 5', 'bolsa-5', 5000000, 'active')
on conflict (slug) do update
set name = excluded.name,
    base_limit_ars = excluded.base_limit_ars,
    status = excluded.status;
