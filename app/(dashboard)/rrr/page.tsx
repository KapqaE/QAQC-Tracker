import { createRrrAction, deleteRrrAction, updateRrrAction } from '@/app/actions/quality-records';
import { QualityRecordManager, type QualityRecordColumn } from '@/components/quality-records/quality-record-manager';
import { rrrFields } from '@/lib/quality-records/form-config';
import { suggestNextRrrNumber } from '@/lib/quality-records/model';
import { toQualityRecordRow, todayIso } from '@/lib/quality-records/presentation';
import { listV2Records } from '@/lib/services/quality-records';
import { listProjects } from '@/lib/services/projects';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const columns: QualityRecordColumn[] = [
  { key: 'record_number', label: 'Record no', style: 'mono' }, { key: 'document_code', label: 'Fixed CDE code', style: 'mono' }, { key: 'title', label: 'Room readiness request', style: 'primary' },
  { key: 'submission_revision', label: 'Submission rev', style: 'muted' }, { key: 'readiness_stage', label: 'Stage', style: 'muted' }, { key: 'room', label: 'Room', style: 'muted' },
  { key: 'record_date', label: 'Record date', style: 'date' }, { key: 'requested_by', label: 'Requested by', style: 'muted' }, { key: 'status', label: 'Status', style: 'status' },
];
export default async function RrrPage() { const client = await createClient(); const [records, projects] = await Promise.all([listV2Records(client, 'rrr_records'), listProjects(client)]);
  return <QualityRecordManager module="RRR" title="Room Readiness Requests" description="Manage Stage 1 and Stage 2 readiness, the RR-4 safety gate, blockers, evidence, attendance and separate Engineer, CxA and Employer decisions." noun="room readiness request" route="/rrr" rows={records.data.map((row) => toQualityRecordRow(row))} columns={columns} fields={rrrFields(projects.data)} createAction={createRrrAction} updateAction={updateRrrAction} deleteAction={deleteRrrAction} loadError={records.error ?? projects.error} createDefaults={{ record_number: suggestNextRrrNumber(records.data.map((row) => row.record_number)), record_date: todayIso(), request_date: todayIso(), submission_revision: 'R0.0', readiness_stage: 'Stage 1', room_route: 'Standard Room', status: 'Draft', level_code: 'XX', volume_code: 'XX' }} />; }
