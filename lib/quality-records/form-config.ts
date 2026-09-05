import type { QualityRecordField } from '@/components/quality-records/quality-record-manager';
import { projectNamingCode } from '@/lib/procore/naming';
import { procoreReference } from '@/lib/procore/reference';
import { issueStatuses, reviewStatuses, rrrStatuses } from '@/lib/quality-records/model';
import type { Project } from '@/types/qaqc';

const options = (items: { code: string; label: string }[]) => items.map((item) => ({ value: item.code, label: `${item.code} · ${item.label}` }));
const opt = (values: readonly string[]) => values.map((value) => ({ value, label: value }));

function identity(projects: Project[], numberName: string, numberLabel: string): QualityRecordField[] {
  const mapped = projects.map((project) => ({ project, code: projectNamingCode(project.project_code) })).filter((item): item is { project: Project; code: string } => Boolean(item.code));
  return [
    { name: numberName, label: numberLabel, section: 'Record identity', required: true },
    { name: 'project_id', label: 'Project', section: 'Record identity', type: 'select', required: true, options: mapped.map(({ project }) => ({ value: project.id, label: `${project.project_code} · ${project.name}` })) },
    { name: 'project_code', label: 'Project code (document identity)', section: 'Record identity', type: 'select', required: true, options: [...new Map(mapped.map(({ code }) => [code, { value: code, label: code }])).values()] },
    { name: 'revision', label: 'Revision', section: 'Record identity', required: true, defaultValue: 'R00' },
    { name: 'record_date', label: 'Record date', section: 'Record identity', type: 'date', required: true },
    { name: 'title', label: 'Title', section: 'Record identity', required: true, span: 2 },
    { name: 'discipline_code', label: 'Discipline', section: 'EAS-6-B metadata', type: 'select', required: true, options: options(procoreReference.eas6bDisciplines) },
    { name: 'level_code', label: 'Level', section: 'EAS-6-B metadata', type: 'select', required: true, options: options(procoreReference.eas6bLevels) },
    { name: 'plan_area_code', label: 'Plan area', section: 'EAS-6-B metadata', type: 'select', options: [{ value: '', label: 'Not used' }, ...options(procoreReference.eas6bPlanAreas)] },
    { name: 'volume_code', label: 'Volume', section: 'EAS-6-B metadata', type: 'select', required: true, options: options(procoreReference.eas6bVolumes) },
    { name: 'classification_code', label: 'Classification', section: 'EAS-6-B metadata', type: 'select', required: true, options: options(procoreReference.eas6bClassifications) },
    { name: 'originator_code', label: 'Originator', section: 'EAS-6-B metadata', type: 'select', required: true, options: options(procoreReference.eas6bOriginators), defaultValue: 'SRB' },
  ];
}

const procoreFields: QualityRecordField[] = [
  { name: 'procore_reference', label: 'Procore reference', section: 'Procore metadata' },
  { name: 'workflow_status', label: 'Workflow status', section: 'Procore metadata' },
  { name: 'current_workflow_step', label: 'Current workflow step', section: 'Procore metadata' },
  { name: 'current_step_assignees', label: 'Current step assignees', section: 'Procore metadata', span: 2 },
  { name: 'source_filename', label: 'Original filename metadata', section: 'Procore metadata', span: 2 },
];

