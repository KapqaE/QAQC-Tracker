import { createSorAction, deleteSorAction, updateSorAction } from '@/app/actions/quality-records';
import { QualityRecordManager, type QualityRecordColumn } from '@/components/quality-records/quality-record-manager';
import { sorFields } from '@/lib/quality-records/form-config';
import { suggestNextRecordNumber } from '@/lib/quality-records/model';
import { toQualityRecordRow, todayIso } from '@/lib/quality-records/presentation';
import { listV2Records } from '@/lib/services/quality-records';
import { listProjects } from '@/lib/services/projects';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const columns: QualityRecordColumn[] = [
  { key: 'sor_number', label: 'Record no', style: 'mono' }, { key: 'document_code', label: 'Document code', style: 'mono' }, { key: 'title', label: 'Observation', style: 'primary' },
  { key: 'revision', label: 'Rev', style: 'muted' }, { key: 'discipline', label: 'Discipline', style: 'muted' }, { key: 'location', label: 'Location', style: 'muted' },
  { key: 'record_date', label: 'Record date', style: 'date' }, { key: 'issued_by', label: 'Issued by', style: 'muted' }, { key: 'status', label: 'Status', style: 'status' },
];
export default async function SorPage() { const client = await createClient(); const [records, projects] = await Promise.all([listV2Records(client, 'sor_records'), listProjects(client)]);
  return <QualityRecordManager module="SOR" title="Site Observation Reports" description="Record field observations, contractor responses, corrective actions, verification and closeout without conflating them with NCRs." noun="site observation report" route="/sor" rows={records.data.map((row) => toQualityRecordRow(row))} columns={columns} fields={sorFields(projects.data)} createAction={createSorAction} updateAction={updateSorAction} deleteAction={deleteSorAction} loadError={records.error ?? projects.error} createDefaults={{ sor_number: suggestNextRecordNumber('SOR', records.data.map((row) => row.sor_number)), record_date: todayIso(), revision: 'R00', originator_code: 'SRB', status: 'Open', level_code: 'XX', volume_code: 'XX', classification_code: 'XXXX' }} />; }
