export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  company: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};
type ProjectRow = {
  id: string;
  name: string;
  project_code: string;
  client: string;
  location: string;
  description: string | null;
  start_date: string | null;
  target_completion_date: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
type InspectionRow = {
  id: string;
  inspection_number: string;
  wir_number: string | null;
  full_document_code: string | null;
  project_id: string;
  document_id: string | null;
  file_type_code: string | null;
  inspection_type: string;
  discipline: string;
  discipline_code: string | null;
  area: string;
  level_code: string | null;
  plan_area_code: string | null;
  volume_code: string | null;
  classification_code: string | null;
  originator_code: string | null;
  revision: string | null;
  inspection_item: string | null;
  file_title: string | null;
  source_filename: string | null;
  pile_location_numbers: string | null;
  description: string;
  consultant: string | null;
  contractor: string | null;
  inspector: string;
  reviewer_name: string | null;
  responsible_company: string;
  location_grid: string | null;
  planned_inspection_date: string;
  actual_inspection_date: string | null;
  inspection_time_window: string | null;
  method_statement: string | null;
  itp_reference: string | null;
  itp_revision: string | null;
  itp_item: string | null;
  itp_control_point: string | null;
  estimated_volume: string | null;
  drawing_reference: string | null;
  engineer_inspection_result: string | null;
  status: string;
  result: string | null;
  comments: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
type NcrRow = {
  id: string;
  ncr_number: string;
  project_id: string;
  title: string;
  description: string;
  discipline: string;
  area: string;
  severity: string;
  responsible_company: string;
  assigned_person: string;
  date_raised: string;
  due_date: string;
  status: string;
  root_cause: string | null;
  corrective_action: string | null;
  closeout_comments: string | null;
  document_code: string | null;
  revision: string | null;
  record_date: string | null;
  file_type_code: string | null;
  discipline_code: string | null;
  level_code: string | null;
  plan_area_code: string | null;
  volume_code: string | null;
  classification_code: string | null;
  originator_code: string | null;
  location: string | null;
  activity: string | null;
  issued_by: string | null;
  issue_date: string | null;
  preventive_action: string | null;
  estimated_completion_date: string | null;
  delayed_completion_reason: string | null;
  reviewer_comments: string | null;
  action_code: string | null;
  reviewer: string | null;
  review_date: string | null;
  corrective_action_completed: boolean | null;
  preventive_action_in_place: boolean | null;
  verification_comments: string | null;
  verified_by: string | null;
  verification_date: string | null;
  assessment_decision: string | null;
  engineer_action_code: string | null;
  assessment_comments: string | null;
  decision_source: string | null;
  assessment_date: string | null;
  assessment_name: string | null;
  final_status: string | null;
  closed_date: string | null;
  closed_by: string | null;
  procore_reference: string | null;
  workflow_status: string | null;
  current_workflow_step: string | null;
  current_step_assignees: string | null;
  workflow_step_due: string | null;
  source_filename: string | null;
  attachment_metadata: Json;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
type QualityRecordBaseRow = {
  id: string;
  project_id: string;
  document_code: string;
  revision: string;
  record_date: string;
  file_type_code: string;
  discipline: string;
  discipline_code: string | null;
  level_code: string | null;
  plan_area_code: string | null;
  volume_code: string | null;
  classification_code: string | null;
  originator_code: string;
  title: string;
  description: string | null;
  status: string;
  procore_reference: string | null;
  workflow_status: string | null;
  current_workflow_step: string | null;
  current_step_assignees: string | null;
  workflow_step_due: string | null;
  source_filename: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
type MirRecordRow = QualityRecordBaseRow & {
  mir_number: string;
  material_title: string;
  supplier: string | null;
  manufacturer: string | null;
  supply_reference: string | null;
  delivery_note_reference: string | null;
  package_system: string | null;
  contractor_work_package: string | null;
  installation_location: string | null;
  batch_heat_lot_no: string | null;
  serial_asset_tag: string | null;
  approved_quantity: string | null;
  quantity_presented: string | null;
  delivery_date: string | null;
  shelf_life_expiry: string | null;
  storage_receipt_condition: string | null;
  traceability_mark_tag: string | null;
  material_submittal_reference: string | null;
  itp_reference: string | null;
  specification_reference: string | null;
  approved_drawing_reference: string | null;
  test_certificate_reference: string | null;
  manufacturer_datasheet_reference: string | null;
  compliance_items: Json;
  inspection_findings: string | null;
  required_action_restriction: string | null;
  reviewer: string | null;
  review_decision: string | null;
  review_comments: string | null;
  final_material_disposition: string | null;
  release_basis: string | null;
  closure_date: string | null;
};
type SorRecordRow = QualityRecordBaseRow & {
  sor_number: string;
  description: string;
  location: string | null;
  activity: string | null;
  severity: string | null;
  issued_by: string | null;
  issue_date: string | null;
  contractor_proposal: string | null;
  root_cause: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  estimated_completion_date: string | null;
  delayed_completion_reason: string | null;
  reviewer_comments: string | null;
  reviewer_decision: string | null;
  action_code: string | null;
  corrective_action_complete: boolean | null;
  preventive_action_in_place: boolean | null;
  verification_comments: string | null;
  verified_by: string | null;
  verification_date: string | null;
  assessment_decision: string | null;
  assessment_comments: string | null;
  closed_date: string | null;
  closed_by: string | null;
  attachment_metadata: Json;
};
type RrrRecordRow = {
  id: string;
  project_id: string;
  record_number: string;
  document_code: string;
  template_code: string;
  record_date: string;
  submission_revision: string;
  discipline: string;
  discipline_code: string | null;
  level_code: string | null;
  plan_area_code: string | null;
  volume_code: string | null;
  grid: string | null;
  room: string;
  equipment_tag: string | null;
  classification_code: string | null;
  title: string;
  project_phase: string | null;
  room_asset_code: string | null;
  systems: string | null;
  requested_by: string | null;
  request_date: string | null;
  related_itp_reference: string | null;
  employer_readiness_checklist_tracker_ref: string | null;
  readiness_stage: string;
  room_route: string;
  overall_target_100_date: string | null;
  room_complete: boolean;
  no_open_p1_p2_items: boolean;
  continuation_list_attached: boolean;
  requested_inspection_date: string | null;
  requested_inspection_time: string | null;
  notice_given_working_days: number | null;
  energization_power_request_ref: string | null;
  inspection_purpose: string | null;
  declaration_complete: boolean;
  room_secured_under_control: boolean;
  doors_installed_locked: boolean;
  access_retained_by_authorized_person: boolean;
  permit_sleeve_fitted: boolean;
  loto_applied: boolean;
  live_warning_notices_fitted: boolean;
  life_safety_provisions_in_place: boolean;
  cleanliness_dust_control_maintained: boolean;
  engineer_decision: string | null;
  engineer_name: string | null;
  engineer_date: string | null;
  cxa_decision: string | null;
  cxa_name: string | null;
  cxa_date: string | null;
  employer_release: string | null;
  employer_name: string | null;
  employer_date: string | null;
  conditions_comments: string | null;
  resubmission_required: boolean;
  next_rrr_record_number: string | null;
  next_submission_revision: string | null;
  status: string;
  procore_reference: string | null;
  source_filename: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
type QualityActionRow = {
  id: string; project_id: string; parent_record_type: string; parent_record_id: string;
  action_description: string; responsible_person: string; due_date: string; status: string;
  completion_date: string | null; verification_note: string | null; created_by: string | null;
  created_at: string; updated_at: string;
};
type RrrReadinessRow = { id: string; rrr_id: string; control_level: string; responsible: string | null; percent_complete: number; open_actions_count: number; checklist_reference: string | null; sort_order: number; created_at: string; updated_at: string };
type RrrTagRow = { id: string; rrr_id: string; tag_type: string; asset_equipment: string | null; facility_grid_status: string | null; cxa_signoff_date: string | null; reference: string | null; status: string | null; created_at: string; updated_at: string };
type RrrOpenItemRow = { id: string; rrr_id: string; item_number: string; reference: string | null; reference_type: string | null; description: string; priority: string; raised_by: string | null; target_date: string | null; status: string; linked_record_type: string | null; linked_record_id: string | null; created_at: string; updated_at: string };
type RrrEvidenceRow = { id: string; rrr_id: string; evidence_type: string; reference: string; evidence_date: string | null; uploaded: boolean; approved: boolean; linked_record_type: string | null; linked_record_id: string | null; created_at: string; updated_at: string };
type RrrAttendanceRow = { id: string; rrr_id: string; attendance_group: string; attendee_role: string; required: boolean; attended: boolean; attendee_name: string | null; created_at: string; updated_at: string };
type RrrSignatoryRow = { id: string; rrr_id: string; role: string; name: string | null; signed_date: string | null; signature_status: string | null; signature_reference: string | null; created_at: string; updated_at: string };
type RrrRevisionRow = { id: string; rrr_id: string; submission_revision: string; submitted_date: string | null; returned_date: string | null; submission_transmittal_reference: string | null; source_reason: string | null; revised_by: string | null; status: string; created_by: string | null; created_at: string };
type RrrAttachmentRow = { id: string; rrr_id: string; attachment_type: string; document_evidence_reference: string; revision: string | null; attachment_date: string | null; originator: string | null; linked_submission_revision: string | null; status: string | null; created_at: string; updated_at: string };
type RecordLinkRow = { id: string; project_id: string; source_record_type: string; source_record_id: string; target_record_type: string; target_record_id: string | null; external_reference: string | null; relationship_type: string; created_by: string | null; created_at: string };
type PunchItemRow = {
  id: string;
  punch_number: string;
  project_id: string;
  area: string;
  discipline: string;
  description: string;
  responsible_company: string;
  assigned_person: string;
  priority: string;
  due_date: string;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
type DocumentRow = {
  id: string;
  document_number: string;
  document_code: string | null;
  title: string;
  description: string | null;
  project_id: string;
  discipline: string;
  discipline_code: string | null;
  document_type: string;
  document_type_code: string | null;
  number: string | null;
  volume_system_code: string | null;
  location_code: string | null;
  classification_code: string | null;
  originator_code: string | null;
  revision: string;
  version: string | null;
  status: string;
  project_stage: string | null;
  workflow_status: string | null;
  current_workflow_step: string | null;
  assigned_workflow: string | null;
  file_name: string | null;
  file_path: string | null;
  date_uploaded: string | null;
  date_updated: string | null;
  uploaded_by: string | null;
  created_by: string | null;
  procore_name: string | null;
  procore_project: string | null;
  source_location_code: string | null;
  source_classification_code: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};
type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
type GeneratedTable<Row, Required extends keyof Row> = Table<
  Row,
  Partial<Omit<Row, 'id' | 'created_at' | 'updated_at'>> & Pick<Row, Required>,
  Partial<Omit<Row, 'id' | 'created_at' | 'updated_at'>>
>;

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        Partial<Omit<ProfileRow, 'created_at' | 'updated_at'>> &
          Pick<ProfileRow, 'id'>,
        Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>
      >;
      projects: Table<
        ProjectRow,
        Partial<Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'>> &
          Pick<
            ProjectRow,
            'name' | 'project_code' | 'client' | 'location' | 'status'
          >,
        Partial<Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'>>
      >;
      inspections: Table<
        InspectionRow,
        Partial<Omit<InspectionRow, 'id' | 'created_at' | 'updated_at'>> &
          Pick<
            InspectionRow,
            | 'inspection_number'
            | 'project_id'
            | 'inspection_type'
            | 'discipline'
            | 'area'
            | 'description'
            | 'inspector'
            | 'responsible_company'
            | 'planned_inspection_date'
            | 'status'
          >,
        Partial<Omit<InspectionRow, 'id' | 'created_at' | 'updated_at'>>
      >;
      ncrs: Table<
        NcrRow,
        Partial<Omit<NcrRow, 'id' | 'created_at' | 'updated_at'>> &
          Pick<
            NcrRow,
            | 'ncr_number'
            | 'project_id'
            | 'title'
            | 'description'
            | 'discipline'
            | 'area'
            | 'severity'
            | 'responsible_company'
            | 'assigned_person'
            | 'date_raised'
            | 'due_date'
            | 'status'
          >,
        Partial<Omit<NcrRow, 'id' | 'created_at' | 'updated_at'>>
      >;
      punch_items: Table<
        PunchItemRow,
        Partial<Omit<PunchItemRow, 'id' | 'created_at' | 'updated_at'>> &
          Pick<
            PunchItemRow,
            | 'punch_number'
            | 'project_id'
            | 'area'
            | 'discipline'
            | 'description'
            | 'responsible_company'
            | 'assigned_person'
            | 'priority'
            | 'due_date'
            | 'status'
          >,
        Partial<Omit<PunchItemRow, 'id' | 'created_at' | 'updated_at'>>
      >;
      documents: Table<
        DocumentRow,
        Partial<Omit<DocumentRow, 'id' | 'created_at' | 'updated_at'>> &
          Pick<
            DocumentRow,
            | 'document_number'
            | 'document_code'
            | 'title'
            | 'description'
            | 'project_id'
            | 'discipline'
            | 'document_type'
            | 'revision'
            | 'status'
          >,
        Partial<Omit<DocumentRow, 'id' | 'created_at' | 'updated_at'>>
      >;
      notifications: Table<
        NotificationRow,
        Partial<Omit<NotificationRow, 'id' | 'created_at'>> &
          Pick<NotificationRow, 'user_id' | 'title' | 'message' | 'type'>,
        Partial<Omit<NotificationRow, 'id' | 'user_id' | 'created_at'>>
      >;
      mir_records: GeneratedTable<MirRecordRow, 'project_id' | 'mir_number' | 'document_code' | 'record_date' | 'discipline' | 'title' | 'material_title' | 'status'>;
      sor_records: GeneratedTable<SorRecordRow, 'project_id' | 'sor_number' | 'document_code' | 'record_date' | 'discipline' | 'title' | 'description' | 'status'>;
      rrr_records: GeneratedTable<RrrRecordRow, 'project_id' | 'record_number' | 'record_date' | 'discipline' | 'room' | 'title' | 'readiness_stage' | 'room_route' | 'status'>;
      quality_record_actions: GeneratedTable<QualityActionRow, 'project_id' | 'parent_record_type' | 'parent_record_id' | 'action_description' | 'responsible_person' | 'due_date' | 'status'>;
      rrr_readiness_controls: GeneratedTable<RrrReadinessRow, 'rrr_id' | 'control_level' | 'percent_complete' | 'open_actions_count' | 'sort_order'>;
      rrr_commissioning_tags: GeneratedTable<RrrTagRow, 'rrr_id' | 'tag_type'>;
      rrr_open_items: GeneratedTable<RrrOpenItemRow, 'rrr_id' | 'item_number' | 'description' | 'priority' | 'status'>;
      rrr_evidence: GeneratedTable<RrrEvidenceRow, 'rrr_id' | 'evidence_type' | 'reference'>;
      rrr_attendance: GeneratedTable<RrrAttendanceRow, 'rrr_id' | 'attendance_group' | 'attendee_role'>;
      rrr_signatories: GeneratedTable<RrrSignatoryRow, 'rrr_id' | 'role'>;
      rrr_submission_revisions: GeneratedTable<RrrRevisionRow, 'rrr_id' | 'submission_revision' | 'status'>;
      rrr_linked_attachments: GeneratedTable<RrrAttachmentRow, 'rrr_id' | 'attachment_type' | 'document_evidence_reference'>;
      record_links: GeneratedTable<RecordLinkRow, 'project_id' | 'source_record_type' | 'source_record_id' | 'target_record_type' | 'relationship_type'>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