export function mirFields(projects: Project[]): QualityRecordField[] { return [...identity(projects, 'mir_number', 'MIR number'),
  { name: 'material_title', label: 'Material title', section: 'Material information', required: true, span: 2 },
  { name: 'description', label: 'Description', section: 'Material information', type: 'textarea', span: 2 },
  { name: 'supplier', label: 'Supplier', section: 'Material information' }, { name: 'manufacturer', label: 'Manufacturer', section: 'Material information' },
  { name: 'supply_reference', label: 'Supply reference', section: 'Material information' }, { name: 'delivery_note_reference', label: 'Delivery note reference', section: 'Material information' },
  { name: 'package_system', label: 'Package / system', section: 'Material information' }, { name: 'contractor_work_package', label: 'Contractor work package', section: 'Material information' },
  { name: 'installation_location', label: 'Installation location', section: 'Material information', span: 2 }, { name: 'batch_heat_lot_no', label: 'Batch / heat / lot no.', section: 'Traceability' },
  { name: 'serial_asset_tag', label: 'Serial / asset tag', section: 'Traceability' }, { name: 'approved_quantity', label: 'Approved quantity', section: 'Traceability' },
  { name: 'quantity_presented', label: 'Quantity presented', section: 'Traceability' }, { name: 'delivery_date', label: 'Delivery date', section: 'Traceability', type: 'date' },
  { name: 'shelf_life_expiry', label: 'Shelf life / expiry', section: 'Traceability', type: 'date' }, { name: 'storage_receipt_condition', label: 'Storage / receipt condition', section: 'Traceability', type: 'textarea', span: 2 },
  { name: 'traceability_mark_tag', label: 'Traceability mark / tag', section: 'Traceability', span: 2 },
  { name: 'material_submittal_reference', label: 'Material submittal reference', section: 'References' }, { name: 'itp_reference', label: 'ITP reference', section: 'References' },
  { name: 'specification_reference', label: 'Specification reference', section: 'References' }, { name: 'approved_drawing_reference', label: 'Approved drawing reference', section: 'References' },
  { name: 'test_certificate_reference', label: 'Test certificate reference', section: 'References' }, { name: 'manufacturer_datasheet_reference', label: 'Manufacturer datasheet reference', section: 'References' },
  { name: 'inspection_findings', label: 'Inspection findings', section: 'Inspection', type: 'textarea', span: 2 }, { name: 'required_action_restriction', label: 'Required action / restriction', section: 'Inspection', type: 'textarea', span: 2 },
  { name: 'reviewer', label: 'Reviewer', section: 'Review and release' }, { name: 'review_decision', label: 'Review decision', section: 'Review and release' },
  { name: 'review_comments', label: 'Review comments', section: 'Review and release', type: 'textarea', span: 2 }, { name: 'final_material_disposition', label: 'Final material disposition', section: 'Review and release' },
  { name: 'release_basis', label: 'Release basis', section: 'Review and release' }, { name: 'closure_date', label: 'Closure date', section: 'Review and release', type: 'date' },
  { name: 'status', label: 'Status', section: 'Review and release', type: 'select', required: true, options: opt(reviewStatuses), defaultValue: 'Draft' }, ...procoreFields]; }

export function sorFields(projects: Project[]): QualityRecordField[] { return [...identity(projects, 'sor_number', 'SOR number'),
  { name: 'description', label: 'Site observation', section: 'Site observation', type: 'textarea', required: true, span: 2 }, { name: 'location', label: 'Location', section: 'Site observation' },
  { name: 'activity', label: 'Activity', section: 'Site observation' }, { name: 'severity', label: 'Severity', section: 'Site observation', type: 'select', options: opt(['Level 1','Level 2','Level 3','Level 4']) },
  { name: 'issued_by', label: 'Issued by', section: 'Site observation' }, { name: 'issue_date', label: 'Issue date', section: 'Site observation', type: 'date' },
  { name: 'contractor_proposal', label: 'Contractor proposal', section: 'Contractor response', type: 'textarea', span: 2 }, { name: 'root_cause', label: 'Root cause', section: 'Contractor response', type: 'textarea', span: 2 },
  { name: 'corrective_action', label: 'Corrective action', section: 'Contractor response', type: 'textarea', span: 2 }, { name: 'preventive_action', label: 'Preventive action', section: 'Contractor response', type: 'textarea', span: 2 },
  { name: 'estimated_completion_date', label: 'Estimated completion date', section: 'Contractor response', type: 'date' }, { name: 'delayed_completion_reason', label: 'Delayed completion reason', section: 'Contractor response', type: 'textarea' },
  { name: 'reviewer_comments', label: 'Reviewer comments', section: 'Review and closeout', type: 'textarea', span: 2 }, { name: 'reviewer_decision', label: 'Reviewer decision', section: 'Review and closeout' },
  { name: 'action_code', label: 'Action code', section: 'Review and closeout' }, { name: 'verification_comments', label: 'Verification comments', section: 'Review and closeout', type: 'textarea', span: 2 },
  { name: 'verified_by', label: 'Verified by', section: 'Review and closeout' }, { name: 'verification_date', label: 'Verification date', section: 'Review and closeout', type: 'date' },
  { name: 'assessment_decision', label: 'Engineer / Employer assessment', section: 'Review and closeout' }, { name: 'assessment_comments', label: 'Assessment comments', section: 'Review and closeout', type: 'textarea' },
  { name: 'closed_by', label: 'Closed by', section: 'Review and closeout' }, { name: 'closed_date', label: 'Closed date', section: 'Review and closeout', type: 'date' },
  { name: 'status', label: 'Status', section: 'Review and closeout', type: 'select', required: true, options: opt(issueStatuses), defaultValue: 'Open' }, ...procoreFields]; }

