import { createNcrV2Action, deleteNcrV2Action, updateNcrV2Action } from '@/app/actions/quality-records';
import { QualityRecordManager, type QualityRecordColumn } from '@/components/quality-records/quality-record-manager';
import { ncrFields } from '@/lib/quality-records/form-config';
import { suggestNextRecordNumber } from '@/lib/quality-records/model';
import { toQualityRecordRow, todayIso } from '@/lib/quality-records/presentation';
import { listNcrs } from '@/lib/services/ncrs';
import { getProjectContext } from '@/lib/project-context';
import { ProjectRequired } from '@/components/shared/project-required';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const columns: QualityRecordColumn[] = [
  { key: 'ncr_number', label: 'Record no', style: 'mono' }, { key: 'document_code', label: 'Document code', style: 'mono' }, { key: 'title', label: 'Non-conformance', style: 'primary' },
  { key: 'revision', label: 'Rev', style: 'muted' }, { key: 'discipline', label: 'Discipline', style: 'muted' }, { key: 'location', label: 'Location', style: 'muted' },
  { key: 'record_date', label: 'Record date', style: 'date' }, { key: 'assigned_person', label: 'Responsible', style: 'muted' }, { key: 'status', label: 'Status', style: 'status' },
];
export default async function NcrPage() { const client = await createClient(); const context = await getProjectContext(); if (!context.activeProject) return <ProjectRequired message={context.error ?? undefined} />; const active = context.activeProject; const [records, projects] = await Promise.all([listNcrs(client, active.id), Promise.resolve({ data: [active], error: context.error })]);
  return <QualityRecordManager key={active.id} module="NCR" title="Non-Conformance Reports" description="Control confirmed departures, root cause, corrective and preventive action, independent verification and formal closeout." noun="non-conformance report" route="/ncr" rows={records.data.map((row) => toQualityRecordRow(row))} columns={columns} fields={ncrFields(projects.data)} createAction={createNcrV2Action} updateAction={updateNcrV2Action} deleteAction={deleteNcrV2Action} loadError={records.error ?? projects.error} createDefaults={{ project_id: active.id, project_code: active.project_code === 'IL05' ? 'IL051' : active.project_code, ncr_number: suggestNextRecordNumber('NCR', records.data.map((row) => row.ncr_number)), record_date: todayIso(), issue_date: todayIso(), revision: 'R00', originator_code: 'SRB', status: 'Open', level_code: 'XX', volume_code: 'XX', classification_code: 'XXXX' }} />; }
