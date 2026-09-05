import { CheckCircle2, ClipboardCheck, FileWarning, ListChecks } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectRequired } from '@/components/shared/project-required';
import { getProjectContext } from '@/lib/project-context';
import { getQualityDashboard } from '@/lib/services/quality-dashboard';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const { activeProject, error } = await getProjectContext();
  if (!activeProject) return <ProjectRequired message={error ?? undefined} />;
  const client = await createClient();
  const result = await getQualityDashboard(client, activeProject.id);
  const { metrics } = result;
  return <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
    <div><p className="text-xs font-semibold text-primary">{activeProject.project_code} · {activeProject.name}</p><h1 className="mt-2 text-2xl font-semibold">Quality reports</h1><p className="mt-2 text-sm text-muted-foreground">Live structured records for the active project.</p></div>
    {result.error ? <p role="alert" className="text-sm text-red-700">{result.error}</p> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Quality records" value={metrics.total} detail={`${metrics.wir} WIR · ${metrics.mir} MIR · ${metrics.ncr} NCR · ${metrics.sor} SOR · ${metrics.rrr} RRR`} tone="primary" icon={ClipboardCheck} />
      <MetricCard label="Approved / Proceed" value={metrics.approved} detail={`${metrics.inReview} in review · ${metrics.rejected} rejected`} tone="success" icon={CheckCircle2} />
      <MetricCard label="Open actions" value={metrics.openActions} detail={`${metrics.overdueActions} overdue`} tone="danger" icon={FileWarning} />
      <MetricCard label="Rooms ready" value={metrics.roomsReady} detail={`${metrics.roomsNotReady} not ready · ${metrics.rr4Incomplete} RR-4 incomplete`} tone="warning" icon={ListChecks} />
    </div>
    <Card><CardHeader><CardTitle>Calculation notes</CardTitle></CardHeader><CardContent className="space-y-2 text-sm leading-7 text-muted-foreground"><p>Counts use Supabase records from the active project. Actions stay open until Verified or Closed; overdue means the due date is before today (UTC).</p><p>Room readiness requires completed RR-4 controls, no open P1/P2 items, completed declarations, separate Engineer and CxA decisions, and matching Employer release. Energization also requires signed L2B tags. Readiness is not handover or operational acceptance.</p><p>Unavailable data is reported as an error. No completion percentage is inferred across unrelated workflows.</p></CardContent></Card>
  </div>;
}
