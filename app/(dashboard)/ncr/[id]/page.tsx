import { RecordLinks } from '@/components/quality-records/record-links';
import { notFound } from 'next/navigation';

import { addQualityAction } from '@/app/actions/quality-records';
import { ActionTracker } from '@/components/quality-records/action-tracker';
import { QualityRecordDetail } from '@/components/quality-records/quality-record-detail';
import { listQualityActions } from '@/lib/services/quality-records';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export default async function NcrDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const client = await createClient(); const [recordResult, actions] = await Promise.all([client.from('ncrs').select('*').eq('id', id).maybeSingle(), listQualityActions(client, 'NCR', id)]); if (recordResult.error) throw new Error('The NCR record could not be loaded.'); if (!recordResult.data) notFound(); const r = recordResult.data;
  return <QualityRecordDetail module="NCR" route="/ncr" recordNumber={r.ncr_number} documentCode={r.document_code} title={r.title} status={r.status} revision={r.revision} recordDate={r.record_date ?? r.date_raised} discipline={r.discipline} location={r.location ?? r.area} sections={[
    { title: 'Non-conformance', fields: [{ label: 'Description', value: r.description, wide: true }, { label: 'Activity', value: r.activity }, { label: 'Severity', value: r.severity }, { label: 'Issued by', value: r.issued_by }, { label: 'Issue date', value: r.issue_date ?? r.date_raised }] },
    { title: 'Accountability', fields: [{ label: 'Responsible company', value: r.responsible_company }, { label: 'Assigned person', value: r.assigned_person }, { label: 'Due date', value: r.due_date }, { label: 'Workflow status', value: r.workflow_status }] },
    { title: 'Contractor response', fields: [{ label: 'Root cause', value: r.root_cause, wide: true }, { label: 'Corrective action', value: r.corrective_action, wide: true }, { label: 'Preventive action', value: r.preventive_action, wide: true }, { label: 'Estimated completion', value: r.estimated_completion_date }, { label: 'Delay reason', value: r.delayed_completion_reason }] },
    { title: 'Review', fields: [{ label: 'Reviewer', value: r.reviewer }, { label: 'Review date', value: r.review_date }, { label: 'Action code', value: r.action_code }, { label: 'Reviewer comments', value: r.reviewer_comments, wide: true }] },
    { title: 'Verification', fields: [{ label: 'Verified by', value: r.verified_by }, { label: 'Verification date', value: r.verification_date }, { label: 'Corrective action completed', value: r.corrective_action_completed }, { label: 'Preventive action in place', value: r.preventive_action_in_place }, { label: 'Verification comments', value: r.verification_comments, wide: true }] },
    { title: 'Engineer / Employer assessment', fields: [{ label: 'Decision', value: r.assessment_decision }, { label: 'Action code', value: r.engineer_action_code }, { label: 'Name', value: r.assessment_name }, { label: 'Date', value: r.assessment_date }, { label: 'Source of decision', value: r.decision_source }, { label: 'Comments', value: r.assessment_comments, wide: true }] },
    { title: 'Closeout and Procore', fields: [{ label: 'Final status', value: r.final_status ?? r.status }, { label: 'Closed by', value: r.closed_by }, { label: 'Closed date', value: r.closed_date }, { label: 'Procore reference', value: r.procore_reference }, { label: 'Current workflow step', value: r.current_workflow_step }, { label: 'Filename metadata only', value: r.source_filename, wide: true }] },
  ]}>{actions.error ? <p role="alert" className="text-sm text-red-700">{actions.error}</p> : null}<ActionTracker rows={actions.data} projectId={r.project_id} parentType="NCR" parentId={r.id} addAction={addQualityAction} /><RecordLinks type="NCR" id={id} /></QualityRecordDetail>; }
