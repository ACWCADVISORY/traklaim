-- ============================================================
-- Traklaim Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Companies
create table if not exists public.companies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Profiles (linked to auth.users)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  role         text not null default 'company' check (role in ('company', 'employee')),
  company_id   uuid references public.companies(id) on delete set null,
  employee_id  uuid, -- populated if role = 'employee', references employees.id
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Projects
create table if not exists public.projects (
  id                       uuid primary key default uuid_generate_v4(),
  company_id               uuid not null references public.companies(id) on delete cascade,
  name                     text not null,
  description              text,
  start_date               date,
  status                   text not null default 'Active' check (status in ('Active', 'Completed', 'On Hold')),
  sred_eligibility         text not null default 'Under Review' check (sred_eligibility in ('Eligible', 'Partially Eligible', 'Under Review', 'Not Eligible')),
  hypothesis               text,
  technological_uncertainty text,
  experimental_approach    text,
  outcome                  text,
  created_by               uuid references auth.users(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Employees
create table if not exists public.employees (
  id                    uuid primary key default uuid_generate_v4(),
  company_id            uuid not null references public.companies(id) on delete cascade,
  full_name             text not null,
  title                 text,
  employment_type       text not null default 'Full-time' check (employment_type in ('Full-time', 'Part-time', 'Contract')),
  annual_salary         numeric(12,2),
  sred_time_percentage  numeric(5,2) check (sred_time_percentage >= 0 and sred_time_percentage <= 100),
  is_specified_employee boolean not null default false,
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Employee time logs
create table if not exists public.employee_time_logs (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  employee_id         uuid not null references public.employees(id) on delete cascade,
  project_id          uuid not null references public.projects(id) on delete cascade,
  week_start          date not null,
  sred_hours          numeric(6,2) not null check (sred_hours >= 0),
  total_hours         numeric(6,2) check (total_hours >= 0),
  technical_obstacle  text,
  hypothesis_tested   text,
  notes               text,
  logged_by           uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Expenses
create table if not exists public.expenses (
  id                       uuid primary key default uuid_generate_v4(),
  company_id               uuid not null references public.companies(id) on delete cascade,
  project_id               uuid references public.projects(id) on delete set null,
  vendor                   text not null,
  description              text,
  category                 text not null check (category in ('Contractor Costs', 'Materials & Supplies', 'Equipment', 'Software & Cloud', 'Travel & Field Work', 'Other')),
  amount                   numeric(12,2) not null check (amount >= 0),
  date                     date not null,
  sred_eligible_percentage numeric(5,2) not null default 100 check (sred_eligible_percentage >= 0 and sred_eligible_percentage <= 100),
  receipt_url              text,
  contractor_sred_hours    numeric(8,2),
  notes                    text,
  created_by               uuid references auth.users(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Audit logs
create table if not exists public.audit_logs (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid references public.companies(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  user_email    text,
  action        text not null,
  resource_type text,
  resource_id   text,
  detail        jsonb,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- HELPER FUNCTION (SECURITY DEFINER)
-- ============================================================

create or replace function public.user_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid() limit 1;
$$;

-- ============================================================
-- AUTO-POPULATE COMPANY_ID ON INSERT (TRIGGERS)
-- ============================================================

create or replace function public.auto_set_company_id()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.company_id is null then
    new.company_id := public.user_company_id();
  end if;
  return new;
end;
$$;

create trigger trg_projects_company_id
  before insert on public.projects
  for each row execute function public.auto_set_company_id();

create trigger trg_employees_company_id
  before insert on public.employees
  for each row execute function public.auto_set_company_id();

create trigger trg_time_logs_company_id
  before insert on public.employee_time_logs
  for each row execute function public.auto_set_company_id();

create trigger trg_expenses_company_id
  before insert on public.expenses
  for each row execute function public.auto_set_company_id();

create trigger trg_audit_logs_company_id
  before insert on public.audit_logs
  for each row execute function public.auto_set_company_id();

-- ============================================================
-- AUTO-CREATE COMPANY + PROFILE ON SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_company_name text;
begin
  -- Check if profile already exists
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  -- Use company_name from metadata if provided, else email prefix
  v_company_name := coalesce(
    new.raw_user_meta_data->>'company_name',
    split_part(new.email, '@', 1) || '''s Company'
  );

  -- Create company
  insert into public.companies (name)
  values (v_company_name)
  returning id into v_company_id;

  -- Create profile
  insert into public.profiles (id, email, full_name, role, company_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'company',
    v_company_id
  );

  return new;
end;
$$;

-- Drop existing trigger if any, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.employees enable row level security;
alter table public.employee_time_logs enable row level security;
alter table public.expenses enable row level security;
alter table public.audit_logs enable row level security;

-- Drop all existing policies first (idempotent)
do $$ declare
  r record;
begin
  for r in
    select policyname, tablename from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Companies: users can see and update their own company
create policy "companies_select" on public.companies for select
  using (id = public.user_company_id());

create policy "companies_update" on public.companies for update
  using (id = public.user_company_id())
  with check (id = public.user_company_id());

-- Profiles: own profile only
create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or company_id = public.user_company_id());

create policy "profiles_update" on public.profiles for update
  using (id = auth.uid());

-- Projects: company-scoped
create policy "projects_select" on public.projects for select
  using (company_id = public.user_company_id());

create policy "projects_insert" on public.projects for insert
  with check (company_id = public.user_company_id());

create policy "projects_update" on public.projects for update
  using (company_id = public.user_company_id())
  with check (company_id = public.user_company_id());

create policy "projects_delete" on public.projects for delete
  using (company_id = public.user_company_id());

-- Employees: company-scoped
create policy "employees_select" on public.employees for select
  using (company_id = public.user_company_id());

create policy "employees_insert" on public.employees for insert
  with check (company_id = public.user_company_id());

create policy "employees_update" on public.employees for update
  using (company_id = public.user_company_id())
  with check (company_id = public.user_company_id());

create policy "employees_delete" on public.employees for delete
  using (company_id = public.user_company_id());

-- Time logs: company-scoped
create policy "time_logs_select" on public.employee_time_logs for select
  using (company_id = public.user_company_id());

create policy "time_logs_insert" on public.employee_time_logs for insert
  with check (company_id = public.user_company_id());

create policy "time_logs_update" on public.employee_time_logs for update
  using (company_id = public.user_company_id())
  with check (company_id = public.user_company_id());

create policy "time_logs_delete" on public.employee_time_logs for delete
  using (company_id = public.user_company_id());

-- Expenses: company-scoped
create policy "expenses_select" on public.expenses for select
  using (company_id = public.user_company_id());

create policy "expenses_insert" on public.expenses for insert
  with check (company_id = public.user_company_id());

create policy "expenses_update" on public.expenses for update
  using (company_id = public.user_company_id())
  with check (company_id = public.user_company_id());

create policy "expenses_delete" on public.expenses for delete
  using (company_id = public.user_company_id());

-- Audit logs: company members can read, anyone can insert their own
create policy "audit_logs_select" on public.audit_logs for select
  using (company_id = public.user_company_id());

create policy "audit_logs_insert" on public.audit_logs for insert
  with check (
    user_id = auth.uid()
    and (company_id is null or company_id = public.user_company_id())
  );

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_profiles_company_id on public.profiles(company_id);
create index if not exists idx_projects_company_id on public.projects(company_id);
create index if not exists idx_employees_company_id on public.employees(company_id);
create index if not exists idx_time_logs_company_id on public.employee_time_logs(company_id);
create index if not exists idx_time_logs_employee_id on public.employee_time_logs(employee_id);
create index if not exists idx_time_logs_week_start on public.employee_time_logs(week_start);
create index if not exists idx_expenses_company_id on public.expenses(company_id);
create index if not exists idx_audit_logs_company_id on public.audit_logs(company_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