export function ncrFields(projects: Project[]): QualityRecordField[] { return [...identity(projects, 'ncr_number', 'NCR number'),
  { name: 'description', label: 'Description of non-conformance', section: 'Non-conformance', type: 'textarea', required: true, span: 2 }, { name: 'location', label: 'Location', section: 'Non-conformance' },
  { name: 'activity', label: 'Activity', section: 'Non-conformance' }, { name: 'severity', label: 'Severity', section: 'Non-conformance', type: 'select', required: true, options: opt(['Level 1','Level 2','Level 3','Level 4','Low','Medium','High','Critical']) },
  { name: 'issued_by', label: 'Issued by', section: 'Non-conformance' }, { name: 'issue_date', label: 'Issue date', section: 'Non-conformance', type: 'date' },
  { name: 'responsible_company', label: 'Responsible company', section: 'Accountability', required: true }, { name: 'assigned_person', label: 'Assigned person', section: 'Accountability', required: true },
  { name: 'due_date', label: 'Due date', section: 'Accountability', type: 'date', required: true },
  { name: 'root_cause', label: 'Root cause', section: 'Contractor response', type: 'textarea', span: 2 }, { name: 'corrective_action', label: 'Corrective action', section: 'Contractor response', type: 'textarea', span: 2 },
  { name: 'preventive_action', label: 'Preventive action', section: 'Contractor response', type: 'textarea', span: 2 }, { name: 'estimated_completion_date', label: 'Estimated completion date', section: 'Contractor response', type: 'date' },
  { name: 'delayed_completion_reason', label: 'Delayed completion reason', section: 'Contractor response', type: 'textarea' },
  { name: 'reviewer_comments', label: 'Reviewer comments', section: 'Review', type: 'textarea', span: 2 }, { name: 'action_code', label: 'Action code', section: 'Review' },
  { name: 'reviewer', label: 'Reviewer', section: 'Review' }, { name: 'review_date', label: 'Review date', section: 'Review', type: 'date' },
  { name: 'verification_comments', label: 'Verification comments', section: 'Verification and assessment', type: 'textarea', span: 2 }, { name: 'verified_by', label: 'Verified by', section: 'Verification and assessment' },
  { name: 'verification_date', label: 'Verification date', section: 'Verification and assessment', type: 'date' }, { name: 'assessment_decision', label: 'Assessment decision', section: 'Verification and assessment' },
  { name: 'engineer_action_code', label: 'Engineer action code', section: 'Verification and assessment' }, { name: 'assessment_comments', label: 'Assessment comments', section: 'Verification and assessment', type: 'textarea', span: 2 },
  { name: 'decision_source', label: 'Source of decision', section: 'Verification and assessment' }, { name: 'assessment_name', label: 'Engineer / Employer name', section: 'Verification and assessment' },
  { name: 'assessment_date', label: 'Assessment date', section: 'Verification and assessment', type: 'date' }, { name: 'final_status', label: 'Final status', section: 'Closeout' },
  { name: 'closed_by', label: 'Closed by', section: 'Closeout' }, { name: 'closed_date', label: 'Closed date', section: 'Closeout', type: 'date' },
  { name: 'status', label: 'Workflow status', section: 'Closeout', type: 'select', required: true, options: opt(issueStatuses), defaultValue: 'Open' }, ...procoreFields]; }

