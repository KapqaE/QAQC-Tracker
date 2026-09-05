-- Project context: additive organization fields and per-user active-project selection.
-- Prerequisites: 001_initial_schema.sql through 006_quality_records_v2.sql.

begin;

alter table public.projects
  add column if not exists contractor text,
  add column if not exists consultant text;

alter table public.profiles
  add column if not exists active_project_id uuid
    references public.projects(id) on delete set null;

create index if not exists profiles_active_project_idx
  on public.profiles(active_project_id);

-- Existing table-level grants and RLS policies from 001_initial_schema.sql remain
-- in force. In particular, profiles can only be updated by their owning user,
-- projects can only be read/created by authenticated users, and anon is revoked.

commit;
