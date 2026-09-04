-- QAQC Records V2: additive MIR, NCR, SOR and RRR workflow schema.
-- Prerequisites: 001_initial_schema.sql through 005_wir_pdf_metadata.sql.
-- This migration does not upload, persist, or reference source PDF/DOCX bytes.

begin;

alter table public.ncrs
  add column if not exists document_code text,
  add column if not exists revision text,
  add column if not exists record_date date,
  add column if not exists file_type_code text,
  add column if not exists discipline_code text,
  add column if not exists level_code text,
  add column if not exists plan_area_code text,
  add column if not exists volume_code text,
  add column if not exists classification_code text,
  add column if not exists originator_code text,
  add column if not exists location text,
  add column if not exists activity text,
  add column if not exists issued_by text,
  add column if not exists issue_date date,
  add column if not exists preventive_action text,
  add column if not exists estimated_completion_date date,
  add column if not exists delayed_completion_reason text,
  add column if not exists reviewer_comments text,
  add column if not exists action_code text,
  add column if not exists reviewer text,
  add column if not exists review_date date,
  add column if not exists corrective_action_completed boolean,
  add column if not exists preventive_action_in_place boolean,
  add column if not exists verification_comments text,
  add column if not exists verified_by text,
  add column if not exists verification_date date,
  add column if not exists assessment_decision text,
  add column if not exists engineer_action_code text,
  add column if not exists assessment_comments text,
  add column if not exists decision_source text,
  add column if not exists assessment_date date,
  add column if not exists assessment_name text,
  add column if not exists final_status text,
  add column if not exists closed_date date,
  add column if not exists closed_by text,
  add column if not exists procore_reference text,
  add column if not exists workflow_status text,
  add column if not exists current_workflow_step text,
  add column if not exists current_step_assignees text,
  add column if not exists workflow_step_due timestamptz,
  add column if not exists source_filename text,
  add column if not exists attachment_metadata jsonb not null default '[]'::jsonb;

-- Keep legacy values valid while allowing the richer V2 vocabulary. The three
-- constraints below were created by 001_initial_schema.sql with PostgreSQL's
-- generated names.
alter table public.ncrs drop constraint if exists ncrs_discipline_check;
alter table public.ncrs drop constraint if exists ncrs_severity_check;
alter table public.ncrs drop constraint if exists ncrs_status_check;
alter table public.ncrs
  add constraint ncrs_discipline_check check (discipline in (
    'Electrical','Mechanical','Civil','Architectural','Fire Alarm','BMS','Security','Commissioning',
    'General','Public Health','ICT','Fire Protection','Vertical Transportation',
    'General (non-disciplinary)','Landscape','Structural','Plumbing / Public Health',
    'Fire Protection / Suppression','Fire Alarm / Detection','Telecommunications / IT / Network',
    'Instrumentation & Controls / DCOS','Sustainability / Environmental','Health and Safety',
    'EQIX Commercial (Internal)','EQIX Management (Internal)'
  )),
  add constraint ncrs_severity_check check (severity in (
    'Low','Medium','High','Critical','Level 1','Level 2','Level 3','Level 4'
  )),
  add constraint ncrs_status_check check (status in (
    'Open','In Progress','Under Review','Corrective Action','Ready for Inspection',
    'Verified','Closed','Disputed','Superseded'
  ));

update public.ncrs
set
  record_date = coalesce(record_date, date_raised),
  issue_date = coalesce(issue_date, date_raised),
  location = coalesce(location, area),
  final_status = coalesce(final_status, status),
  revision = coalesce(revision, 'R00')
where record_date is null or issue_date is null or location is null or final_status is null or revision is null;

create unique index if not exists ncrs_document_code_unique_idx
  on public.ncrs(document_code) where document_code is not null;
create index if not exists ncrs_workflow_idx
  on public.ncrs(project_id, status, due_date);

