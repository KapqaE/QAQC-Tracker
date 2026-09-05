import { createSorAction, deleteSorAction, updateSorAction } from '@/app/actions/quality-records';
import { QualityRecordManager, type QualityRecordColumn } from '@/components/quality-records/quality-record-manager';
import { sorFields } from '@/lib/quality-records/form-config';
import { suggestNextRecordNumber } from '@/lib/quality-records/model';
import { toQualityRecordRow, todayIso } from '@/lib/quality-records/presentation';
import { listV2Records } from '@/lib/services/quality-records';
import { getProjectContext } from '@/lib/project-context';
import { ProjectRequired } from '@/components/shared/project-required';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const columns: QualityRecordColumn[] = [
  { key: 'sor_number', label: 'Record no', style: 'mono' }, { key: 'document_code', label: 'Document code', style: 'mono' }, { key: 'title', label: 'Observation', style: 'primary' },
  { key: 'revision', label: 'Rev', style: 'muted' }, { key: 'discipline', label: 'Discipline', style: 'muted' }, { key: 'location', label: 'Location', style: 'muted' },
  { key: 'record_date', label: 'Record date', style: 'date' }, { key: 'issued_by', label: 'Issued by', style: 'muted' }, { key: 'status', label: 'Status', style: 'status' },
];
export default async function SorPage() { const client = await createClient(); const context = await getProjectContext(); if (!context.activeProject) return <ProjectRequired message={context.error ?? undefined} />; const active = context.activeProject; const [records, projects] = await Promise.all([listV2Records(client, 'sor_records', active.id), Promise.resolve({ data: [active], error: context.error })]);
  return <QualityRecordManager key={active.id} module="SOR" title="Site Observation Reports" description="Record field observations, contractor responses, corrective actions, verification and closeout without conflating them with NCRs." noun="site observation report" route="/sor" rows={records.data.map((row) => toQualityRecordRow(row))} columns={columns} fields={sorFields(projects.data)} createAction={createSorAction} updateAction={updateSorAction} deleteAction={deleteSorAction} loadError={records.error ?? projects.error} createDefaults={{ project_id: active.id, project_code: active.project_code === 'IL05' ? 'IL051' : active.project_code, sor_number: suggestNextRecordNumber('SOR', records.data.map((row) => row.sor_number)), record_date: todayIso(), revision: 'R00', originator_code: 'SRB', status: 'Open', level_code: 'XX', volume_code: 'XX', classification_code: 'XXXX' }} />; }
