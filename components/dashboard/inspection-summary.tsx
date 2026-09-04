import { ArrowUpRight, CheckCircle2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Inspection } from '@/types/qaqc';

export function InspectionSummary({ inspections }: { inspections: Inspection[] }) {
  const latestPassed = inspections.find((inspection) => inspection.status === 'Passed');
  const total = inspections.length;
  const groups = [
    { label: 'Passed / Closed', value: inspections.filter((item) => ['Passed', 'Closed'].includes(item.status)).length, color: 'bg-emerald-500' },
    { label: 'In progress', value: inspections.filter((item) => item.status === 'In Progress').length, color: 'bg-amber-500' },
    { label: 'Requested / Planned', value: inspections.filter((item) => ['Requested', 'Planned'].includes(item.status)).length, color: 'bg-blue-500' },
    { label: 'Failed', value: inspections.filter((item) => item.status === 'Failed').length, color: 'bg-red-500' },
  ];
  const statusSummary = groups.map((item) => ({ ...item, percentage: total ? Math.round((item.value / total) * 100) : 0 }));
  const passRate = total ? Math.round((statusSummary[0].value / total) * 1000) / 10 : 0;

  return (
    <Card>
      <CardHeader className="border-b border-border/80 pb-4 sm:flex sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle>Inspection status</CardTitle><p className="mt-1 text-xs text-muted-foreground">{total} inspections across all disciplines</p></div>
        <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 sm:mt-0"><ArrowUpRight className="size-3" /> Live from Supabase</span>
      </CardHeader>
      <CardContent className="grid gap-6 pt-1 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
        <div className="space-y-4">
          {statusSummary.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-medium text-foreground/80">{item.label}</span><span className="font-mono text-muted-foreground">{item.value} · {item.percentage}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percentage}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border bg-muted/35 p-4">
          <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-4" /></span><div><div className="text-[11px] text-muted-foreground">Pass rate</div><div className="text-xl font-semibold tabular-nums">{passRate}%</div></div></div>
          <div className="mt-4 border-t pt-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Latest approval</p><p className="mt-1.5 text-xs font-medium">{latestPassed?.inspection_number ?? 'No approvals yet'}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{latestPassed?.area ?? 'Passed inspections appear here'}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}
