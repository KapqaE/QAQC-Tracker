-- QAQC Tracker: additive Procore document register migration
-- Run after 001_initial_schema.sql. This migration preserves every existing row.

alter table public.documents
  add column if not exists document_code text,
  add column if not exists description text,
  add column if not exists document_type_code text,
  add column if not exists discipline_code text,
  add column if not exists number text,
  add column if not exists volume_system_code text,
  add column if not exists location_code text,
  add column if not exists classification_code text,
  add column if not exists originator_code text,
  add column if not exists version text,
  add column if not exists project_stage text,
  add column if not exists workflow_status text,
  add column if not exists current_workflow_step text,
  add column if not exists assigned_workflow text,
  add column if not exists file_name text,
  add column if not exists date_uploaded timestamptz,
  add column if not exists date_updated timestamptz,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists procore_name text,
  add column if not exists procore_project text,
  add column if not exists source_location_code text,
  add column if not exists source_classification_code text,
  add column if not exists source text not null default 'manual';

update public.documents
set
  document_code = coalesce(document_code, document_number),
  description = coalesce(description, title),
  document_type_code = coalesce(document_type_code, document_type),
  discipline_code = coalesce(discipline_code, discipline),
  created_by = coalesce(created_by, uploaded_by)
where
  document_code is null
  or description is null
  or document_type_code is null
  or discipline_code is null
  or created_by is null;

-- Procore uses A/B/C/---/N/A status codes. Keep all legacy QAQC values valid.
alter table public.documents drop constraint if exists documents_status_check;
alter table public.documents
  add constraint documents_status_check check (
    status in (
      'Draft', 'Submitted', 'Under Review', 'Approved', 'Approved with Comments',
      'Rejected', 'Superseded', 'A', 'B', 'C', '---', 'N/A'
    )
  );

-- The legacy discipline column remains for backwards compatibility. Procore
-- discipline codes are stored in discipline_code and validated by CSV-derived
-- master data instead of a destructive legacy enum constraint.
alter table public.documents drop constraint if exists documents_discipline_check;

alter table public.documents drop constraint if exists documents_source_check;
alter table public.documents
  add constraint documents_source_check check (source in ('manual', 'procore_csv'));

create unique index if not exists documents_document_code_unique_idx
  on public.documents(document_code)
  where document_code is not null;
create index if not exists documents_project_type_idx
  on public.documents(project_id, document_type_code);
create index if not exists documents_discipline_status_idx
  on public.documents(discipline_code, status);
create index if not exists documents_workflow_status_idx
  on public.documents(workflow_status);

alter table public.inspections
  add column if not exists document_id uuid references public.documents(id) on delete set null;

create index if not exists inspections_document_idx
  on public.inspections(document_id);
