import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

const tones = {
  neutral: 'bg-slate-100 text-slate-600',
  danger: 'bg-red-50 text-red-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  primary: 'bg-teal-50 text-teal-700',
};

export function MetricCard({ label, value, detail, tone, icon: Icon, progress }: { label: string; value: number | string; detail: string; tone: keyof typeof tones; icon: LucideIcon; progress?: number }) {
  return (
    <Card className="gap-0 py-0 shadow-[0_1px_2px_rgb(15_23_42/3%)]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3"><span className="text-xs font-medium text-muted-foreground">{label}</span><span className={`grid size-8 place-items-center rounded-lg ${tones[tone]}`}><Icon className="size-4" /></span></div>
        <div className="mt-3 text-[26px] font-semibold tracking-tight tabular-nums">{value}</div>
        {progress !== undefined ? <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div> : null}
        <p className="mt-2 text-[11px] text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
