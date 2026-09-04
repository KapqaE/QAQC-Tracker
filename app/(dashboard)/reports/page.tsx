import { CheckCircle2, ClipboardCheck, FileWarning, ListChecks } from 'lucide-react';

import { MetricCard } from '@/components/dashboard/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardData } from '@/lib/services/dashboard';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const client = await createClient();
  const { metrics } = await getDashboardData(client);
  return <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Portfolio insight</p><h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-[30px]">Quality reports</h1><p className="mt-1.5 text-sm text-muted-foreground">A live management summary derived from the authenticated project records.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Inspection pass position" value={metrics.passedInspections} detail={`of ${metrics.totalInspections} inspections`} tone="success" icon={ClipboardCheck} /><MetricCard label="Active NCR exposure" value={metrics.openNcrs} detail={`${metrics.overdueNcrs} overdue`} tone="danger" icon={FileWarning} /><MetricCard label="Punch exposure" value={metrics.openPunchItems} detail={`${metrics.overduePunchItems} overdue`} tone="warning" icon={ListChecks} /><MetricCard label="Closeout completion" value={`${metrics.completionPercentage}%`} detail="NCR + punch formula" tone="primary" icon={CheckCircle2} progress={metrics.completionPercentage} /></div><Card><CardHeader><CardTitle>Completion formula</CardTitle></CardHeader><CardContent className="text-sm leading-7 text-muted-foreground"><p>Quality completion is calculated as closed NCRs plus closed punch items, divided by the total number of NCRs and punch items. When no quality items exist, completion is reported as 0% to avoid division by zero.</p></CardContent></Card></div>;
}