export function rrrFields(projects: Project[]): QualityRecordField[] { const mapped = projects.filter((project) => projectNamingCode(project.project_code)); return [
  { name: 'record_number', label: 'RRR record number', section: 'Record metadata', required: true }, { name: 'project_id', label: 'Project', section: 'Record metadata', type: 'select', required: true, options: mapped.map((project) => ({ value: project.id, label: `${project.project_code} · ${project.name}` })) },
  { name: 'record_date', label: 'Record date', section: 'Record metadata', type: 'date', required: true }, { name: 'submission_revision', label: 'Submission revision', section: 'Record metadata', required: true, defaultValue: 'R0.0' },
  { name: 'title', label: 'Title', section: 'Record metadata', required: true, span: 2 }, { name: 'discipline_code', label: 'Discipline', section: 'Record metadata', type: 'select', required: true, options: options(procoreReference.eas6bDisciplines) },
  { name: 'level_code', label: 'Level', section: 'Record metadata', type: 'select', required: true, options: options(procoreReference.eas6bLevels) }, { name: 'plan_area_code', label: 'Plan area', section: 'Record metadata', type: 'select', options: [{ value: '', label: 'Not used' }, ...options(procoreReference.eas6bPlanAreas)] },
  { name: 'volume_code', label: 'Volume', section: 'Record metadata', type: 'select', required: true, options: options(procoreReference.eas6bVolumes) }, { name: 'classification_code', label: 'Classification', section: 'Record metadata' },
  { name: 'project_phase', label: 'Project phase', section: 'Record metadata' }, { name: 'grid', label: 'Grid', section: 'Room identification' }, { name: 'room', label: 'Room', section: 'Room identification', required: true },
  { name: 'equipment_tag', label: 'Equipment tag', section: 'Room identification' }, { name: 'room_asset_code', label: 'Room / asset code', section: 'Room identification' }, { name: 'systems', label: 'Systems', section: 'Room identification' },
  { name: 'requested_by', label: 'Requested by', section: 'Room identification' }, { name: 'request_date', label: 'Request date', section: 'Room identification', type: 'date' }, { name: 'related_itp_reference', label: 'Related ITP reference', section: 'Room identification' },
  { name: 'employer_readiness_checklist_tracker_ref', label: 'Employer readiness tracker ref.', section: 'Room identification' }, { name: 'readiness_stage', label: 'Readiness stage', section: 'Room identification', type: 'select', required: true, options: opt(['Stage 1','Stage 2']), defaultValue: 'Stage 1' },
  { name: 'room_route', label: 'Room route', section: 'Room identification', type: 'select', required: true, options: opt(['Standard Room','ICT Room / Space']), defaultValue: 'Standard Room' },
  { name: 'overall_target_100_date', label: 'Overall target 100% date', section: 'Readiness declaration', type: 'date' }, { name: 'room_complete', label: 'Room complete', section: 'Readiness declaration', type: 'checkbox' },
  { name: 'no_open_p1_p2_items', label: 'No open P1 / P2 items', section: 'Readiness declaration', type: 'checkbox' }, { name: 'continuation_list_attached', label: 'Continuation list attached', section: 'Readiness declaration', type: 'checkbox' },
  { name: 'requested_inspection_date', label: 'Requested inspection date', section: 'Inspection request', type: 'date' }, { name: 'requested_inspection_time', label: 'Requested time', section: 'Inspection request', type: 'time' },
  { name: 'notice_given_working_days', label: 'Notice given (working days)', section: 'Inspection request', type: 'number' }, { name: 'energization_power_request_ref', label: 'Energization / power request ref.', section: 'Inspection request' },
  { name: 'inspection_purpose', label: 'Purpose', section: 'Inspection request', type: 'select', options: opt(['Room Readiness Stage 1','Room Readiness Stage 2','Pre-Energization L2B']) },
  { name: 'declaration_complete', label: 'Contractor declaration complete', section: 'Contractor declaration', type: 'checkbox' },
  { name: 'room_secured_under_control', label: 'Room secured and under control', section: 'Contractor declaration', type: 'checkbox' },
  { name: 'doors_installed_locked', label: 'Doors installed / locked', section: 'Contractor declaration', type: 'checkbox' },
  { name: 'access_retained_by_authorized_person', label: 'Key or access retained by Authorized Person / SAP', section: 'Contractor declaration', type: 'checkbox' },
  { name: 'permit_sleeve_fitted', label: 'Permit sleeve fitted', section: 'Contractor declaration', type: 'checkbox' },
  { name: 'loto_applied', label: 'LOTO applied', section: 'Contractor declaration', type: 'checkbox' },
  { name: 'live_warning_notices_fitted', label: 'Room Live / Equipment Live warning notices fitted', section: 'Contractor declaration', type: 'checkbox' },
  { name: 'life_safety_provisions_in_place', label: 'Life-safety provisions in place', section: 'Contractor declaration', type: 'checkbox' },
  { name: 'cleanliness_dust_control_maintained', label: 'Cleanliness and dust-control maintained', section: 'Contractor declaration', type: 'checkbox' },
  { name: 'engineer_decision', label: 'Engineer review', section: 'Review and release', type: 'select', options: opt(['Verified','Not Verified']) }, { name: 'engineer_name', label: 'Engineer name', section: 'Review and release' }, { name: 'engineer_date', label: 'Engineer date', section: 'Review and release', type: 'date' },
  { name: 'cxa_decision', label: 'CxA gate', section: 'Review and release', type: 'select', options: opt(['Accepted','Accepted with Conditions','Rejected']) }, { name: 'cxa_name', label: 'CxA name', section: 'Review and release' }, { name: 'cxa_date', label: 'CxA date', section: 'Review and release', type: 'date' },
  { name: 'employer_release', label: 'Employer release', section: 'Review and release', type: 'select', options: opt(['Room Released for Commissioning','Released for Energization — L2B Tags Signed Off','Not Released']) }, { name: 'employer_name', label: 'Employer name', section: 'Review and release' }, { name: 'employer_date', label: 'Employer date', section: 'Review and release', type: 'date' },
  { name: 'conditions_comments', label: 'Conditions / comments', section: 'Review and release', type: 'textarea', span: 2 }, { name: 'resubmission_required', label: 'Resubmission required', section: 'Review and release', type: 'checkbox' }, { name: 'next_rrr_record_number', label: 'Next RRR record number', section: 'Review and release' },
  { name: 'next_submission_revision', label: 'Next submission revision', section: 'Review and release' }, { name: 'status', label: 'Workflow status', section: 'Review and release', type: 'select', required: true, options: opt(rrrStatuses), defaultValue: 'Draft' },
  { name: 'procore_reference', label: 'Procore reference', section: 'Procore metadata' }, { name: 'source_filename', label: 'Source filename metadata', section: 'Procore metadata' },
]; }
