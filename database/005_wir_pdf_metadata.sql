-- Additive metadata for Procore WIR filenames and locally extracted form fields.
-- Prerequisite: 004_wir_integration.sql
-- Uploaded PDF bytes are never stored; source_filename is metadata only.

begin;

alter table public.inspections
  add column if not exists revision text,
  add column if not exists inspection_item text,
  add column if not exists file_title text,
  add column if not exists source_filename text,
  add column if not exists pile_location_numbers text,
  add column if not exists consultant text,
  add column if not exists contractor text,
  add column if not exists reviewer_name text,
  add column if not exists location_grid text,
  add column if not exists inspection_time_window text,
  add column if not exists method_statement text,
  add column if not exists itp_reference text,
  add column if not exists itp_revision text,
  add column if not exists itp_item text,
  add column if not exists itp_control_point text,
  add column if not exists estimated_volume text,
  add column if not exists drawing_reference text,
  add column if not exists engineer_inspection_result text;

-- Existing inspection records remain valid and gain sensible WIR metadata.
update public.inspections
set
  revision = coalesce(revision, 'R00'),
  inspection_item = coalesce(inspection_item, description),
  file_title = coalesce(file_title, 'WIR ' || description),
  contractor = coalesce(contractor, responsible_company)
where wir_number is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inspections_wir_revision_format_check'
      and conrelid = 'public.inspections'::regclass
  ) then
    alter table public.inspections
      add constraint inspections_wir_revision_format_check
      check (revision is null or revision ~ '^[A-Z][0-9]{2}$');
  end if;
end
$$;

commit;
