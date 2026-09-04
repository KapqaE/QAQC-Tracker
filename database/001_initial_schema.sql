-- QAQC Tracker: initial Supabase PostgreSQL schema
-- Run in the Supabase SQL Editor as the project owner.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  job_title text,
  company text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  project_code text not null unique,
  client text not null,
  location text not null,
  description text,
  start_date date,
  target_completion_date date,
  status text not null default 'Planning' check (status in ('Planning', 'Active', 'On Hold', 'Completed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  inspection_number text not null unique,
  project_id uuid not null references public.projects(id) on delete cascade,
  inspection_type text not null,
  discipline text not null check (discipline in ('Electrical', 'Mechanical', 'Civil', 'Architectural', 'Fire Alarm', 'BMS', 'Security', 'Commissioning')),
  area text not null,
  description text not null,
  inspector text not null,
  responsible_company text not null,
  planned_inspection_date date not null,
  actual_inspection_date date,
  status text not null default 'Planned' check (status in ('Planned', 'Requested', 'In Progress', 'Passed', 'Failed', 'Closed')),
  result text check (result is null or result in ('Accepted', 'Rejected', 'Conditional')),
  comments text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ncrs (
  id uuid primary key default gen_random_uuid(),
  ncr_number text not null unique,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null,
  discipline text not null check (discipline in ('Electrical', 'Mechanical', 'Civil', 'Architectural', 'Fire Alarm', 'BMS', 'Security', 'Commissioning')),
  area text not null,
  severity text not null default 'Medium' check (severity in ('Low', 'Medium', 'High', 'Critical')),
  responsible_company text not null,
  assigned_person text not null,
  date_raised date not null default current_date,
  due_date date not null,
  status text not null default 'Open' check (status in ('Open', 'Under Review', 'Corrective Action', 'Ready for Inspection', 'Closed')),
  root_cause text,
  corrective_action text,
  closeout_comments text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.punch_items (
  id uuid primary key default gen_random_uuid(),
  punch_number text not null unique,
  project_id uuid not null references public.projects(id) on delete cascade,
  area text not null,
  discipline text not null check (discipline in ('Electrical', 'Mechanical', 'Civil', 'Architectural', 'Fire Alarm', 'BMS', 'Security', 'Commissioning')),
  description text not null,
  responsible_company text not null,
  assigned_person text not null,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Critical')),
  due_date date not null,
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Ready for Verification', 'Closed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  document_number text not null unique,
  title text not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  discipline text not null check (discipline in ('Electrical', 'Mechanical', 'Civil', 'Architectural', 'Fire Alarm', 'BMS', 'Security', 'Commissioning')),
  document_type text not null,
  revision text not null default 'A01',
  status text not null default 'Draft' check (status in ('Draft', 'Submitted', 'Under Review', 'Approved', 'Approved with Comments', 'Rejected', 'Superseded')),
  file_path text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  related_entity_type text,
  related_entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists projects_status_idx on public.projects(status);
create index if not exists inspections_project_idx on public.inspections(project_id);
create index if not exists inspections_status_date_idx on public.inspections(status, planned_inspection_date);
create index if not exists ncrs_project_idx on public.ncrs(project_id);
create index if not exists ncrs_status_due_idx on public.ncrs(status, due_date);
create index if not exists punch_items_project_idx on public.punch_items(project_id);
create index if not exists punch_items_status_due_idx on public.punch_items(status, due_date);
create index if not exists documents_project_idx on public.documents(project_id);
create index if not exists notifications_user_read_idx on public.notifications(user_id, is_read, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists inspections_set_updated_at on public.inspections;
create trigger inspections_set_updated_at before update on public.inspections for each row execute function public.set_updated_at();
drop trigger if exists ncrs_set_updated_at on public.ncrs;
create trigger ncrs_set_updated_at before update on public.ncrs for each row execute function public.set_updated_at();
drop trigger if exists punch_items_set_updated_at on public.punch_items;
create trigger punch_items_set_updated_at before update on public.punch_items for each row execute function public.set_updated_at();
drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, job_title)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'job_title', 'QA/QC Engineer'))
  on conflict (id) do update set full_name = excluded.full_name, email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email, raw_user_meta_data on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.inspections enable row level security;
alter table public.ncrs enable row level security;
alter table public.punch_items enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Authenticated users can view projects" on public.projects;
create policy "Authenticated users can view projects" on public.projects for select to authenticated using (true);
drop policy if exists "Authenticated users can create projects" on public.projects;
create policy "Authenticated users can create projects" on public.projects for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "Authenticated users can update projects" on public.projects;
create policy "Authenticated users can update projects" on public.projects for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete projects" on public.projects;
create policy "Authenticated users can delete projects" on public.projects for delete to authenticated using (true);

drop policy if exists "Authenticated users can view inspections" on public.inspections;
create policy "Authenticated users can view inspections" on public.inspections for select to authenticated using (true);
drop policy if exists "Authenticated users can create inspections" on public.inspections;
create policy "Authenticated users can create inspections" on public.inspections for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "Authenticated users can update inspections" on public.inspections;
create policy "Authenticated users can update inspections" on public.inspections for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete inspections" on public.inspections;
create policy "Authenticated users can delete inspections" on public.inspections for delete to authenticated using (true);

drop policy if exists "Authenticated users can view ncrs" on public.ncrs;
create policy "Authenticated users can view ncrs" on public.ncrs for select to authenticated using (true);
drop policy if exists "Authenticated users can create ncrs" on public.ncrs;
create policy "Authenticated users can create ncrs" on public.ncrs for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "Authenticated users can update ncrs" on public.ncrs;
create policy "Authenticated users can update ncrs" on public.ncrs for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete ncrs" on public.ncrs;
create policy "Authenticated users can delete ncrs" on public.ncrs for delete to authenticated using (true);

drop policy if exists "Authenticated users can view punch items" on public.punch_items;
create policy "Authenticated users can view punch items" on public.punch_items for select to authenticated using (true);
drop policy if exists "Authenticated users can create punch items" on public.punch_items;
create policy "Authenticated users can create punch items" on public.punch_items for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "Authenticated users can update punch items" on public.punch_items;
create policy "Authenticated users can update punch items" on public.punch_items for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete punch items" on public.punch_items;
create policy "Authenticated users can delete punch items" on public.punch_items for delete to authenticated using (true);

drop policy if exists "Authenticated users can view documents" on public.documents;
create policy "Authenticated users can view documents" on public.documents for select to authenticated using (true);
drop policy if exists "Authenticated users can create documents" on public.documents;
create policy "Authenticated users can create documents" on public.documents for insert to authenticated with check (uploaded_by = auth.uid());
drop policy if exists "Authenticated users can update documents" on public.documents;
create policy "Authenticated users can update documents" on public.documents for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete documents" on public.documents;
create policy "Authenticated users can delete documents" on public.documents for delete to authenticated using (true);

drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users can create their notifications" on public.notifications;
create policy "Users can create their notifications" on public.notifications for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users can delete their notifications" on public.notifications;
create policy "Users can delete their notifications" on public.notifications for delete to authenticated using (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.projects, public.inspections, public.ncrs, public.punch_items, public.documents, public.notifications to authenticated;
revoke all on public.profiles, public.projects, public.inspections, public.ncrs, public.punch_items, public.documents, public.notifications from anon;