create table if not exists public.mir_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  mir_number text not null,
  document_code text not null,
  revision text not null default 'R00',
  record_date date not null,
  file_type_code text not null default 'IP',
  discipline text not null,
  discipline_code text,
  level_code text,
  plan_area_code text,
  volume_code text,
  classification_code text,
  originator_code text not null default 'SRB',
  title text not null,
  description text,
  material_title text not null,
  supplier text,
  manufacturer text,
  supply_reference text,
  delivery_note_reference text,
  package_system text,
  contractor_work_package text,
  installation_location text,
  batch_heat_lot_no text,
  serial_asset_tag text,
  approved_quantity text,
  quantity_presented text,
  delivery_date date,
  shelf_life_expiry date,
  storage_receipt_condition text,
  traceability_mark_tag text,
  material_submittal_reference text,
  itp_reference text,
  specification_reference text,
  approved_drawing_reference text,
  test_certificate_reference text,
  manufacturer_datasheet_reference text,
  compliance_items jsonb not null default '[]'::jsonb,
  inspection_findings text,
  required_action_restriction text,
  reviewer text,
  review_decision text,
  review_comments text,
  final_material_disposition text,
  release_basis text,
  closure_date date,
  status text not null default 'Draft',
  procore_reference text,
  workflow_status text,
  current_workflow_step text,
  current_step_assignees text,
  workflow_step_due timestamptz,
  source_filename text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mir_number_format_check check (mir_number ~ '^MIR\.[0-9]{4}$'),
  constraint mir_revision_format_check check (revision ~ '^[A-Z][0-9]{2}$'),
  constraint mir_status_check check (status in ('Draft','Submitted','In Review','A - Proceed','B - Proceed, Comments','C - Rejected','Closed','Superseded')),
  unique (project_id, mir_number),
  unique (document_code)
);

create table if not exists public.sor_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sor_number text not null,
  document_code text not null,
  revision text not null default 'R00',
  record_date date not null,
  file_type_code text not null default 'IP',
  discipline text not null,
  discipline_code text,
  level_code text,
  plan_area_code text,
  volume_code text,
  classification_code text,
  originator_code text not null default 'SRB',
  title text not null,
  description text not null,
  location text,
  activity text,
  severity text,
  issued_by text,
  issue_date date,
  contractor_proposal text,
  root_cause text,
  corrective_action text,
  preventive_action text,
  estimated_completion_date date,
  delayed_completion_reason text,
  reviewer_comments text,
  reviewer_decision text,
  action_code text,
  corrective_action_complete boolean,
  preventive_action_in_place boolean,
  verification_comments text,
  verified_by text,
  verification_date date,
  assessment_decision text,
  assessment_comments text,
  closed_date date,
  closed_by text,
  status text not null default 'Open',
  procore_reference text,
  workflow_status text,
  current_workflow_step text,
  current_step_assignees text,
  workflow_step_due timestamptz,
  source_filename text,
  attachment_metadata jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sor_number_format_check check (sor_number ~ '^SOR\.[0-9]{4}$'),
  constraint sor_revision_format_check check (revision ~ '^[A-Z][0-9]{2}$'),
  constraint sor_status_check check (status in ('Open','In Progress','Under Review','Verified','Closed','Disputed','Superseded')),
  unique (project_id, sor_number),
  unique (document_code)
);

create table if not exists public.rrr_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  record_number text not null,
  document_code text not null default 'IL051-RP-G-RRR',
  template_code text not null default 'SBI-EQIL5-KLT-FR-RRR',
  record_date date not null,
  submission_revision text not null default 'R0.0',
  discipline text not null,
  discipline_code text,
  level_code text,
  plan_area_code text,
  volume_code text,
  grid text,
  room text not null,
  equipment_tag text,
  classification_code text,
  title text not null,
  project_phase text,
  room_asset_code text,
  systems text,
  requested_by text,
  request_date date,
  related_itp_reference text,
  employer_readiness_checklist_tracker_ref text,
  readiness_stage text not null,
  room_route text not null,
  overall_target_100_date date,
  room_complete boolean not null default false,
  no_open_p1_p2_items boolean not null default false,
  continuation_list_attached boolean not null default false,
  requested_inspection_date date,
  requested_inspection_time time,
  notice_given_working_days integer,
  energization_power_request_ref text,
  inspection_purpose text,
  declaration_complete boolean not null default false,
  room_secured_under_control boolean not null default false,
  doors_installed_locked boolean not null default false,
  access_retained_by_authorized_person boolean not null default false,
  permit_sleeve_fitted boolean not null default false,
  loto_applied boolean not null default false,
  live_warning_notices_fitted boolean not null default false,
  life_safety_provisions_in_place boolean not null default false,
  cleanliness_dust_control_maintained boolean not null default false,
  engineer_decision text,
  engineer_name text,
  engineer_date date,
  cxa_decision text,
  cxa_name text,
  cxa_date date,
  employer_release text,
  employer_name text,
  employer_date date,
  conditions_comments text,
  resubmission_required boolean not null default false,
  next_rrr_record_number text,
  next_submission_revision text,
  status text not null default 'Draft',
  procore_reference text,
  source_filename text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rrr_number_format_check check (record_number ~ '^RRR\.[0-9]{6}$'),
  constraint rrr_document_code_fixed_check check (document_code = 'IL051-RP-G-RRR'),
  constraint rrr_submission_revision_check check (submission_revision ~ '^R[0-9]+\.[0-9]+$'),
  constraint rrr_stage_check check (readiness_stage in ('Stage 1','Stage 2')),
  constraint rrr_route_check check (room_route in ('Standard Room','ICT Room / Space')),
  constraint rrr_notice_check check (notice_given_working_days is null or notice_given_working_days >= 0),
  constraint rrr_status_check check (status in ('Draft','Submitted','Under Review','Verified','Not Verified','CxA Accepted','Accepted with Conditions','Rejected','Released for Commissioning','Released for Energization','Not Released','Superseded','Resubmitted')),
  unique (project_id, record_number)
);

