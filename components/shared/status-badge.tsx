import { Badge } from '@/components/ui/badge';

const statusStyles: Record<string, string> = {
  Planned: 'border-slate-200 bg-slate-50 text-slate-600',
  Requested: 'border-blue-200 bg-blue-50 text-blue-700',
  'In Progress': 'border-amber-200 bg-amber-50 text-amber-700',
  Passed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Failed: 'border-red-200 bg-red-50 text-red-700',
  Closed: 'border-slate-200 bg-slate-100 text-slate-700',
  Open: 'border-red-200 bg-red-50 text-red-700',
  'Under Review': 'border-violet-200 bg-violet-50 text-violet-700',
  'Corrective Action': 'border-orange-200 bg-orange-50 text-orange-700',
  'Ready for Inspection': 'border-teal-200 bg-teal-50 text-teal-700',
  Planning: 'border-slate-200 bg-slate-50 text-slate-700',
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'On Hold': 'border-amber-200 bg-amber-50 text-amber-700',
  Completed: 'border-teal-200 bg-teal-50 text-teal-700',
  Draft: 'border-slate-200 bg-slate-50 text-slate-700',
  Submitted: 'border-blue-200 bg-blue-50 text-blue-700',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Approved with Comments': 'border-teal-200 bg-teal-50 text-teal-700',
  Rejected: 'border-red-200 bg-red-50 text-red-700',
  Superseded: 'border-slate-200 bg-slate-100 text-slate-600',
  'Ready for Verification': 'border-teal-200 bg-teal-50 text-teal-700',
  'In Review': 'border-violet-200 bg-violet-50 text-violet-700',
  'A - Proceed': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'B - Proceed, Comments': 'border-amber-200 bg-amber-50 text-amber-700',
  'C - Rejected': 'border-red-200 bg-red-50 text-red-700',
  Verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Disputed: 'border-orange-200 bg-orange-50 text-orange-700',
  'Not Verified': 'border-red-200 bg-red-50 text-red-700',
  'CxA Accepted': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Accepted with Conditions': 'border-amber-200 bg-amber-50 text-amber-700',
  'Released for Commissioning': 'border-teal-200 bg-teal-50 text-teal-700',
  'Released for Energization': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Not Released': 'border-red-200 bg-red-50 text-red-700',
  Resubmitted: 'border-blue-200 bg-blue-50 text-blue-700',
  A: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  B: 'border-amber-200 bg-amber-50 text-amber-700',
  C: 'border-red-200 bg-red-50 text-red-700',
  '---': 'border-violet-200 bg-violet-50 text-violet-700',
  'N/A': 'border-slate-200 bg-slate-50 text-slate-600',
};

const statusLabels: Record<string, string> = {
  A: 'A · Proceed',
  B: 'B · Proceed, Comments',
  C: 'C · Rejected',
  '---': 'In Review',
  'N/A': 'Not Applicable',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={statusStyles[status] ?? 'bg-muted text-muted-foreground'}><span className="size-1.5 rounded-full bg-current opacity-70" />{statusLabels[status] ?? status}</Badge>;
}
