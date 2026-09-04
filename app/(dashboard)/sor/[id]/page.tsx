import { notFound } from 'next/navigation';

import { addQualityAction } from '@/app/actions/quality-records';
import { ActionTracker } from '@/components/quality-records/action-tracker';
import { QualityRecordDetail } from '@/components/quality-records/quality-record-detail';
import { getV2Record, listQualityActions } from '@/lib/services/quality-records';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export default async function SorDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const client = await createClient(); const [record, actions] = await Promise.all([getV2Record(client, 'sor_records', id), listQualityActions(client, 'SOR', id)]); if (!record.data) notFound(); const r = record.data;
  return <QualityRecordDetail module="SOR" route="/sor" recordNumber={r.sor_number} documentCode={r.document_code} title={r.title} status={r.status} revision={r.revision} recordDate={r.record_date} discipline={r.discipline} location={r.location} sections={[
    { title: 'Site observation', fields: [{ label: 'Description', value: r.description, wide: true }, { label: 'Activity', value: r.activity }, { label: 'Severity', value: r.severity }, { label: 'Issued by', value: r.issued_by }, { label: 'Issue date', value: r.issue_date }] },
    { title: 'Contractor response', fields: [{ label: 'Contractor proposal', value: r.contractor_proposal, wide: true }, { label: 'Root cause', value: r.root_cause, wide: true }, { label: 'Corrective action', value: r.corrective_action, wide: true }, { label: 'Preventive action', value: r.preventive_action, wide: true }, { label: 'Estimated completion', value: r.estimated_completion_date }, { label: 'Delay reason', value: r.delayed_completion_reason }] },
    { title: 'Review', fields: [{ label: 'Reviewer decision', value: r.reviewer_decision }, { label: 'Action code', value: r.action_code }, { label: 'Reviewer comments', value: r.reviewer_comments, wide: true }] },
    { title: 'Verification and closeout', fields: [{ label: 'Verified by', value: r.verified_by }, { label: 'Verification date', value: r.verification_date }, { label: 'Assessment decision', value: r.assessment_decision }, { label: 'Closed by / date', value: `${r.closed_by ?? 'Not provided'} / ${r.closed_date ?? 'Not provided'}` }, { label: 'Verification comments', value: r.verification_comments, wide: true }, { label: 'Assessment comments', value: r.assessment_comments, wide: true }] },
    { title: 'Procore metadata', fields: [{ label: 'Procore reference', value: r.procore_reference }, { label: 'Workflow status', value: r.workflow_status }, { label: 'Current step', value: r.current_workflow_step }, { label: 'Current assignees', value: r.current_step_assignees }, { label: 'Filename metadata only', value: r.source_filename, wide: true }] },
  ]}><ActionTracker rows={actions.data} projectId={r.project_id} parentType="SOR" parentId={r.id} addAction={addQualityAction} /></QualityRecordDetail>; }
