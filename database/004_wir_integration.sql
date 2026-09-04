-- Additive WIR integration for the existing inspections module.
-- Prerequisite: 003_procore_document_register.sql

begin;

alter table public.inspections
  add column if not exists wir_number text,
  add column if not exists full_document_code text,
  add column if not exists file_type_code text,
  add column if not exists discipline_code text,
  add column if not exists level_code text,
  add column if not exists plan_area_code text,
  add column if not exists volume_code text,
  add column if not exists classification_code text,
  add column if not exists originator_code text;

-- The original generic discipline check does not contain the complete EAS-6-B table.
-- Keep legacy text values, while validating new structured values through discipline_code.
alter table public.inspections
  drop constraint if exists inspections_discipline_check;

-- WIR sequences are project-specific. Replace the original global inspection-number
-- uniqueness with project-scoped uniqueness without changing any stored values.
alter table public.inspections
  drop constraint if exists inspections_inspection_number_key;

create unique index if not exists inspections_project_inspection_number_unique_idx
  on public.inspections(project_id, inspection_number);

-- Backfill structured fields from an already-linked Procore WIR document.
-- If legacy data links the same WIR more than once, structure only the earliest row;
-- all other inspection rows remain unchanged and can be resolved manually.
with linked_wirs as (
  select
    inspection.id as inspection_id,
    document.number,
    document.document_code,
    document.document_type_code,
    document.discipline_code,
    document.location_code,
    document.volume_system_code,
    document.classification_code,
    document.originator_code,
    row_number() over (
      partition by inspection.project_id, document.number
      order by inspection.created_at, inspection.id
    ) as wir_occurrence,
    row_number() over (
      partition by document.document_code
      order by inspection.created_at, inspection.id
    ) as code_occurrence
  from public.inspections as inspection
  join public.documents as document on document.id = inspection.document_id
  where document.number ~ '^WIR\.[0-9]{4}$'
)
update public.inspections as inspection
set
  wir_number = coalesce(inspection.wir_number, linked.number),
  full_document_code = coalesce(inspection.full_document_code, linked.document_code),
  file_type_code = coalesce(inspection.file_type_code, linked.document_type_code, 'IP'),
  discipline_code = coalesce(inspection.discipline_code, linked.discipline_code),
  level_code = coalesce(
    inspection.level_code,
    case
      when linked.location_code ~ '^(B[12]|0[0-6]|XX)([A-Z])?$' then left(linked.location_code, 2)
      else null
    end
  ),
  plan_area_code = coalesce(
    inspection.plan_area_code,
    case
      when linked.location_code ~ '^(B[12]|0[0-6]|XX)[A-Z]$' then right(linked.location_code, 1)
      else null
    end
  ),
  volume_code = coalesce(inspection.volume_code, linked.volume_system_code),
  classification_code = coalesce(inspection.classification_code, linked.classification_code),
  originator_code = coalesce(inspection.originator_code, linked.originator_code)
from linked_wirs as linked
where inspection.id = linked.inspection_id
  and linked.wir_occurrence = 1
  and linked.code_occurrence = 1;

-- Preserve legacy rows while recognizing old inspection numbers that already use WIR.####.
update public.inspections
set
  wir_number = coalesce(wir_number, inspection_number),
  file_type_code = coalesce(file_type_code, 'IP')
where inspection_number ~ '^WIR\.[0-9]{4}$';

create unique index if not exists inspections_project_wir_number_unique_idx
  on public.inspections(project_id, wir_number)
  where wir_number is not null;

create unique index if not exists inspections_full_document_code_unique_idx
  on public.inspections(full_document_code)
  where full_document_code is not null;

create index if not exists inspections_wir_register_idx
  on public.inspections(project_id, discipline_code, planned_inspection_date desc)
  where wir_number is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inspections_wir_number_format_check'
      and conrelid = 'public.inspections'::regclass
  ) then
    alter table public.inspections
      add constraint inspections_wir_number_format_check
      check (wir_number is null or wir_number ~ '^WIR\.[0-9]{4}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'inspections_wir_discipline_code_check'
      and conrelid = 'public.inspections'::regclass
  ) then
    alter table public.inspections
      add constraint inspections_wir_discipline_code_check
      check (
        discipline_code is null
        or discipline_code in ('G', 'C', 'L', 'S', 'A', 'M', 'P', 'F', 'E', 'FA', 'T', 'SE', 'IC', 'N', 'H', 'K', 'Z')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'inspections_wir_file_type_check'
      and conrelid = 'public.inspections'::regclass
  ) then
    alter table public.inspections
      add constraint inspections_wir_file_type_check
      check (file_type_code is null or file_type_code = 'IP');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'inspections_wir_level_check'
      and conrelid = 'public.inspections'::regclass
  ) then
    alter table public.inspections
      add constraint inspections_wir_level_check
      check (level_code is null or level_code in ('B2', 'B1', '00', '01', '02', '03', '04', '05', '06', 'XX'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'inspections_wir_plan_area_check'
      and conrelid = 'public.inspections'::regclass
  ) then
    alter table public.inspections
      add constraint inspections_wir_plan_area_check
      check (plan_area_code is null or plan_area_code ~ '^[A-Z]$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'inspections_full_document_code_format_check'
      and conrelid = 'public.inspections'::regclass
  ) then
    alter table public.inspections
      add constraint inspections_full_document_code_format_check
      check (
        full_document_code is null
        or full_document_code ~ '^[A-Z0-9]+-IP-[A-Z0-9]+-WIR\.[0-9]{4}-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$'
      );
  end if;
end
$$;

commit;
