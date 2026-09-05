'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import type { CrudActionResult } from '@/app/actions/records';
import { recordProject, type RecordKind } from '@/lib/services/record-links';
import { rrrReleaseIssues } from '@/lib/quality-records/rrr-gate';
import { requireUser } from '@/lib/auth';
import {
  generateQualityDocumentCode,
  issueStatuses,
  reviewStatuses,
  RRR_DOCUMENT_CODE,
  RRR_TEMPLATE_CODE,
  rrrReadinessControls,
  rrrStatuses,
} from '@/lib/quality-records/model';
import { officialReferenceLabel, procoreReference } from '@/lib/procore/reference';
import { projectNamingCode } from '@/lib/procore/naming';
import { createV2Record, deleteV2Record, updateV2Record } from '@/lib/services/quality-records';
import { serviceError } from '@/lib/services/shared';
import { createClient } from '@/lib/supabase/server';
import type { TablesInsert, TablesUpdate } from '@/types/database';

const required = (label: string) => z.string().trim().min(1, `${label} is required.`);
const optional = z.string().trim().transform((value) => value || null);
const optionalDate = z.string().refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Enter a valid date.').transform((value) => value || null);
const date = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required.`);
const idSchema = z.uuid('The selected record is invalid.');
const codes = (items: { code: string }[]) => items.map((item) => item.code) as [string, ...string[]];
const identitySchema = z.object({
  project_id: idSchema,
  project_code: required('Project code'),
  discipline_code: z.enum(codes(procoreReference.eas6bDisciplines)),
  level_code: z.enum(codes(procoreReference.eas6bLevels)),
  plan_area_code: z.union([z.enum(codes(procoreReference.eas6bPlanAreas)), z.literal('')]).transform((value) => value || null),
  volume_code: z.enum(codes(procoreReference.eas6bVolumes)),
  classification_code: z.enum(codes(procoreReference.eas6bClassifications)),
  originator_code: z.enum(codes(procoreReference.eas6bOriginators)),
  revision: required('Revision').regex(/^[A-Z][0-9]{2}$/, 'Use revision format R00.'),
  record_date: date('Record date'),
  title: required('Title'),
  procore_reference: optional,
  workflow_status: optional,
  current_workflow_step: optional,
  current_step_assignees: optional,
  source_filename: optional,
});

const mirSchema = identitySchema.extend({
  mir_number: required('MIR number').regex(/^MIR\.[0-9]{4}$/, 'Use MIR.0001.'),
  material_title: required('Material title'), description: optional, supplier: optional, manufacturer: optional,
  supply_reference: optional, delivery_note_reference: optional, package_system: optional, contractor_work_package: optional,
  installation_location: optional, batch_heat_lot_no: optional, serial_asset_tag: optional, approved_quantity: optional,
  quantity_presented: optional, delivery_date: optionalDate, shelf_life_expiry: optionalDate, storage_receipt_condition: optional,
  traceability_mark_tag: optional, material_submittal_reference: optional, itp_reference: optional, specification_reference: optional,
  approved_drawing_reference: optional, test_certificate_reference: optional, manufacturer_datasheet_reference: optional,
  inspection_findings: optional, required_action_restriction: optional, reviewer: optional, review_decision: optional,
  review_comments: optional, final_material_disposition: optional, release_basis: optional, closure_date: optionalDate,
  status: z.enum(reviewStatuses),
});

const sorSchema = identitySchema.extend({
  sor_number: required('SOR number').regex(/^SOR\.[0-9]{4}$/, 'Use SOR.0001.'),
  description: required('Observation description'), location: optional, activity: optional, severity: optional,
  issued_by: optional, issue_date: optionalDate, contractor_proposal: optional, root_cause: optional,
  corrective_action: optional, preventive_action: optional, estimated_completion_date: optionalDate,
  delayed_completion_reason: optional, reviewer_comments: optional, reviewer_decision: optional, action_code: optional,
  verification_comments: optional, verified_by: optional, verification_date: optionalDate, assessment_decision: optional,
  assessment_comments: optional, closed_date: optionalDate, closed_by: optional, status: z.enum(issueStatuses),
});

const ncrSchema = identitySchema.extend({
  ncr_number: required('NCR number').max(50), description: required('Non-conformance description'), location: optional,
  activity: optional, severity: required('Severity'), issued_by: optional, issue_date: optionalDate,
  responsible_company: required('Responsible company'), assigned_person: required('Assigned person'), due_date: date('Due date'),
  root_cause: optional, corrective_action: optional, preventive_action: optional, estimated_completion_date: optionalDate,
  delayed_completion_reason: optional, reviewer_comments: optional, action_code: optional, reviewer: optional, review_date: optionalDate,
  verification_comments: optional, verified_by: optional, verification_date: optionalDate, assessment_decision: optional,
  engineer_action_code: optional, assessment_comments: optional, decision_source: optional, assessment_date: optionalDate,
  assessment_name: optional, final_status: optional, closed_date: optionalDate, closed_by: optional, status: z.enum(issueStatuses),
});

const rrrSchema = z.object({
  project_id: idSchema,
  record_number: required('RRR record number').regex(/^RRR\.[0-9]{6}$/, 'Use RRR.000001.'),
  record_date: date('Record date'), submission_revision: required('Submission revision').regex(/^R[0-9]+\.[0-9]+$/, 'Use R0.0, R0.1, or R1.0.'),
  discipline_code: z.enum(codes(procoreReference.eas6bDisciplines)), level_code: z.enum(codes(procoreReference.eas6bLevels)),
  plan_area_code: z.union([z.enum(codes(procoreReference.eas6bPlanAreas)), z.literal('')]).transform((value) => value || null),
  volume_code: z.enum(codes(procoreReference.eas6bVolumes)), grid: optional, room: required('Room'), equipment_tag: optional,
  classification_code: optional, title: required('Title'), project_phase: optional, room_asset_code: optional, systems: optional,
  requested_by: optional, request_date: optionalDate, related_itp_reference: optional, employer_readiness_checklist_tracker_ref: optional,
  readiness_stage: z.enum(['Stage 1', 'Stage 2']), room_route: z.enum(['Standard Room', 'ICT Room / Space']),
  overall_target_100_date: optionalDate, requested_inspection_date: optionalDate, requested_inspection_time: z.string().refine((v) => !v || /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v), 'Enter a valid time.').transform((v) => v || null),
  notice_given_working_days: z.string().refine((value) => !value || /^\d+$/.test(value), 'Notice must be zero or a positive number.').transform((value) => value ? Number(value) : null),
  energization_power_request_ref: optional, inspection_purpose: optional, engineer_decision: optional, engineer_name: optional,
  engineer_date: optionalDate, cxa_decision: optional, cxa_name: optional, cxa_date: optionalDate, employer_release: optional,
  employer_name: optional, employer_date: optionalDate, conditions_comments: optional, next_rrr_record_number: optional,
  next_submission_revision: optional, procore_reference: optional, source_filename: optional, status: z.enum(rrrStatuses),
});

function raw(formData: FormData) { return Object.fromEntries(formData.entries()); }
function textValue(formData: FormData, key: string) { const value = formData.get(key); return typeof value === 'string' ? value : ''; }
function invalid(error: z.ZodError): CrudActionResult { return { success: false, message: error.issues[0]?.message ?? 'Check the required fields.' }; }
function bool(formData: FormData, key: string) { return formData.get(key) === 'on' || formData.get(key) === 'true'; }
async function context() { const user = await requireUser(); const client = await createClient(); return { user, client }; }
function done(error: string | null, paths: string[], noun: string): CrudActionResult { if (error) return { success: false, message: error }; paths.forEach((path) => revalidatePath(path)); revalidatePath('/'); return { success: true, message: `${noun} saved successfully.` }; }

async function verifyProject(client: Awaited<ReturnType<typeof createClient>>, projectId: string, submittedCode: string) {
  const { data, error } = await client.from('projects').select('project_code').eq('id', projectId).maybeSingle();
  const code = data ? projectNamingCode(data.project_code) : null;
  if (error || !code) return { code: null, error: 'The selected project is not mapped to IL051.' };
  if (code !== submittedCode) return { code: null, error: 'The project code changed. Re-select the project.' };
  return { code, error: null };
}

function commonIdentity(data: z.infer<typeof identitySchema>, recordType: 'MIR' | 'NCR' | 'SOR', recordNumber: string) {
  return {
    project_id: data.project_id, document_code: generateQualityDocumentCode({ projectCode: data.project_code, recordType, recordNumber,
      disciplineCode: data.discipline_code, levelCode: data.level_code, planAreaCode: data.plan_area_code,
      volumeCode: data.volume_code, classificationCode: data.classification_code, originatorCode: data.originator_code }),
    revision: data.revision, record_date: data.record_date, file_type_code: 'IP',
    discipline: officialReferenceLabel(procoreReference.eas6bDisciplines, data.discipline_code), discipline_code: data.discipline_code,
    level_code: data.level_code, plan_area_code: data.plan_area_code, volume_code: data.volume_code,
    classification_code: data.classification_code, originator_code: data.originator_code, title: data.title,
    procore_reference: data.procore_reference, workflow_status: data.workflow_status, current_workflow_step: data.current_workflow_step,
    current_step_assignees: data.current_step_assignees, source_filename: data.source_filename,
  };
}

export async function createMirAction(formData: FormData): Promise<CrudActionResult> {
  const parsed = mirSchema.safeParse(raw(formData)); if (!parsed.success) return invalid(parsed.error);
  const { user, client } = await context(); const project = await verifyProject(client, parsed.data.project_id, parsed.data.project_code); if (project.error) return { success: false, message: project.error };
  const payload = { ...parsed.data, ...commonIdentity(parsed.data, 'MIR', parsed.data.mir_number), created_by: user.id };
  delete (payload as Record<string, unknown>).project_code;
  const result = await createV2Record(client, 'mir_records', payload as TablesInsert<'mir_records'>);
  return done(result.error, ['/mir'], 'MIR');
}
export async function updateMirAction(formData: FormData): Promise<CrudActionResult> {
  const id = idSchema.safeParse(formData.get('id')); const parsed = mirSchema.safeParse(raw(formData)); if (!id.success) return invalid(id.error); if (!parsed.success) return invalid(parsed.error);
  const { client } = await context(); const project = await verifyProject(client, parsed.data.project_id, parsed.data.project_code); if (project.error) return { success: false, message: project.error };
  const payload = { ...parsed.data, ...commonIdentity(parsed.data, 'MIR', parsed.data.mir_number) }; delete (payload as Record<string, unknown>).project_code;
  return done(await updateV2Record(client, 'mir_records', id.data, payload as TablesUpdate<'mir_records'>), ['/mir', `/mir/${id.data}`], 'MIR');
}
export async function deleteMirAction(formData: FormData): Promise<CrudActionResult> { return deleteRecord(formData, 'mir_records', '/mir', 'MIR'); }

export async function createSorAction(formData: FormData): Promise<CrudActionResult> {
  const parsed = sorSchema.safeParse(raw(formData)); if (!parsed.success) return invalid(parsed.error); const { user, client } = await context();
  const project = await verifyProject(client, parsed.data.project_id, parsed.data.project_code); if (project.error) return { success: false, message: project.error };
  const payload = { ...parsed.data, ...commonIdentity(parsed.data, 'SOR', parsed.data.sor_number), created_by: user.id }; delete (payload as Record<string, unknown>).project_code;
  const result = await createV2Record(client, 'sor_records', payload as TablesInsert<'sor_records'>); return done(result.error, ['/sor'], 'SOR');
}
export async function updateSorAction(formData: FormData): Promise<CrudActionResult> {
  const id = idSchema.safeParse(formData.get('id')); const parsed = sorSchema.safeParse(raw(formData)); if (!id.success) return invalid(id.error); if (!parsed.success) return invalid(parsed.error);
  const { client } = await context(); const project = await verifyProject(client, parsed.data.project_id, parsed.data.project_code); if (project.error) return { success: false, message: project.error };
  const payload = { ...parsed.data, ...commonIdentity(parsed.data, 'SOR', parsed.data.sor_number) }; delete (payload as Record<string, unknown>).project_code;
  return done(await updateV2Record(client, 'sor_records', id.data, payload as TablesUpdate<'sor_records'>), ['/sor', `/sor/${id.data}`], 'SOR');
}
export async function deleteSorAction(formData: FormData): Promise<CrudActionResult> { return deleteRecord(formData, 'sor_records', '/sor', 'SOR'); }

export async function createNcrV2Action(formData: FormData): Promise<CrudActionResult> {
  if (!/^NCR\.[0-9]{4}$/.test(textValue(formData, 'ncr_number'))) return { success: false, message: 'Use NCR.0001 for a new NCR.' };
  const parsed = ncrSchema.safeParse(raw(formData)); if (!parsed.success) return invalid(parsed.error); const { user, client } = await context();
  const project = await verifyProject(client, parsed.data.project_id, parsed.data.project_code); if (project.error) return { success: false, message: project.error };
  const common = commonIdentity(parsed.data, 'NCR', parsed.data.ncr_number);
  const payload = { ...parsed.data, ...common, area: parsed.data.location ?? 'Not provided', date_raised: parsed.data.issue_date ?? parsed.data.record_date,
    issue_date: parsed.data.issue_date ?? parsed.data.record_date, responsible_company: parsed.data.responsible_company, assigned_person: parsed.data.assigned_person,
    created_by: user.id, final_status: parsed.data.final_status ?? parsed.data.status };
  delete (payload as Record<string, unknown>).project_code;
  const { error } = await client.from('ncrs').insert(payload as TablesInsert<'ncrs'>); return done(error ? serviceError(error, 'NCR could not be created.') : null, ['/ncr'], 'NCR');
}
export async function updateNcrV2Action(formData: FormData): Promise<CrudActionResult> {
  const id = idSchema.safeParse(formData.get('id')); const parsed = ncrSchema.safeParse(raw(formData)); if (!id.success) return invalid(id.error); if (!parsed.success) return invalid(parsed.error);
  const { client } = await context(); const project = await verifyProject(client, parsed.data.project_id, parsed.data.project_code); if (project.error) return { success: false, message: project.error };
  const common = commonIdentity(parsed.data, 'NCR', parsed.data.ncr_number); const payload = { ...parsed.data, ...common, area: parsed.data.location ?? 'Not provided',
    date_raised: parsed.data.issue_date ?? parsed.data.record_date, issue_date: parsed.data.issue_date ?? parsed.data.record_date, final_status: parsed.data.final_status ?? parsed.data.status };
  delete (payload as Record<string, unknown>).project_code; const { error } = await client.from('ncrs').update(payload as TablesUpdate<'ncrs'>).eq('id', id.data);
  return done(error ? serviceError(error, 'NCR could not be updated.') : null, ['/ncr', `/ncr/${id.data}`], 'NCR');
}
export async function deleteNcrV2Action(formData: FormData): Promise<CrudActionResult> {
  const id = idSchema.safeParse(formData.get('id')); if (!id.success) return invalid(id.error); const { client } = await context(); const { error } = await client.from('ncrs').delete().eq('id', id.data);
  return done(error ? serviceError(error, 'NCR could not be deleted.') : null, ['/ncr'], 'NCR');
}

export async function createRrrAction(formData: FormData): Promise<CrudActionResult> {
  const parsed = rrrSchema.safeParse(raw(formData)); if (!parsed.success) return invalid(parsed.error); const { user, client } = await context();
  const project = await client.from('projects').select('project_code').eq('id', parsed.data.project_id).maybeSingle();
  if (project.error || !project.data || projectNamingCode(project.data.project_code) !== 'IL051') return { success: false, message: 'RRR uses the fixed IL051 template. Select the IL051 project.' };
  const affirmativeRelease = ['Room Released for Commissioning','Released for Energization — L2B Tags Signed Off'].includes(parsed.data.employer_release ?? '');
  if (affirmativeRelease || ['Released for Commissioning','Released for Energization'].includes(parsed.data.status)) return { success: false, message: 'A new RRR starts with incomplete readiness rows. Record RR-4 and close P1/P2 blockers before entering an Employer release.' };
  const payload: TablesInsert<'rrr_records'> = { ...parsed.data, document_code: RRR_DOCUMENT_CODE, template_code: RRR_TEMPLATE_CODE,
    discipline: officialReferenceLabel(procoreReference.eas6bDisciplines, parsed.data.discipline_code), room_complete: bool(formData, 'room_complete'),
    no_open_p1_p2_items: bool(formData, 'no_open_p1_p2_items'), continuation_list_attached: bool(formData, 'continuation_list_attached'),
    declaration_complete: bool(formData, 'declaration_complete'), resubmission_required: bool(formData, 'resubmission_required'), created_by: user.id };
  Object.assign(payload, declarationChecks(formData));
  const result = await createV2Record(client, 'rrr_records', payload); if (result.error || !result.id) return { success: false, message: result.error ?? 'RRR could not be created.' };
  const readiness = rrrReadinessControls.map((controlLevel, index) => ({ rrr_id: result.id!, control_level: controlLevel, percent_complete: 0, open_actions_count: 0, sort_order: index + 1 }));
  const revision = { rrr_id: result.id, submission_revision: parsed.data.submission_revision, submitted_date: parsed.data.status === 'Draft' ? null : parsed.data.record_date, source_reason: 'Initial submission', revised_by: parsed.data.requested_by, status: parsed.data.status, created_by: user.id };
  const [readinessResult, revisionResult] = await Promise.all([client.from('rrr_readiness_controls').upsert(readiness, { onConflict: 'rrr_id,control_level', ignoreDuplicates: true }), client.from('rrr_submission_revisions').upsert(revision, { onConflict: 'rrr_id,submission_revision', ignoreDuplicates: true })]);
  const childError = readinessResult.error ?? revisionResult.error;
  done(null, ['/rrr'], 'RRR');
  return { success: true, message: childError ? 'RRR created. Its readiness/history could not be initialized; apply migration 008 and contact your administrator before proceeding. Do not create a duplicate.' : 'RRR saved successfully.' };
}
export async function updateRrrAction(formData: FormData): Promise<CrudActionResult> {
  const id = idSchema.safeParse(formData.get('id')); const parsed = rrrSchema.safeParse(raw(formData)); if (!id.success) return invalid(id.error); if (!parsed.success) return invalid(parsed.error); const { client, user } = await context();
  const [currentResult, rr4Result, blockersResult] = await Promise.all([
    client.from('rrr_records').select('submission_revision, project_id').eq('id', id.data).maybeSingle(),
    client.from('rrr_readiness_controls').select('control_level, percent_complete, open_actions_count').eq('rrr_id', id.data).like('control_level', 'RR-4%').maybeSingle(),
    client.from('rrr_open_items').select('id').eq('rrr_id', id.data).in('priority', ['P1','P2']).neq('status', 'Closed').limit(1),
  ]);
  if (currentResult.error || rr4Result.error || blockersResult.error || !currentResult.data) return { success: false, message: 'RRR readiness could not be verified. Nothing was saved.' };
  const current = currentResult.data; const rr4 = rr4Result.data; const blockers = blockersResult.data;
  if (current.project_id !== parsed.data.project_id) return { success: false, message: 'An existing RRR cannot be moved to another project.' };
  const gateIssues = rrrReleaseIssues({ ...parsed.data, ...declarationChecks(formData), room_complete: bool(formData, 'room_complete'), no_open_p1_p2_items: bool(formData, 'no_open_p1_p2_items'), declaration_complete: bool(formData, 'declaration_complete') }, rr4 ? [rr4] : [], blockers?.map(() => ({ priority: 'P1', status: 'Open' })) ?? []);
  if (gateIssues.length) return { success: false, message: gateIssues.join(' ') };
  if (parsed.data.status === 'Released for Energization') {
    const tags = await client.from('rrr_commissioning_tags').select('cxa_signoff_date, reference').eq('rrr_id', id.data).eq('tag_type', 'L2B YELLOW TAG');
    if (tags.error || !tags.data?.length || tags.data.some((t) => !t.cxa_signoff_date || !t.reference?.trim())) return { success: false, message: 'Energization release requires referenced, signed-off L2B tags.' };
  }
  const affirmativeRelease = ['Room Released for Commissioning','Released for Energization — L2B Tags Signed Off'].includes(parsed.data.employer_release ?? '');
  const releaseRequested = affirmativeRelease || ['Released for Commissioning','Released for Energization'].includes(parsed.data.status);
  const declarationReady = Object.values(declarationChecks(formData)).every(Boolean);
  const releaseBlocked = !rr4 || rr4.percent_complete < 100 || rr4.open_actions_count > 0 || Boolean(blockers?.length) || !bool(formData, 'room_complete') || !bool(formData, 'no_open_p1_p2_items') || !bool(formData, 'declaration_complete') || !declarationReady;
  if (releaseRequested && releaseBlocked) return { success: false, message: 'RRR release is blocked until RR-4 is 100%, RR-4 open actions are zero, no P1/P2 item is open, and every readiness and contractor declaration confirmation is checked.' };
  if (parsed.data.employer_release?.startsWith('Released for Energization') && (parsed.data.engineer_decision !== 'Verified' || !['Accepted','Accepted with Conditions'].includes(parsed.data.cxa_decision ?? ''))) return { success: false, message: 'Energization release requires Engineer verification and an Accepted or Accepted with Conditions CxA decision.' };
  const payload: TablesUpdate<'rrr_records'> = { ...parsed.data, document_code: RRR_DOCUMENT_CODE, template_code: RRR_TEMPLATE_CODE,
    discipline: officialReferenceLabel(procoreReference.eas6bDisciplines, parsed.data.discipline_code), room_complete: bool(formData, 'room_complete'),
    no_open_p1_p2_items: bool(formData, 'no_open_p1_p2_items'), continuation_list_attached: bool(formData, 'continuation_list_attached'),
    declaration_complete: bool(formData, 'declaration_complete'), resubmission_required: bool(formData, 'resubmission_required') };
  Object.assign(payload, declarationChecks(formData));
  const updateError = await updateV2Record(client, 'rrr_records', id.data, payload);
  if (updateError) return done(updateError, ['/rrr', `/rrr/${id.data}`], 'RRR');
  if (current && current.submission_revision !== parsed.data.submission_revision) {
    const { error } = await client.from('rrr_submission_revisions').upsert({ rrr_id: id.data, submission_revision: parsed.data.submission_revision, submitted_date: parsed.data.record_date, source_reason: 'Record resubmission', revised_by: parsed.data.requested_by, status: parsed.data.status, created_by: user.id }, { onConflict: 'rrr_id,submission_revision', ignoreDuplicates: true });
    if (error) { done(null, ['/rrr', `/rrr/${id.data}`], 'RRR'); return { success: true, message: 'RRR updated, but history could not be recorded. Apply migration 008 before further revisions.' }; }
  }
  return done(null, ['/rrr', `/rrr/${id.data}`], 'RRR');
}
export async function deleteRrrAction(formData: FormData): Promise<CrudActionResult> { return deleteRecord(formData, 'rrr_records', '/rrr', 'RRR'); }

async function deleteRecord(formData: FormData, table: 'mir_records' | 'sor_records' | 'rrr_records', route: string, noun: string) {
  const id = idSchema.safeParse(formData.get('id')); if (!id.success) return invalid(id.error); const { client } = await context();
  return done(await deleteV2Record(client, table, id.data), [route], noun);
}

function declarationChecks(formData: FormData) { return {
  room_secured_under_control: bool(formData, 'room_secured_under_control'), doors_installed_locked: bool(formData, 'doors_installed_locked'),
  access_retained_by_authorized_person: bool(formData, 'access_retained_by_authorized_person'), permit_sleeve_fitted: bool(formData, 'permit_sleeve_fitted'),
  loto_applied: bool(formData, 'loto_applied'), live_warning_notices_fitted: bool(formData, 'live_warning_notices_fitted'),
  life_safety_provisions_in_place: bool(formData, 'life_safety_provisions_in_place'), cleanliness_dust_control_maintained: bool(formData, 'cleanliness_dust_control_maintained'),
}; }

export async function saveRrrReadinessAction(formData: FormData): Promise<CrudActionResult> {
  const id = idSchema.safeParse(formData.get('id')); const rrrId = idSchema.safeParse(formData.get('rrr_id')); const percent = Number(formData.get('percent_complete')); const actions = Number(formData.get('open_actions_count'));
  if (!id.success) return invalid(id.error); if (!rrrId.success) return invalid(rrrId.error); if (!Number.isInteger(percent) || percent < 0 || percent > 100) return { success: false, message: 'Percent complete must be between 0 and 100.' };
  if (!Number.isInteger(actions) || actions < 0) return { success: false, message: 'Open actions cannot be negative.' }; const { client } = await context();
  const { error } = await client.from('rrr_readiness_controls').update({ responsible: textValue(formData, 'responsible') || null, percent_complete: percent, open_actions_count: actions, checklist_reference: textValue(formData, 'checklist_reference') || null }).eq('id', id.data).eq('rrr_id', rrrId.data);
  return done(error ? serviceError(error, 'Readiness control could not be updated.') : null, [`/rrr/${rrrId.data}`, '/rrr'], 'Readiness control');
}

export async function addQualityAction(formData: FormData): Promise<CrudActionResult> {
  const parsed = z.object({ project_id: idSchema, parent_record_id: idSchema, parent_record_type: z.enum(['NCR','SOR','RRR']), action_description: required('Action'), responsible_person: required('Responsible person'), due_date: date('Due date') }).safeParse(raw(formData));
  if (!parsed.success) return invalid(parsed.error); const { user, client } = await context();
  if (await recordProject(client, parsed.data.parent_record_type, parsed.data.parent_record_id) !== parsed.data.project_id) return { success: false, message: 'The action must belong to its parent record project.' };
  const { error } = await client.from('quality_record_actions').insert({ ...parsed.data, status: 'Open', created_by: user.id });
  const route = `/${parsed.data.parent_record_type.toLowerCase()}/${parsed.data.parent_record_id}`; return done(error ? serviceError(error, 'Action could not be added.') : null, [route], 'Action');
}

export async function updateQualityAction(formData: FormData): Promise<CrudActionResult> {
  const parsed = z.object({ id: idSchema, parent_record_id: idSchema, parent_record_type: z.enum(['NCR','SOR','RRR']), status: z.enum(['Open','In Progress','Verified','Closed']), completion_date: optionalDate, verification_note: optional }).superRefine((value, check) => {
    if (['Verified','Closed'].includes(value.status) && !value.verification_note) check.addIssue({ code: 'custom', path: ['verification_note'], message: 'A verification note is required before an action is verified or closed.' });
  }).safeParse(raw(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { client } = await context();
  const { id, parent_record_id, parent_record_type, ...updates } = parsed.data;
  const completionDate = ['Verified','Closed'].includes(updates.status) ? updates.completion_date ?? new Date().toISOString().slice(0, 10) : null;
  const { error } = await client.from('quality_record_actions').update({ ...updates, completion_date: completionDate }).eq('id', id).eq('parent_record_id', parent_record_id).eq('parent_record_type', parent_record_type);
  const route = `/${parent_record_type.toLowerCase()}/${parent_record_id}`;
  return done(error ? serviceError(error, 'Action could not be updated.') : null, [route], 'Action');
}

export async function addRrrOpenItem(formData: FormData): Promise<CrudActionResult> {
  const parsed = z.object({ rrr_id: idSchema, item_number: required('Item number'), reference: optional, reference_type: optional, description: required('Description'), priority: z.enum(['P1','P2','P3','P4']), raised_by: optional, target_date: optionalDate, status: z.enum(['Open','Closed','Disputed']), linked_record_type: z.union([z.enum(['WIR','MIR','NCR','SOR','RRR']), z.literal('')]).transform((v) => v || null), linked_record_id: z.string().trim().refine((value) => !value || z.uuid().safeParse(value).success, 'Linked record ID must be a UUID.').transform((value) => value || null) }).safeParse(raw(formData));
  if (!parsed.success) return invalid(parsed.error); const { client } = await context(); const { error } = await saveChild(client, 'rrr_open_items', formData, parsed.data); return done(error ? serviceError(error, 'Open item could not be added.') : null, [`/rrr/${parsed.data.rrr_id}`], 'Open item');
}

export async function addRrrEvidence(formData: FormData): Promise<CrudActionResult> {
  const parsed = z.object({ rrr_id: idSchema, evidence_type: required('Evidence type'), reference: required('Reference'), evidence_date: optionalDate, linked_record_type: z.union([z.enum(['WIR','MIR','NCR','SOR','RRR']), z.literal('')]).transform((v) => v || null), linked_record_id: z.string().trim().refine((value) => !value || z.uuid().safeParse(value).success, 'Linked record ID must be a UUID.').transform((value) => value || null) }).safeParse(raw(formData));
  if (!parsed.success) return invalid(parsed.error); const { client } = await context(); const { error } = await saveChild(client, 'rrr_evidence', formData, { ...parsed.data, uploaded: bool(formData, 'uploaded'), approved: bool(formData, 'approved') }); return done(error ? serviceError(error, 'Evidence could not be added.') : null, [`/rrr/${parsed.data.rrr_id}`], 'Evidence');
}

export async function addRrrRevision(formData: FormData): Promise<CrudActionResult> {
  const parsed = z.object({ rrr_id: idSchema, submission_revision: required('Submission revision').regex(/^R[0-9]+\.[0-9]+$/, 'Use R0.0, R0.1, or R1.0.'), submitted_date: optionalDate, returned_date: optionalDate, submission_transmittal_reference: optional, source_reason: required('Source / reason'), revised_by: optional, status: required('Status') }).safeParse(raw(formData));
  if (!parsed.success) return invalid(parsed.error); const { user, client } = await context(); const { error } = await client.from('rrr_submission_revisions').insert({ ...parsed.data, created_by: user.id }); return done(error ? serviceError(error, 'Revision could not be added. Submission revisions are append-only and must be unique.') : null, [`/rrr/${parsed.data.rrr_id}`], 'Submission revision');
}

export async function addRrrTag(formData: FormData): Promise<CrudActionResult> {
  const parsed = z.object({ rrr_id: idSchema, tag_type: z.enum(['L2A RED TAG','L2B YELLOW TAG','CONDITIONAL YELLOW TAG / CYT']), asset_equipment: optional, facility_grid_status: optional, cxa_signoff_date: optionalDate, reference: optional, status: optional }).safeParse(raw(formData));
  if (!parsed.success) return invalid(parsed.error); const { client } = await context(); const { error } = await saveChild(client, 'rrr_commissioning_tags', formData, parsed.data); return done(error ? serviceError(error, 'Commissioning tag could not be added.') : null, [`/rrr/${parsed.data.rrr_id}`], 'Commissioning tag');
}

export async function addRrrAttendance(formData: FormData): Promise<CrudActionResult> {
  const parsed = z.object({ rrr_id: idSchema, attendance_group: z.enum(['External','SERBAN']), attendee_role: required('Attendee role'), attendee_name: optional }).safeParse(raw(formData));
  if (!parsed.success) return invalid(parsed.error); const { client } = await context(); const { error } = await saveChild(client, 'rrr_attendance', formData, { ...parsed.data, required: bool(formData, 'required'), attended: bool(formData, 'attended') }); return done(error ? serviceError(error, 'Attendance row could not be added.') : null, [`/rrr/${parsed.data.rrr_id}`], 'Attendance row');
}

export async function addRrrSignatory(formData: FormData): Promise<CrudActionResult> {
  const parsed = z.object({ rrr_id: idSchema, role: required('Signatory role'), name: optional, signed_date: optionalDate, signature_status: optional, signature_reference: optional }).safeParse(raw(formData));
  if (!parsed.success) return invalid(parsed.error); const { client } = await context(); const { error } = await saveChild(client, 'rrr_signatories', formData, parsed.data); return done(error ? serviceError(error, 'Signatory could not be added.') : null, [`/rrr/${parsed.data.rrr_id}`], 'Signatory');
}

export async function addRrrAttachment(formData: FormData): Promise<CrudActionResult> {
  const parsed = z.object({ rrr_id: idSchema, attachment_type: required('Attachment type'), document_evidence_reference: required('Document / evidence reference'), revision: optional, attachment_date: optionalDate, originator: optional, linked_submission_revision: optional, status: optional }).safeParse(raw(formData));
  if (!parsed.success) return invalid(parsed.error); const { client } = await context(); const { error } = await saveChild(client, 'rrr_linked_attachments', formData, parsed.data); return done(error ? serviceError(error, 'Attachment metadata could not be added.') : null, [`/rrr/${parsed.data.rrr_id}`], 'Attachment metadata');
}

type ChildTable = 'rrr_open_items' | 'rrr_evidence' | 'rrr_commissioning_tags' | 'rrr_attendance' | 'rrr_signatories' | 'rrr_linked_attachments';
async function saveChild<T extends ChildTable>(client: Awaited<ReturnType<typeof createClient>>, table: T, formData: FormData, payload: TablesInsert<T> & { rrr_id: string }) {
  const parentProject = await recordProject(client, 'RRR', payload.rrr_id);
  const link = payload as { linked_record_id?: string | null; linked_record_type?: RecordKind | null };
  if (!parentProject || (link.linked_record_id && (!link.linked_record_type || await recordProject(client, link.linked_record_type, link.linked_record_id) !== parentProject))) return { error: { code: '23514', message: 'Invalid record relationship.', details: '', hint: '' } };
  const suppliedId = formData.get('id');
  const id = suppliedId ? idSchema.safeParse(suppliedId) : null;
  if (id && !id.success) return { error: { code: '23514', message: 'Invalid child record ID.', details: '', hint: '' } };
  // A single table-typed boundary; values are validated by each public action.
  // oxlint-disable-next-line typescript/no-explicit-any
  const query = (client as any).from(table);
  return id?.success ? await query.update(payload).eq('id', id.data).eq('rrr_id', payload.rrr_id).select('id').single() : await query.insert(payload);
}