create table if not exists public.quality_record_actions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_record_type text not null,
  parent_record_id uuid not null,
  action_description text not null,
  responsible_person text not null,
  due_date date not null,
  status text not null default 'Open',
  completion_date date,
  verification_note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quality_action_parent_type_check check (parent_record_type in ('NCR','SOR','RRR')),
  constraint quality_action_status_check check (status in ('Open','In Progress','Verified','Closed'))
);

create table if not exists public.rrr_readiness_controls (
  id uuid primary key default gen_random_uuid(),
  rrr_id uuid not null references public.rrr_records(id) on delete cascade,
  control_level text not null,
  responsible text,
  percent_complete integer not null default 0,
  open_actions_count integer not null default 0,
  checklist_reference text,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint readiness_percent_check check (percent_complete between 0 and 100),
  constraint readiness_actions_check check (open_actions_count >= 0),
  unique (rrr_id, control_level)
);

create table if not exists public.rrr_commissioning_tags (
  id uuid primary key default gen_random_uuid(),
  rrr_id uuid not null references public.rrr_records(id) on delete cascade,
  tag_type text not null,
  asset_equipment text,
  facility_grid_status text,
  cxa_signoff_date date,
  reference text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rrr_tag_type_check check (tag_type in ('L2A RED TAG','L2B YELLOW TAG','CONDITIONAL YELLOW TAG / CYT'))
);

create table if not exists public.rrr_open_items (
  id uuid primary key default gen_random_uuid(),
  rrr_id uuid not null references public.rrr_records(id) on delete cascade,
  item_number text not null,
  reference text,
  reference_type text,
  description text not null,
  priority text not null,
  raised_by text,
  target_date date,
  status text not null default 'Open',
  linked_record_type text,
  linked_record_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rrr_open_item_priority_check check (priority in ('P1','P2','P3','P4')),
  constraint rrr_open_item_status_check check (status in ('Open','Closed','Disputed')),
  unique (rrr_id, item_number)
);

create table if not exists public.rrr_evidence (
  id uuid primary key default gen_random_uuid(),
  rrr_id uuid not null references public.rrr_records(id) on delete cascade,
  evidence_type text not null,
  reference text not null,
  evidence_date date,
  uploaded boolean not null default false,
  approved boolean not null default false,
  linked_record_type text,
  linked_record_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rrr_attendance (
  id uuid primary key default gen_random_uuid(),
  rrr_id uuid not null references public.rrr_records(id) on delete cascade,
  attendance_group text not null,
  attendee_role text not null,
  required boolean not null default true,
  attended boolean not null default false,
  attendee_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rrr_attendance_group_check check (attendance_group in ('External','SERBAN')),
  unique (rrr_id, attendance_group, attendee_role)
);

create table if not exists public.rrr_signatories (
  id uuid primary key default gen_random_uuid(),
  rrr_id uuid not null references public.rrr_records(id) on delete cascade,
  role text not null,
  name text,
  signed_date date,
  signature_status text,
  signature_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rrr_id, role)
);

create table if not exists public.rrr_submission_revisions (
  id uuid primary key default gen_random_uuid(),
  rrr_id uuid not null references public.rrr_records(id) on delete cascade,
  submission_revision text not null,
  submitted_date date,
  returned_date date,
  submission_transmittal_reference text,
  source_reason text,
  revised_by text,
  status text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint rrr_history_revision_check check (submission_revision ~ '^R[0-9]+\.[0-9]+$'),
  unique (rrr_id, submission_revision)
);

