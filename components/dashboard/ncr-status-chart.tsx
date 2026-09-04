'use client';

import { Pie, PieChart } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { Ncr } from '@/types/qaqc';

const colors = ['var(--color-chart-3)', 'var(--color-chart-2)', 'var(--color-chart-4)', 'var(--color-chart-1)', 'var(--color-chart-5)'];
const config = {
  value: { label: 'NCRs' },
  Open: { label: 'Open', color: 'var(--color-chart-3)' },
  'Under Review': { label: 'Under review', color: 'var(--color-chart-2)' },
  'Corrective Action': { label: 'Corrective action', color: 'var(--color-chart-4)' },
  'Ready for Inspection': { label: 'Ready for inspection', color: 'var(--color-chart-1)' },
  Closed: { label: 'Closed', color: 'var(--color-chart-5)' },
} satisfies ChartConfig;

export function NcrStatusChart({ ncrs }: { ncrs: Ncr[] }) {
  const order: Ncr['status'][] = ['Open', 'Under Review', 'Corrective Action', 'Ready for Inspection', 'Closed'];
  const data = order.map((status, index) => ({ status, value: ncrs.filter((ncr) => ncr.status === status).length, fill: colors[index] }));
  const openCount = ncrs.filter((ncr) => ncr.status !== 'Closed').length;

  return (
    <Card>
      <CardHeader className="border-b border-border/80 pb-4"><CardTitle>NCR status</CardTitle><p className="mt-1 text-xs text-muted-foreground">Current non-conformance position</p></CardHeader>
      <CardContent className="grid gap-2 pt-1 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center">
        <div className="relative mx-auto w-full max-w-[190px]">
          <ChartContainer config={config} className="aspect-square h-[178px] w-full">
            <PieChart><ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} /><Pie data={data} dataKey="value" nameKey="status" innerRadius={54} outerRadius={78} strokeWidth={0} /></PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><div className="text-2xl font-semibold tabular-nums">{openCount}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Active</div></div></div>
        </div>
        <div className="space-y-2.5">
          {data.map((item) => <div key={item.status} className="flex items-center gap-2 text-xs"><span className="size-2 rounded-sm" style={{ backgroundColor: item.fill }} /><span className="flex-1 text-muted-foreground">{item.status}</span><span className="font-mono font-medium">{item.value}</span></div>)}
          <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs"><span className="text-muted-foreground">Overdue closeouts</span><span className="font-semibold text-red-600">2</span></div>
        </div>
      </CardContent>
    </Card>
  );
}
