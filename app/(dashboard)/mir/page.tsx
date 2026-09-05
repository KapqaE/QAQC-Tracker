import { createMirAction, deleteMirAction, updateMirAction } from '@/app/actions/quality-records';
import { QualityRecordManager, type QualityRecordColumn } from '@/components/quality-records/quality-record-manager';
import { mirFields } from '@/lib/quality-records/form-config';
import { suggestNextRecordNumber } from '@/lib/quality-records/model';
import { toQualityRecordRow, todayIso } from '@/lib/quality-records/presentation';
import { listV2Records } from '@/lib/services/quality-records';
import { getProjectContext } from '@/lib/project-context';
import { ProjectRequired } from '@/components/shared/project-required';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const columns: QualityRecordColumn[] = [
  { key: 'mir_number', label: 'Record no', style: 'mono' }, { key: 'document_code', label: 'Document code', style: 'mono' },
  { key: 'material_title', label: 'Material / description', style: 'primary' }, { key: 'revision', label: 'Rev', style: 'muted' },
  { key: 'discipline', label: 'Discipline', style: 'muted' }, { key: 'installation_location', label: 'Location', style: 'muted' },
  { key: 'record_date', label: 'Record date', style: 'date' }, { key: 'reviewer', label: 'Reviewer', style: 'muted' }, { key: 'status', label: 'Status', style: 'status' },
];
export default async function MirPage() { const client = await createClient(); const context = await getProjectContext(); if (!context.activeProject) return <ProjectRequired message={context.error ?? undefined} />; const active = context.activeProject; const [records, projects] = await Promise.all([listV2Records(client, 'mir_records', active.id), Promise.resolve({ data: [active], error: context.error })]);
  return <QualityRecordManager key={active.id} module="MIR" title="Material Inspection Requests" description="Trace delivery, compliance evidence, inspection findings, review and final material release in one controlled register." noun="material inspection request" route="/mir" rows={records.data.map((row) => toQualityRecordRow(row))} columns={columns} fields={mirFields(projects.data)} createAction={createMirAction} updateAction={updateMirAction} deleteAction={deleteMirAction} loadError={records.error ?? projects.error} createDefaults={{ project_id: active.id, project_code: active.project_code === 'IL05' ? 'IL051' : active.project_code, mir_number: suggestNextRecordNumber('MIR', records.data.map((row) => row.mir_number)), record_date: todayIso(), revision: 'R00', originator_code: 'SRB', status: 'Draft', level_code: 'XX', volume_code: 'XX', classification_code: 'XXXX' }} />; }