create table if not exists public.rrr_linked_attachments (
  id uuid primary key default gen_random_uuid(),
  rrr_id uuid not null references public.rrr_records(id) on delete cascade,
  attachment_type text not null,
  document_evidence_reference text not null,
  revision text,
  attachment_date date,
  originator text,
  linked_submission_revision text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.record_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_record_type text not null,
  source_record_id uuid not null,
  target_record_type text not null,
  target_record_id uuid,
  external_reference text,
  relationship_type text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint record_link_target_check check (target_record_id is not null or external_reference is not null),
  constraint record_link_no_self_check check (source_record_id <> target_record_id or source_record_type <> target_record_type)
);

create index if not exists mir_records_register_idx on public.mir_records(project_id, status, record_date desc);
create index if not exists sor_records_register_idx on public.sor_records(project_id, status, record_date desc);
create index if not exists rrr_records_register_idx on public.rrr_records(project_id, status, record_date desc);
create index if not exists quality_record_actions_parent_idx on public.quality_record_actions(parent_record_type, parent_record_id);
create index if not exists quality_record_actions_due_idx on public.quality_record_actions(status, due_date);
create index if not exists rrr_readiness_controls_parent_idx on public.rrr_readiness_controls(rrr_id, sort_order);
create index if not exists rrr_tags_parent_idx on public.rrr_commissioning_tags(rrr_id);
create index if not exists rrr_open_items_parent_idx on public.rrr_open_items(rrr_id, status, priority);
create index if not exists rrr_evidence_parent_idx on public.rrr_evidence(rrr_id);
create index if not exists rrr_attendance_parent_idx on public.rrr_attendance(rrr_id);
create index if not exists rrr_signatories_parent_idx on public.rrr_signatories(rrr_id);
create index if not exists rrr_submission_revisions_parent_idx on public.rrr_submission_revisions(rrr_id, created_at desc);
create index if not exists rrr_attachments_parent_idx on public.rrr_linked_attachments(rrr_id);
create index if not exists record_links_source_idx on public.record_links(source_record_type, source_record_id);
create index if not exists record_links_target_idx on public.record_links(target_record_type, target_record_id);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'mir_records','sor_records','rrr_records','quality_record_actions',
    'rrr_readiness_controls','rrr_commissioning_tags','rrr_open_items','rrr_evidence',
    'rrr_attendance','rrr_signatories','rrr_linked_attachments'
  ] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

alter table public.mir_records enable row level security;
alter table public.sor_records enable row level security;
alter table public.rrr_records enable row level security;
alter table public.quality_record_actions enable row level security;
alter table public.rrr_readiness_controls enable row level security;
alter table public.rrr_commissioning_tags enable row level security;
alter table public.rrr_open_items enable row level security;
alter table public.rrr_evidence enable row level security;
alter table public.rrr_attendance enable row level security;
alter table public.rrr_signatories enable row level security;
alter table public.rrr_submission_revisions enable row level security;
alter table public.rrr_linked_attachments enable row level security;
alter table public.record_links enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'mir_records','sor_records','rrr_records','quality_record_actions',
    'rrr_readiness_controls','rrr_commissioning_tags','rrr_open_items','rrr_evidence',
    'rrr_attendance','rrr_signatories','rrr_submission_revisions','rrr_linked_attachments','record_links'
  ] loop
    execute format('drop policy if exists "Authenticated users can view %s" on public.%I', table_name, table_name);
    execute format('create policy "Authenticated users can view %s" on public.%I for select to authenticated using (true)', table_name, table_name);
    execute format('drop policy if exists "Authenticated users can create %s" on public.%I', table_name, table_name);
    if table_name in ('rrr_readiness_controls','rrr_commissioning_tags','rrr_open_items','rrr_evidence','rrr_attendance','rrr_signatories','rrr_linked_attachments') then
      execute format('create policy "Authenticated users can create %s" on public.%I for insert to authenticated with check (true)', table_name, table_name);
    else
      execute format('create policy "Authenticated users can create %s" on public.%I for insert to authenticated with check (created_by = auth.uid())', table_name, table_name);
    end if;
    execute format('drop policy if exists "Authenticated users can update %s" on public.%I', table_name, table_name);
    execute format('create policy "Authenticated users can update %s" on public.%I for update to authenticated using (true) with check (true)', table_name, table_name);
    execute format('drop policy if exists "Authenticated users can delete %s" on public.%I', table_name, table_name);
    execute format('create policy "Authenticated users can delete %s" on public.%I for delete to authenticated using (true)', table_name, table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('revoke all on public.%I from anon', table_name);
  end loop;
end $$;

commit;
